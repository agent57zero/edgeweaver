#!/usr/bin/env node
// Fishbowl backfill (D46). state/alpha-messages-since-birth.md is Alan's hand-prepared
// complete record of the room's first days (78 messages, both directions). Sessions that
// died unwritten left holes in the extracted stream; this script parses the record and
// inserts ONLY the messages the room does not already hold, as inner_dialogue rows
// (kind telegram_in/telegram_out, session_id backfill-birth-record), so the public
// replay is complete for the covered window. Idempotent via the same dedup that guards
// the first run: a message whose normalized head already exists within +/-15 minutes is
// never inserted again.
//
//   node scripts/ops/fishbowl-backfill.mjs [--dry]
import { readFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { query, runSqlText } from "../brains/db.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dry = process.argv.includes("--dry");
const SRC = join(repo, "state", "alpha-messages-since-birth.md");
const envText = readFileSync(join(repo, "avatars", "alpha", ".env.local"), "utf8");
const dbUrl = (envText.match(/^EW_ALPHA_DB_URL=(.+)$/m) || [])[1]?.trim();
if (!dbUrl) { console.error("EW_ALPHA_DB_URL missing"); process.exit(1); }

// 1. Parse the record: "### YYYY-MM-DD" date headers, "**[HH:MM UTC] Name:**" messages.
const lines = readFileSync(SRC, "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => l.trim() === "## Full transcript");
const msgs = [];
let date = null, cur = null;
for (const l of lines.slice(start + 1)) {
  const d = l.match(/^### (\d{4}-\d{2}-\d{2})/);
  const h = l.match(/^\*\*\[(\d{2}):(\d{2}) UTC\] ([A-Za-z]+):\*\*/);
  if (d) { date = d[1]; continue; }
  if (h) {
    if (cur) msgs.push(cur);
    cur = { ts: `${date}T${h[1]}:${h[2]}:00.000Z`, name: h[3], text: [] };
    continue;
  }
  if (cur) cur.text.push(l);
}
if (cur) msgs.push(cur);
for (const m of msgs) m.text = m.text.join("\n").trim();
const parsed = msgs.filter((m) => m.text);
console.log(`parsed: ${parsed.length} messages, ${parsed[0]?.ts} .. ${parsed[parsed.length - 1]?.ts}`);

// 2. Existing rows in the covered window (with margin) for dedup.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
const first = parsed[0].ts, last = parsed[parsed.length - 1].ts;
const rows = query(dbUrl,
  `SELECT extract(epoch FROM created_at), replace(substr(content, 1, 200), E'\\n', ' ')
     FROM ew_alpha.thoughts
    WHERE source_type = 'inner_dialogue'
      AND metadata->>'kind' IN ('telegram_in','telegram_out')
      AND created_at BETWEEN '${first}'::timestamptz - interval '1 hour'
                         AND '${last}'::timestamptz + interval '1 hour'`);
const existing = rows.map(([ep, head]) => ({ ep: parseFloat(ep) * 1000, head: norm(head) }));
console.log(`existing rows in window: ${existing.length}`);

// 3. Insert only what is missing.
const esc = (s) => String(s).replace(/\u0000/g, "").replace(/'/g, "''");
const missing = [];
for (const m of parsed) {
  const head = norm(m.text);
  const t = Date.parse(m.ts);
  const dup = existing.some((e) => Math.abs(e.ep - t) < 15 * 60 * 1000 && (e.head.startsWith(head) || head.startsWith(e.head)));
  if (!dup) missing.push(m);
}
console.log(`missing (to insert): ${missing.length}`);
for (const m of missing) console.log(`  + [${m.ts}] ${m.name}: ${m.text.slice(0, 70).replace(/\n/g, " ")}`);
if (dry || !missing.length) { console.log(dry ? "DRY: no writes" : "nothing to insert"); process.exit(0); }

const values = missing.map((m, i) => {
  const out = m.name === "Alpha";
  const meta = {
    era: "alive", audience: "seats", generation: 0,
    kind: out ? "telegram_out" : "telegram_in",
    session_id: "backfill-birth-record", seq: i,
  };
  if (!out) meta.sender = m.name; // first name only, matching the public map
  return `('${esc(m.text)}', 'inner_dialogue', 2, '${esc(JSON.stringify(meta))}'::jsonb, '${m.ts}')`;
});
runSqlText(dbUrl, `BEGIN;
DELETE FROM ew_alpha.thoughts WHERE source_type='inner_dialogue' AND metadata->>'session_id'='backfill-birth-record';
INSERT INTO ew_alpha.thoughts (content, source_type, importance, metadata, created_at) VALUES
${values.join(",\n")};
COMMIT;`, "fishbowl-backfill");
console.log(`inserted ${values.length} rows (session_id backfill-birth-record)`);
