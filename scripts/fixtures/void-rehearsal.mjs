// void-rehearsal.mjs - A1 rehearsal voider (the §11 rollback mechanism, used on purpose).
// Removes rehearsal records by run_id and reports residual (0 residual = clean, rule 3/5).
//   node scripts/fixtures/void-rehearsal.mjs --run-id <id> [--target local|ob1]
// local: deletes state/rehearsal/<run_id>/.  ob1: deletes OB1 thoughts where metadata.run_id=<id>.
// Exit 0 iff residual === 0. Prints one JSON line: { target, run_id, removed, residual }.
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ob1Client } from "./ob1-client.mjs";

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return (v === undefined || String(v).startsWith("--")) ? true : v;
};

const target = opt("target", "local");
const runId = opt("run-id", null);
const ROOT = join(import.meta.dirname, "..", "..");

if (!runId || runId === true) {
  console.error("usage: void-rehearsal.mjs --run-id <id> [--target local|ob1]");
  process.exit(2);
}

let removed = 0, residual = 0;
if (target === "ob1") {
  const ob1 = await ob1Client();
  removed = await ob1.deleteByRunId(runId);
  residual = await ob1.countByRunId(runId);
} else {
  const dir = join(ROOT, "state", "rehearsal", runId);
  if (existsSync(dir)) {
    const jl = join(dir, "day.jsonl");
    if (existsSync(jl)) removed = (await readFile(jl, "utf8")).split(/\r?\n/).filter(Boolean).length;
    await rm(dir, { recursive: true, force: true });
  }
  residual = existsSync(dir) ? 1 : 0;
}

console.log(JSON.stringify({ target, run_id: runId, removed, residual }));
process.exit(residual === 0 ? 0 : 1);
