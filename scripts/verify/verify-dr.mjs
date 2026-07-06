// verify-dr.mjs - A19 dark verify: templates/disaster-recovery.md exists with the machine-dies path
// + time-to-recover, and the DR drill runs (clone repo to scratch + run the verify suite there)
// green, recording time-to-recover. The drill arms A19 by being performed. When invoked INSIDE a
// drill (EW_DR_DRILL set), it skips the nested drill to avoid infinite recursion.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const drPath = join(ROOT, "templates", "disaster-recovery.md");
const fails = [];

if (!existsSync(drPath)) {
  fails.push("templates/disaster-recovery.md missing");
} else {
  const md = await readFile(drPath, "utf8");
  if (!/machine-dies/i.test(md)) fails.push("DR runbook missing the machine-dies path");
  if (!/time-to-recover/i.test(md)) fails.push("DR runbook missing time-to-recover");
}

if (process.env.EW_DR_DRILL) {
  // nested inside the drill: runbook check only, no recursive drill
  if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("PASS: disaster recovery (nested drill context) - runbook present; nested drill skipped.");
} else {
  const { runDrill } = await import("../dr/dr-drill.mjs");
  const r = runDrill();
  if (!r.pass) fails.push("DR drill: the verify suite did not pass in the scratch clone");
  if (!(r.seconds >= 0)) fails.push("time-to-recover not recorded");
  if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
  console.log(`PASS: disaster recovery - runbook present (machine-dies path + time-to-recover); drill cloned the repo to scratch and ran the full verify suite green in ${r.seconds.toFixed(1)}s; scratch deleted.`);
}
