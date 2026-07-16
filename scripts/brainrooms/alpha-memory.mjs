// alpha-memory.mjs - Edgeweaver Alpha's memory access (B5): every call runs as the
// ew_alpha_runtime role via EW_ALPHA_DB_URL (avatars/alpha/.env.local), so the database
// walls ARE the enforcement (FAMILY §4): own room + corpus view, nothing else reachable.
// Recall v1 is recency + text match over the room (the copied rows carry embeddings;
// semantic re-rank is a named fast-follow needing a query-embedding path). Provenance
// classes per conventions/memory-conventions.md: dream (fiction) is excluded from factual
// recall; interpretation rows are always labeled. Lessons: INSERT of safe columns only -
// the role structurally cannot set can_use_as_instruction (column grants, room DDL).
//
//   node scripts/brainrooms/alpha-memory.mjs recall "<query>"
//   node scripts/brainrooms/alpha-memory.mjs last
//   node scripts/brainrooms/alpha-memory.mjs write-episode "<content>" <importance 1-10>
//   node scripts/brainrooms/alpha-memory.mjs write-lesson "<one-line summary>" "<content>"
//   node scripts/brainrooms/alpha-memory.mjs lessons
//   node scripts/brainrooms/alpha-memory.mjs corpus "<query>"     (library, study only)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { query } from "../brains/db.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const CLASS = {
  edgeweaver_episode: "experienced",
  feeling_reading: "interpretation", gremlin_report: "interpretation", box_snapshot: "interpretation",
  diary: "interpretation", self_belief: "interpretation", autobiography_draft: "interpretation",
  dream: "fiction", initiation: "experienced",
  distinction: "experienced", edge: "experienced", experiment: "experienced",
};
export const esc = (s) => String(s).replace(/'/g, "''");

function roleUrl() {
  const env = Object.fromEntries(
    readFileSync(join(ROOT, "avatars", "alpha", ".env.local"), "utf8")
      .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
  );
  if (!env.EW_ALPHA_DB_URL) throw new Error("EW_ALPHA_DB_URL missing from avatars/alpha/.env.local (B2 not applied?)");
  return env.EW_ALPHA_DB_URL;
}

const row = (r) => {
  const [st, created, era, content] = r;
  const cls = CLASS[st] || "experienced";
  return `[${(created || "").slice(0, 16)} | ${cls}${era === "pre_birth" ? " | era: pre_birth" : ""}] ${content}`;
};

// psql -A -t output is parsed by lines and pipes, so content must carry neither: newlines
// become " / " and pipes become "/" in the projected snippet (the stored row is untouched).
const SNIPPET = (n) => `left(replace(regexp_replace(content, E'[\\n\\r]+', ' / ', 'g'), '|', '/'), ${n})`;

export function recallSql(q) {
  const factual = Object.keys(CLASS).filter((t) => CLASS[t] !== "fiction").map((t) => `'${t}'`).join(", ");
  return `SELECT source_type, created_at, metadata->>'era', ${SNIPPET(400)}
FROM ew_alpha.thoughts
WHERE source_type IN (${factual})${q ? ` AND content ILIKE '%${esc(q)}%'` : ""}
ORDER BY created_at DESC LIMIT 8`;
}

function main() {
  const [cmd, a, b] = process.argv.slice(2);
  const db = roleUrl();
  if (cmd === "recall" || cmd === "last") {
    const rows = query(db, recallSql(cmd === "recall" ? a : ""));
    if (!rows.length && cmd === "recall" && a) {
      console.log("no match for the query; most recent memories instead:");
      for (const r of query(db, recallSql(""))) console.log(row(r));
    } else if (!rows.length) console.log("the record is empty");
    else for (const r of rows) console.log(row(r));
  } else if (cmd === "write-episode") {
    if (!a) { console.log("usage: write-episode \"<content>\" <importance>"); process.exit(2); }
    const imp = Math.min(10, Math.max(1, Number(b) || 3));
    query(db, `INSERT INTO ew_alpha.thoughts (content, source_type, importance, metadata)
VALUES ('${esc(a)}', 'edgeweaver_episode', ${imp}, '{"era": "alive", "audience": "seats", "generation": 0}'::jsonb)`);
    console.log("episode written (era alive, audience seats, generation 0)");
  } else if (cmd === "write-initiation") {
    if (!a || !b) { console.log("usage: write-initiation \"<content>\" \"<witness1,witness2,witness3>\""); process.exit(2); }
    const witnesses = b.split(",").map((w) => `"${esc(w.trim())}"`).join(", ");
    query(db, `INSERT INTO ew_alpha.thoughts (content, source_type, importance, metadata)
VALUES ('${esc(a)}', 'initiation', 10, '{"era": "alive", "audience": "seats", "generation": 0, "witnessed_by": [${witnesses}]}'::jsonb)`);
    console.log("initiation row written (importance 10, witnesses recorded)");
  } else if (cmd === "write-lesson") {
    if (!a || !b) { console.log("usage: write-lesson \"<summary>\" \"<content>\""); process.exit(2); }
    query(db, `INSERT INTO ew_alpha.agent_memories (memory_type, summary, content, confidence, created_by)
VALUES ('lesson', '${esc(a)}', '${esc(b)}', 0.6, 'edgeweaver-alpha')`);
    console.log("candidate lesson written (PENDING; a seat's confirmation is the only path to instruction-grade)");
  } else if (cmd === "lessons") {
    const act = query(db, "SELECT summary, content FROM ew_alpha.agent_memories WHERE can_use_as_instruction = true AND lifecycle_status = 'active' ORDER BY created_at");
    const pend = query(db, "SELECT count(*) FROM ew_alpha.agent_memories WHERE can_use_as_instruction = false AND lifecycle_status = 'active'")[0][0];
    if (!act.length) console.log("no instruction-grade lessons yet");
    else for (const r of act) console.log(`RULE: ${r[0]} :: ${r[1]}`);
    console.log(`(pending, not rules: ${pend})`);
  } else if (cmd === "corpus") {
    for (const r of query(db, `SELECT source_type, created_at, ${SNIPPET(300)} FROM ew_alpha.pm_corpus WHERE content ILIKE '%${esc(a || "")}%' ORDER BY created_at DESC LIMIT 6`))
      console.log(`[library | ${r[0]}] ${r[2]}`);
  } else {
    console.log("usage: recall|last|write-episode|write-lesson|lessons|corpus");
    process.exit(2);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
