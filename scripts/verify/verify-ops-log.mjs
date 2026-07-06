// verify-ops-log.mjs — A20 dark verify. PASS iff ops-log.md exists with its cadence-definitions
// section and at least one dated log entry (checklist 08: "file exists; first entries present").
// Prints PASS/FAIL; exit 0/1.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const p = join(ROOT, "ops-log.md");
const fails = [];

if (!existsSync(p)) { console.log("FAIL: ops-log.md missing"); process.exit(1); }
const md = await readFile(p, "utf8");
if (!/##\s*Cadence definitions/i.test(md)) fails.push("missing '## Cadence definitions' section");
if (!/##\s*Log/i.test(md)) fails.push("missing '## Log' section");
const entries = (md.match(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|/gm) || []).length;
if (entries < 1) fails.push("no dated log entries (YYYY-MM-DD)");
if (!/night-loop\.xml/.test(md)) fails.push("cadence table does not reference the task definitions");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: ops-log.md present; cadence definitions + Log sections found; ${entries} dated ${entries === 1 ? "entry" : "entries"}.`);
