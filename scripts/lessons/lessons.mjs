// lessons.mjs - D36 weighted lesson loading: sidecar weights + compiled wake file.
// Source of truth for lifecycle stays in agent_memories (confirmation is a human gate);
// this tool owns only the ew_lesson_weights sidecar and the compiled build artifact at
// state/compiled/<being>-lessons.md (gitignored operational memory, never identity).
// Weights move ONLY here, on the night pass, from application evidence (D36): never
// in-session, never because a lesson was merely talked about.
//
//   node scripts/lessons/lessons.mjs sync    --being genesis|alpha
//   node scripts/lessons/lessons.mjs compile --being genesis|alpha
//   node scripts/lessons/lessons.mjs night   --being genesis|alpha \
//        [--applied id,id] [--misfired id,id] [--note "<why, one line>"]
//   node scripts/lessons/lessons.mjs status  --being genesis|alpha
//
// night = sync -> decay untouched -> boost applied -> drop+flag misfired -> compile.
// Ops credential (SUPABASE_DB_URL) by design: the being's room role cannot move weights.
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { join } from "node:path";
import { query, runSqlText } from "../brains/db.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const BORN = 0.30, FLOOR = 0.05, CEIL = 0.95, DECAY = 0.98, BOOST = 0.10, DROP = 0.15;
const CHAR_BUDGET = 8000, MAX_PENDING = 30;

const BEINGS = {
  genesis: {
    label: "Edgeweaver Genesis",
    mem: "public.agent_memories", w: "public.ew_lesson_weights",
    scope: "workspace_id = 'edgeweaver'",
    out: join(ROOT, "state", "compiled", "genesis-lessons.md"),
    gate: "Alan's confirmation",
  },
  alpha: {
    label: "Edgeweaver Alpha",
    mem: "ew_alpha.agent_memories", w: "ew_alpha.ew_lesson_weights",
    scope: "true",
    out: join(ROOT, "state", "compiled", "alpha-lessons.md"),
    gate: "a seat's confirmation",
  },
};

function dbUrl() {
  const env = Object.fromEntries(
    readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)
      .map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
  );
  if (!env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL missing from .env.local");
  return env.SUPABASE_DB_URL;
}

