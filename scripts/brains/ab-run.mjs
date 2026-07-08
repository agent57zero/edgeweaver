// ab-run.mjs - L4 A/B runner for the brain fleet (D15 / BRAINS.md section 4). Runs ONE fixed
// question set across a list of candidate (brain profile, Claude model) configs and writes an
// attributable JSONL transcript per candidate, so a difference in behavior is traceable to a
// named (brain, mind, code) tuple. Per candidate, sequentially: resolve the profile in test
// mode (guard 1 refuses the live brain), recall context from the scratch schema, drive the
// mind server one turn per question, write the resulting episode back into the scratch schema,
// and log every turn.
//
// Usage:
//   node scripts/brains/ab-run.mjs --candidates '<json>' [--questions <path>] [--run-id <id>] [--dry-run]
// where <json> is an array of { "profile": "<registry name>", "model": "<claude model id>" }.
//
// Sharp edges (read before trusting a run):
//   - Recall here is EMBEDDING-FREE full-text search (Postgres to_tsvector/plainto_tsquery over
//     the scratch schema), NOT the vector similarity the live mind uses. A spawned scratch has
//     the rows + stored embeddings, but the embed function is not deployed to the lab until L4+
//     (BRAINS.md section 6), so a fresh query cannot be embedded here. This runner is for
//     ATTRIBUTION testing (which config produced which transcript), not recall-quality scoring.
//   - db.mjs query() splits psql -A -t output on newlines and on '|'; a hit whose content spans
//     lines or contains '|' is re-joined into the recall block as context text. That is good
//     enough for a prompt block, not a faithful row parse (single column, so re-joining on '|'
//     restores any literal pipe in the content).
//   - Guard 1 (test-mode process refuses the live profile) is DELIBERATELY not caught: a
//     candidate that resolves the live brain must abort the whole run loudly, never write to it.
//   - --dry-run touches NOTHING live: it reads brains/registry.json (loadRegistry) for the
//     per-candidate schema and validates inputs, then prints the plan. No resolveProfile (so no
//     .env.local credential read), no db.mjs import, no model call, no file writes.
//   - Writeback inserts only (content, source_type, metadata) into <schema>.thoughts; id,
//     created_at and the rest carry their DDL defaults (id DEFAULT gen_random_uuid(); the
//     partial unique index on content_fingerprint excludes the NULL we leave, so no conflict).
//   - Windows-safe: every path via node:path join; the transcript dir (logs/, gitignored) is
//     created on demand.
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { loadRegistry, resolveProfile, stampGeneration } from "./profiles.mjs";
import { mindServer } from "../../voice/mind-server.mjs";
import { makeBackend } from "../../voice/claude-backend.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const has = (n) => args.includes("--" + n);

const USAGE = "usage: ab-run.mjs --candidates '<json [{profile,model}]>' [--questions <path>] [--run-id <id>] [--dry-run]";
const die = (msg, code) => { console.error(msg); process.exit(code); };

// yyyymmdd-hhmmss in UTC (matches the ISO ts written into the records; deterministic, no host tz).
function stamp(d = new Date()) {
  const iso = d.toISOString();
  return iso.slice(0, 10).replace(/-/g, "") + "-" + iso.slice(11, 19).replace(/:/g, "");
}

