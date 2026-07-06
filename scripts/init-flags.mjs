// init-flags.mjs - rebuild the live state/flags.json from templates/flags.default.json.
// Idempotent and NON-DESTRUCTIVE: creates state/flags.json if absent; adds any missing
// component/task/channel entry as DISABLED; PRESERVES existing entries verbatim (never flips an
// armed flag back to disabled, never deletes). state/ is gitignored (live operational state);
// the committed default + this script are the fixed rope. Arming still happens only per
// PREBUILD.md §7 - this script never enables anything.
// Usage: node scripts/init-flags.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DEFAULT = join(ROOT, "templates", "flags.default.json");
const LIVE = join(ROOT, "state", "flags.json");
const SECTIONS = ["components", "tasks", "channels"];

const def = JSON.parse(await readFile(DEFAULT, "utf8"));
let live = {};
if (existsSync(LIVE)) {
  try { live = JSON.parse(await readFile(LIVE, "utf8")); }
  catch (e) { console.error(`refusing to overwrite unparseable state/flags.json: ${e.message}`); process.exit(1); }
}

live.schema_version = def.schema_version;
live.note = def.note;
let added = 0, preserved = 0;
for (const sec of SECTIONS) {
  live[sec] = live[sec] || {};
  for (const [k, v] of Object.entries(def[sec] || {})) {
    if (k in live[sec]) preserved++;
    else { live[sec][k] = { ...v }; added++; }
  }
}
live.generated_at = new Date().toISOString();

await mkdir(join(ROOT, "state"), { recursive: true });
await writeFile(LIVE, JSON.stringify(live, null, 2) + "\n", "utf8");
console.log(`flags: ${added} added, ${preserved} preserved -> state/flags.json`);