// Single json column per row: rejoin the pipe-split to undo db.mjs parsing, then parse.
const jsonRows = (db, sql) => query(db, sql).map((r) => JSON.parse(r.join("|")));
const uuidList = (s) => {
  if (!s) return [];
  const ids = s.split(",").map((x) => x.trim()).filter(Boolean);
  for (const id of ids) if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`not a uuid: ${id}`);
  return ids;
};
const inList = (ids) => ids.map((i) => `'${i}'`).join(", ");
const esc = (s) => String(s).replace(/'/g, "''");

function sync(db, B) {
  runSqlText(db, `INSERT INTO ${B.w} (memory_id, weight, last_move_reason)
SELECT id, ${BORN}, 'born (sync)' FROM ${B.mem}
WHERE ${B.scope} AND lifecycle_status = 'active'
ON CONFLICT (memory_id) DO NOTHING;`, "lessons-sync");
}

function night(db, B, applied, misfired, note) {
  sync(db, B);
  const touched = [...applied, ...misfired];
  const notTouched = touched.length ? `AND w.memory_id NOT IN (${inList(touched)})` : "";
  const reason = note ? ` :: ${esc(note)}` : "";
  runSqlText(db, `
UPDATE ${B.w} w SET weight = GREATEST(${FLOOR}, weight * ${DECAY}),
  weight_updated_at = now(), last_move_reason = 'nightly decay'
WHERE w.memory_id IN (SELECT id FROM ${B.mem} WHERE ${B.scope} AND lifecycle_status = 'active')
  ${notTouched};
${applied.length ? `UPDATE ${B.w} SET weight = LEAST(${CEIL}, weight + ${BOOST}),
  applied_count = applied_count + 1, last_applied_at = now(), weight_updated_at = now(),
  last_move_reason = 'applied and served${reason}'
WHERE memory_id IN (${inList(applied)});` : ""}
${misfired.length ? `UPDATE ${B.w} SET weight = GREATEST(${FLOOR}, weight - ${DROP}),
  misfire_count = misfire_count + 1, flagged_for_review = true, weight_updated_at = now(),
  last_move_reason = 'misfired${reason}'
WHERE memory_id IN (${inList(misfired)});` : ""}`, "lessons-night");
  console.log(`night pass: decay applied; +${applied.length} applied, -${misfired.length} misfired`);
}

function fetchRows(db, B) {
  const confirmed = jsonRows(db, `SELECT row_to_json(t) FROM (
SELECT m.id::text, m.summary, m.content, m.last_confirmed_at::date::text AS confirmed
FROM ${B.mem} m WHERE ${B.scope} AND m.lifecycle_status = 'active' AND m.can_use_as_instruction = true
ORDER BY m.created_at) t`);
  const pending = jsonRows(db, `SELECT row_to_json(t) FROM (
SELECT m.id::text, m.summary, m.content, m.created_at::date::text AS born,
       round(w.weight::numeric, 2) AS weight, w.applied_count, w.misfire_count, w.flagged_for_review
FROM ${B.mem} m JOIN ${B.w} w ON w.memory_id = m.id
WHERE ${B.scope} AND m.lifecycle_status = 'active' AND m.can_use_as_instruction = false
  AND NOT w.excluded_from_load
ORDER BY w.weight DESC, m.created_at DESC) t`);
  return { confirmed, pending };
}

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function compile(db, B) {
  sync(db, B);
  const { confirmed, pending } = fetchRows(db, B);
  const lines = [];
  lines.push(`# ${B.label} - compiled lessons (auto-generated, D36)`);
  lines.push(`Generated ${new Date().toISOString()}. Build artifact of the brain rows; never edit by hand;`);
  lines.push(`never treat this file itself as memory provenance - cite the row ids it carries.`);
  lines.push("", `## Rules (confirmed; ${B.gate} set these)`);
  if (!confirmed.length) lines.push("(none confirmed yet)");
  for (const r of confirmed)
    lines.push(`- [rule | id ${r.id.slice(0, 8)} | confirmed ${r.confirmed || "?"}] ${clip(r.summary, 200)} :: ${clip(r.content, 500)}`);
  lines.push("", "## Provisional (your own noticings, NOT confirmed - hold as hypotheses)");
  lines.push("These are things you yourself noted; no one has confirmed them. Let them inform you,");
  lines.push("hold them loosely, and speak of them only as your own unconfirmed observations.");
  let used = 0, shown = 0;
  for (const r of pending) {
    const line = `- [w ${r.weight}${r.flagged_for_review ? " | FLAGGED after a misfire" : ""} | ${r.born} | id ${r.id.slice(0, 8)}] ${clip(r.summary, 180)} :: ${clip(r.content, 240)}`;
    if (shown >= MAX_PENDING || used + line.length > CHAR_BUDGET) break;
    lines.push(line); used += line.length; shown++;
  }
  if (!pending.length) lines.push("(none pending)");
  if (shown < pending.length)
    lines.push(`(${pending.length - shown} lower-weight pending lessons not loaded; they remain searchable in the brain)`);
  lines.push("");
  mkdirSync(join(ROOT, "state", "compiled"), { recursive: true });
  const tmp = B.out + ".tmp";
  writeFileSync(tmp, lines.join("\n"), "utf8");
  rmSync(B.out, { force: true });
  renameSync(tmp, B.out);
  console.log(`compiled ${B.out.replace(/\\/g, "/")}: ${confirmed.length} rules, ${shown}/${pending.length} provisional loaded`);
}

function status(db, B) {
  sync(db, B);
  const { confirmed, pending } = fetchRows(db, B);
  console.log(`${B.label}: ${confirmed.length} confirmed, ${pending.length} pending`);
  for (const r of pending.slice(0, 10))
    console.log(`  w ${r.weight} a${r.applied_count} m${r.misfire_count}${r.flagged_for_review ? " FLAG" : ""} ${r.id.slice(0, 8)} ${clip(r.summary, 100)}`);
}

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const being = BEINGS[opt("being")];
if (!being || !["sync", "compile", "night", "status"].includes(cmd)) {
  console.error("usage: lessons.mjs sync|compile|night|status --being genesis|alpha [--applied id,id] [--misfired id,id] [--note \"...\"]");
  process.exit(2);
}
const db = dbUrl();
if (cmd === "sync") { sync(db, being); console.log("sync ok"); }
else if (cmd === "night") { night(db, being, uuidList(opt("applied")), uuidList(opt("misfired")), opt("note")); compile(db, being); }
else if (cmd === "compile") compile(db, being);
else status(db, being);
