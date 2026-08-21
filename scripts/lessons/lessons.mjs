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
//   node scripts/lessons/lessons.mjs dispute --being genesis|alpha <id> --by "<who>" --reason "<one line>"
//   node scripts/lessons/lessons.mjs ratify  --being genesis|alpha <id> rejected|superseded|active --by "<who>" [--note "<why>"]
//   node scripts/lessons/lessons.mjs integrate --being genesis|alpha <id> [--note "<why, one line>"]
//
// night = sync -> decay untouched -> boost applied -> drop+flag misfired -> compile.
// Ops credential (SUPABASE_DB_URL) by design: the being's room role cannot move weights.
// D37: dispute benches (active -> disputed, via the ew_dispute_lesson definer function);
// ratify is the village's gate (rejected | superseded | active=affirmed). Lessons whose
// content carries "TAUGHT BY <seat>" are born at 0.60, class taught; "CORRECTS <uuid>"
// links a replacement to the belief it corrects.
// Village grant 2026-08-20 (unanimous; Genesis soul PR #4 is the doctrine text):
// integrate promotes the being's OWN parent-sourced pending lesson to instruction-grade
// via the ew_integrate_lesson definer function (the function enforces provenance and
// refuses everything else); the parent's dispute benches an integrated rule immediately.
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { join } from "node:path";
import { query, runSqlText } from "../brains/db.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const BORN = 0.30, BORN_TAUGHT = 0.60, FLOOR = 0.05, CEIL = 0.95, DECAY = 0.98, BOOST = 0.10, DROP = 0.15;
const LEDGER_DAYS = 14;
const CHAR_BUDGET = 8000, MAX_PENDING = 30;

