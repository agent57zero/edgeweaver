// verify-flags.mjs - A2 dark verify. Rebuilds state/flags.json from the committed default, then
// PASS iff it parses, every component A1..A21 is present and DISABLED, and every task/channel is
// disabled + unregistered (dark by default). Prints PASS/FAIL; exit 0/1.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const LIVE = join(ROOT, "state", "flags.json");
const fails = [];

try { execFileSync(process.execPath, [join(ROOT, "scripts", "init-flags.mjs")], { encoding: "utf8" }); }
catch (e) { console.log("FAIL: init-flags.mjs errored: " + e.message); process.exit(1); }

if (!existsSync(LIVE)) { console.log("FAIL: state/flags.json missing after init"); process.exit(1); }
let f;
try { f = JSON.parse(await readFile(LIVE, "utf8")); }
catch (e) { console.log("FAIL: state/flags.json does not parse: " + e.message); process.exit(1); }

const comps = f.components || {};
const expected = Array.from({ length: 21 }, (_, i) => `A${i + 1}`);
for (const a of expected) {
  const key = Object.keys(comps).find((k) => k === a || k.startsWith(a + "_"));
  if (!key) { fails.push(`missing component ${a}`); continue; }
  if (comps[key].enabled !== false) fails.push(`${key} not disabled (enabled=${comps[key].enabled})`);
}
for (const [k, v] of Object.entries(f.tasks || {})) {
  if (v.enabled !== false) fails.push(`task ${k} not disabled`);
  if (v.registered !== false) fails.push(`task ${k} registered (must be false in dark build)`);
}
for (const [k, v] of Object.entries(f.channels || {})) {
  if (v.enabled !== false) fails.push(`channel ${k} not disabled`);
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: state/flags.json valid; ${expected.length} components present + all disabled; ${Object.keys(f.tasks || {}).length} tasks + ${Object.keys(f.channels || {}).length} channels dark (disabled, unregistered).`);