// SQL string literal (standard_conforming_strings is on in the brain: only ' needs doubling).
// NUL is rejected: Postgres text cannot hold it and it would silently truncate the statement.
function sqlLiteral(s) {
  const str = String(s);
  if (str.includes("\0")) throw new Error("NUL byte in SQL literal (rejected)");
  return "'" + str.replace(/'/g, "''") + "'";
}
// Dollar-quote for free-form content (the episode text): pick a tag not present in the body.
function dollarQuote(s) {
  const str = String(s);
  if (str.includes("\0")) throw new Error("NUL byte in content (rejected)");
  let n = 0, tag;
  do { tag = "$ew" + (n === 0 ? "" : n) + "$"; n++; } while (str.includes(tag));
  return tag + str + tag;
}
const qIdent = (id) => '"' + String(id).replace(/"/g, '""') + '"';

// --- validate --candidates (usage errors exit 2) ---
const candidatesRaw = flag("candidates");
if (!candidatesRaw) die(USAGE, 2);
let candidates;
try { candidates = JSON.parse(candidatesRaw); }
catch (e) { die("usage: --candidates is not valid JSON: " + e.message, 2); }
if (!Array.isArray(candidates) || candidates.length === 0) die("usage: --candidates must be a non-empty JSON array", 2);
for (const [i, c] of candidates.entries()) {
  if (!c || typeof c !== "object" || typeof c.profile !== "string" || !c.profile || typeof c.model !== "string" || !c.model) {
    die(`usage: --candidates[${i}] must be { "profile": "<registry name>", "model": "<claude model id>" }`, 2);
  }
}

// --- validate the questions file (usage errors exit 2) ---
const qPath = flag("questions") || join(import.meta.dirname, "fixtures", "ab-questions.json");
let questions;
try { questions = JSON.parse(readFileSync(qPath, "utf8")); }
catch (e) { die("usage: could not read/parse questions file " + qPath + ": " + e.message, 2); }
if (!Array.isArray(questions) || questions.length === 0) die("usage: questions file must be a non-empty JSON array", 2);
for (const [i, q] of questions.entries()) {
  if (!q || typeof q.id !== "string" || !q.id || typeof q.text !== "string" || !q.text) {
    die(`usage: questions[${i}] must be { "id": "...", "text": "..." }`, 2);
  }
}

const runId = flag("run-id") || ("ab-" + stamp());
const dryRun = has("dry-run");

// --- dry-run: registry read only, no connections, no credentials, no model, no writes ---
if (dryRun) {
  const reg = await loadRegistry(ROOT);
  const planStamp = stamp();
  console.log(`DRY RUN A/B plan (run-id ${runId}):`);
  console.log(`  questions: ${questions.length} (from ${qPath})`);
  console.log(`  candidates: ${candidates.length}`);
  for (const c of candidates) {
    const row = reg.brains.find((b) => b.name === c.profile);
    const schema = row ? row.schema : "(unknown: not in registry)";
    console.log(`  ${c.profile} | ${c.model} | schema ${schema} | -> logs/ab/${planStamp}-${c.profile}.jsonl`);
  }
  console.log("  (dry-run: registry read only; no connections, no credentials, no model calls, no writes)");
  process.exit(0);
}

// --- real run: db side effects allowed from here on (dry-run never imports db.mjs) ---
const { query, runSqlText } = await import("./db.mjs");
const code = (() => {
  try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
})();

const logDir = join(ROOT, "logs", "ab");
mkdirSync(logDir, { recursive: true });

for (const c of candidates) {
  // Guard 1 lives here and is NOT caught: a candidate pointing at the live brain aborts loudly.
  const profile = await resolveProfile(c.profile, { testMode: true });
  if (!profile.dbUrl) {
    die(`FAIL: profile "${c.profile}" has no connection value (is its connEnv set in .env.local? BRAINS.md section 6 lab gate)`, 1);
  }
  const schema = profile.schema;
  const dbUrl = profile.dbUrl;

  const sessionTs = new Date();
  const fname = `${stamp(sessionTs)}-${c.profile}.jsonl`;
  const tPath = join(logDir, fname);
  const emit = (rec) => appendFileSync(tPath, JSON.stringify(rec) + "\n", "utf8");
  emit({ type: "session-start", ts: sessionTs.toISOString(), profile: c.profile, schema, generation: profile.generation, model: c.model, code, runId, questions: questions.length });

  // Recall: full-text search over the scratch schema; hit count surfaced via closure for the log.
  let lastRecallHits = 0;
  const recall = async (userText) => {
    const sql = `SELECT content FROM ${qIdent(schema)}.thoughts WHERE to_tsvector('simple', coalesce(content,'')) @@ plainto_tsquery('simple', ${sqlLiteral(userText)}) ORDER BY created_at DESC LIMIT 5`;
    const rows = query(dbUrl, sql);
    lastRecallHits = rows.length;
    return rows.map((r) => r.join("|")).join("\n"); // single column; re-join restores any literal '|'
  };
  // Writeback: insert the rehearsal episode into the scratch schema; stamp generation + rehearsal.
  const writeback = async (episode) => {
    const meta = stampGeneration({ ...episode.metadata, era: "rehearsal", audience: "alan", run_id: runId }, profile);
    const sql = `INSERT INTO ${qIdent(schema)}.thoughts (content, source_type, metadata)\nVALUES (${dollarQuote(episode.content)}, ${sqlLiteral(episode.source_type)}, ${sqlLiteral(JSON.stringify(meta))}::jsonb);`;
    runSqlText(dbUrl, sql, "ab-writeback");
    return { ...episode, metadata: meta };
  };

  const ms = mindServer({ backend: makeBackend("subscription", { model: c.model }), recall, writeback, generation: profile.generation });

  let turnsOk = 0, errors = 0;
  const ttfts = [];
  for (const q of questions) {
    try {
      const r = await ms.respond({ userText: q.text, runId });
      emit({ type: "turn", id: q.id, q: q.text, reply: r.text, ttftMs: r.ttftMs, durationMs: r.durationMs, recallHits: lastRecallHits });
      turnsOk++;
      if (typeof r.ttftMs === "number") ttfts.push(r.ttftMs);
    } catch (e) {
      emit({ type: "turn-error", id: q.id, error: e && e.message ? e.message : String(e) });
      errors++;
    }
  }
  emit({ type: "session-end", ts: new Date().toISOString(), turns: turnsOk, errors });

  const meanTtft = ttfts.length ? Math.round(ttfts.reduce((a, n) => a + n, 0) / ttfts.length) : null;
  const errNote = errors ? ` (${errors} error${errors > 1 ? "s" : ""})` : "";
  console.log(`[ab] ${c.profile} | ${c.model} | ${turnsOk}/${questions.length} turns ok${errNote} | mean ttft ${meanTtft == null ? "n/a" : meanTtft + "ms"} | logs/ab/${fname}`);
}