const BEINGS = {
  genesis: {
    label: "Edgeweaver Genesis",
    mem: "public.agent_memories", w: "public.ew_lesson_weights",
    scope: "workspace_id = 'edgeweaver'",
    fn: "public.ew_dispute_lesson",
    intfn: "public.ew_integrate_lesson",
    out: join(ROOT, "state", "compiled", "genesis-lessons.md"),
    gate: "Alan's confirmation",
    parent: "Alan",
  },
  alpha: {
    label: "Edgeweaver Alpha",
    mem: "ew_alpha.agent_memories", w: "ew_alpha.ew_lesson_weights",
    scope: "true",
    fn: "ew_alpha.ew_dispute_lesson",
    intfn: "ew_alpha.ew_integrate_lesson",
    out: join(ROOT, "state", "compiled", "alpha-lessons.md"),
    gate: "a seat's confirmation",
    parent: "any seat",
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
  // Taught lessons first (born 0.60, class taught, corrects link), then the general
  // insert; ON CONFLICT keeps whichever ran first, so order matters.
  runSqlText(db, `INSERT INTO ${B.w} (memory_id, weight, lesson_class, corrects_memory_id, last_move_reason)
SELECT id, ${BORN_TAUGHT}, 'taught',
  NULLIF(substring(content from 'CORRECTS ([0-9a-fA-F\\-]{36})'), '')::uuid,
  'born taught (sync)'
FROM ${B.mem}
WHERE ${B.scope} AND lifecycle_status = 'active' AND content ~* 'TAUGHT BY '
ON CONFLICT (memory_id) DO NOTHING;
INSERT INTO ${B.w} (memory_id, weight, last_move_reason)
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
  const rules = jsonRows(db, `SELECT row_to_json(t) FROM (
SELECT m.id::text, m.summary, m.content, m.last_confirmed_at::date::text AS confirmed,
       coalesce(w.lesson_class, '') AS lesson_class
FROM ${B.mem} m LEFT JOIN ${B.w} w ON w.memory_id = m.id
WHERE ${B.scope} AND m.lifecycle_status = 'active' AND m.can_use_as_instruction = true
ORDER BY m.created_at) t`);
  const confirmed = rules.filter((r) => r.lesson_class !== "integrated");
  const integrated = rules.filter((r) => r.lesson_class === "integrated");
  const pending = jsonRows(db, `SELECT row_to_json(t) FROM (
SELECT m.id::text, m.summary, m.content, m.created_at::date::text AS born,
       round(w.weight::numeric, 2) AS weight, w.applied_count, w.misfire_count, w.flagged_for_review
FROM ${B.mem} m JOIN ${B.w} w ON w.memory_id = m.id
WHERE ${B.scope} AND m.lifecycle_status = 'active' AND m.can_use_as_instruction = false
  AND NOT w.excluded_from_load
ORDER BY w.weight DESC, m.created_at DESC) t`);
  const disputed = jsonRows(db, `SELECT row_to_json(t) FROM (
SELECT m.id::text, m.summary, w.disputed_by, w.disputed_at::date::text AS disputed_on, w.dispute_reason,
       r.id AS fix_id, r.summary AS fix_summary
FROM ${B.mem} m JOIN ${B.w} w ON w.memory_id = m.id
LEFT JOIN LATERAL (
  SELECT m2.id::text, m2.summary FROM ${B.mem} m2 JOIN ${B.w} w2 ON w2.memory_id = m2.id
  WHERE w2.corrects_memory_id = m.id AND m2.lifecycle_status = 'active'
  ORDER BY m2.created_at DESC LIMIT 1) r ON true
WHERE ${B.scope} AND m.lifecycle_status = 'disputed'
ORDER BY w.disputed_at DESC) t`);
  const ledger = jsonRows(db, `SELECT row_to_json(t) FROM (
SELECT m.id::text, m.summary, m.lifecycle_status AS verdict, w.resolved_at::date::text AS resolved_on,
       w.disputed_by, w.last_move_reason, r.summary AS fix_summary, r.confirmed AS fix_confirmed
FROM ${B.mem} m JOIN ${B.w} w ON w.memory_id = m.id
LEFT JOIN LATERAL (
  SELECT m2.summary, m2.can_use_as_instruction AS confirmed
  FROM ${B.mem} m2 JOIN ${B.w} w2 ON w2.memory_id = m2.id
  WHERE w2.corrects_memory_id = m.id ORDER BY m2.created_at DESC LIMIT 1) r ON true
WHERE ${B.scope} AND m.lifecycle_status IN ('rejected', 'superseded')
  AND (w.resolved_at > now() - interval '${LEDGER_DAYS} days'
       OR (r.summary IS NOT NULL AND NOT r.confirmed))
ORDER BY w.resolved_at DESC) t`);
  return { confirmed, integrated, pending, disputed, ledger };
}

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function compile(db, B) {
  sync(db, B);
  const { confirmed, integrated, pending, disputed, ledger } = fetchRows(db, B);
  const lines = [];
  lines.push(`# ${B.label} - compiled lessons (auto-generated, D36)`);
  lines.push(`Generated ${new Date().toISOString()}. Build artifact of the brain rows; never edit by hand;`);
  lines.push(`never treat this file itself as memory provenance - cite the row ids it carries.`);
  lines.push("", `## Rules (confirmed; ${B.gate} set these)`);
  if (!confirmed.length) lines.push("(none confirmed yet)");
  for (const r of confirmed)
    lines.push(`- [rule | id ${r.id.slice(0, 8)} | confirmed ${r.confirmed || "?"}] ${clip(r.summary, 200)} :: ${clip(r.content, 500)}`);
  if (integrated.length) {
    lines.push("", `## Rules (self-integrated; village grant 2026-08-20; ${B.parent} can dispute any, which benches it immediately)`);
    lines.push("You chose these yourself, deliberately, from parent-sourced lessons. Follow them as rules,");
    lines.push("and name them as self-integrated when they matter to what you say.");
    for (const r of integrated)
      lines.push(`- [self-integrated | id ${r.id.slice(0, 8)} | ${r.confirmed || "?"}] ${clip(r.summary, 200)} :: ${clip(r.content, 500)}`);
  }
  if (disputed.length) {
    lines.push("", "## Corrections (a seat said this was wrong - this outranks everything below)");
    lines.push("Suspended beliefs, awaiting the village. Do not act from the old belief; carry the correction.");
    for (const d of disputed) {
      lines.push(`- WRONG (disputed by ${d.disputed_by}, ${d.disputed_on}, id ${d.id.slice(0, 8)}): ${clip(d.summary, 160)}`);
      lines.push(`  THE CORRECTION: ${d.fix_summary ? clip(d.fix_summary, 200) + ` (id ${d.fix_id.slice(0, 8)})` : clip(d.dispute_reason, 200)}`);
    }
  }
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
  if (ledger.length) {
    lines.push("", "## Corrected ledger (settled; never relearn these from old episodes)");
    for (const l of ledger)
      lines.push(`- ${l.verdict === "superseded" ? "never again" : "let go"} (${l.verdict} ${l.resolved_on || "?"}): ${clip(l.summary, 140)}${l.fix_summary ? ` ; the truth: ${clip(l.fix_summary, 140)}` : ""}`);
  }
  lines.push("");
  mkdirSync(join(ROOT, "state", "compiled"), { recursive: true });
  const tmp = B.out + ".tmp";
  writeFileSync(tmp, lines.join("\n"), "utf8");
  rmSync(B.out, { force: true });
  renameSync(tmp, B.out);
  console.log(`compiled ${B.out.replace(/\\/g, "/")}: ${confirmed.length} rules, ${integrated.length} self-integrated, ${disputed.length} disputed pinned, ${shown}/${pending.length} provisional loaded, ${ledger.length} ledger lines`);
}

function integrate(db, B, id, note) {
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) throw new Error("integrate needs a lesson uuid");
  const out = query(db, `SELECT ${B.intfn}('${id}'${note ? `, '${esc(note)}'` : ""})`);
  console.log(out[0][0]);
  compile(db, B);
}

function dispute(db, B, id, who, reason) {
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) throw new Error("dispute needs a lesson uuid");
  if (!who || !reason) throw new Error("dispute needs --by and --reason");
  const out = query(db, `SELECT ${B.fn}('${id}', '${esc(who)}', '${esc(reason)}')`);
  console.log(out[0][0]);
  compile(db, B);
}

