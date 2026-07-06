// verify-tasks.mjs — A2 dark verify for the Task Scheduler definitions. Static validation
// (safe, repeatable, no Task Scheduler writes): each tasks/*.xml exists, is a single well-formed
// <Task> doc, sets WakeToRun=true (mandatory on this-PC hosting, G5), ships DISABLED
// (<Enabled>false</Enabled> in Settings), carries a trigger, and runs the wake skill. Prints
// PASS/FAIL; exit 0/1.
// The live "import-disabled-then-remove" round-trip is the ARMING check (Phase 4 + G5); a
// self-cleaning version is available out-of-band via scripts/verify/task-import-test.ps1.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const expect = [
  { file: "edgeweaver-night-loop.xml", trigger: "CalendarTrigger", extra: "ScheduleByDay" },
  { file: "edgeweaver-weekly-index.xml", trigger: "CalendarTrigger", extra: "ScheduleByWeek" },
  { file: "edgeweaver-heartbeat.xml", trigger: "TimeTrigger", extra: "PT3H" },
];
const fails = [];

for (const t of expect) {
  const p = join(ROOT, "tasks", t.file);
  if (!existsSync(p)) { fails.push(`${t.file}: missing`); continue; }
  const xml = await readFile(p, "utf8");
  const opens = (xml.match(/<Task[\s>]/g) || []).length;
  const closes = (xml.match(/<\/Task>/g) || []).length;
  if (opens !== 1 || closes !== 1) fails.push(`${t.file}: not a single well-formed <Task> (open=${opens} close=${closes})`);
  if (!/<WakeToRun>true<\/WakeToRun>/.test(xml)) fails.push(`${t.file}: WakeToRun not true (silent-fail risk on sleeping PC, G5)`);
  if (!/<Enabled>false<\/Enabled>/.test(xml)) fails.push(`${t.file}: not shipped disabled (Settings Enabled must be false in dark build)`);
  if (!xml.includes(`<${t.trigger}>`)) fails.push(`${t.file}: expected trigger <${t.trigger}> not found`);
  if (!xml.includes(t.extra)) fails.push(`${t.file}: expected schedule detail "${t.extra}" not found`);
  if (!/powershell\.exe/.test(xml)) fails.push(`${t.file}: no powershell.exe action`);
  if (!/\/wake-edgeweaver/.test(xml)) fails.push(`${t.file}: action does not invoke the wake skill`);
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: ${expect.length} task definitions valid; all WakeToRun=true, shipped disabled/unregistered, correct triggers, wake-skill actions.`);