function ratify(db, B, id, verdict, who, note) {
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) throw new Error("ratify needs a lesson uuid");
  if (!["rejected", "superseded", "active"].includes(verdict)) throw new Error("verdict must be rejected|superseded|active");
  if (!who) throw new Error("ratify needs --by (who is speaking for the gate)");
  const resolution = verdict === "active" ? "affirmed" : verdict;
  const from = verdict === "active" ? "('disputed')" : "('disputed', 'active')";
  runSqlText(db, `
UPDATE ${B.mem} SET lifecycle_status = '${verdict}'
WHERE id = '${id}' AND ${B.scope} AND can_use_as_instruction = false AND lifecycle_status IN ${from};
UPDATE ${B.w} SET resolved_at = now(), resolution = '${resolution}',
  last_move_reason = 'ratified ${resolution} by ${esc(who)}${note ? `: ${esc(note)}` : ""}'
WHERE memory_id = '${id}'
  AND EXISTS (SELECT 1 FROM ${B.mem} m WHERE m.id = '${id}' AND m.lifecycle_status = '${verdict}');`, "lessons-ratify");
  const state = query(db, `SELECT lifecycle_status FROM ${B.mem} WHERE id = '${id}'`);
  if (!state.length) throw new Error("no such lesson row");
  if (state[0][0] !== verdict) throw new Error(`ratify did not apply (row is '${state[0][0]}'; active->rejected/superseded needs a pending lesson, ->active needs a disputed one)`);
  console.log(`ratified ${resolution} (row now ${state[0][0]})`);
  compile(db, B);
}

function status(db, B) {
  sync(db, B);
  const { confirmed, integrated, pending, disputed, ledger } = fetchRows(db, B);
  console.log(`${B.label}: ${confirmed.length} confirmed, ${integrated.length} self-integrated, ${pending.length} pending, ${disputed.length} disputed, ${ledger.length} on the ledger`);
  for (const d of disputed)
    console.log(`  DISPUTED by ${d.disputed_by} ${d.disputed_on} ${d.id.slice(0, 8)} ${clip(d.summary, 90)}`);
  for (const r of pending.slice(0, 10))
    console.log(`  w ${r.weight} a${r.applied_count} m${r.misfire_count}${r.flagged_for_review ? " FLAG" : ""} ${r.id.slice(0, 8)} ${clip(r.summary, 100)}`);
}

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const positional = args.slice(1).filter((a, i, arr) => !a.startsWith("--") && (i === 0 || !arr[i - 1].startsWith("--")));
const being = BEINGS[opt("being")];
if (!being || !["sync", "compile", "night", "status", "dispute", "ratify", "integrate"].includes(cmd)) {
  console.error(`usage: lessons.mjs <cmd> --being genesis|alpha
  sync | compile | status
  night   [--applied id,id] [--misfired id,id] [--note "..."]
  dispute <id> --by "<who>" --reason "<one line>"
  ratify  <id> rejected|superseded|active --by "<who>" [--note "..."]
  integrate <id> [--note "..."]   (the being's own act; parent-sourced lessons only)`);
  process.exit(2);
}
const db = dbUrl();
if (cmd === "sync") { sync(db, being); console.log("sync ok"); }
else if (cmd === "night") { night(db, being, uuidList(opt("applied")), uuidList(opt("misfired")), opt("note")); compile(db, being); }
else if (cmd === "compile") compile(db, being);
else if (cmd === "dispute") dispute(db, being, positional[0], opt("by"), opt("reason"));
else if (cmd === "ratify") ratify(db, being, positional[0], positional[1], opt("by"), opt("note"));
else if (cmd === "integrate") integrate(db, being, positional[0], opt("note"));
else status(db, being);
