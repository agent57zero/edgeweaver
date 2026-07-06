// verify-wal.mjs - A4 dark verify. Simulated OB1 outage: appends buffer to the WAL; replay dedupes
// by fingerprint; health check reports DEGRADED when the brain is unreachable and healthy when it
// is. PASS/FAIL; exit 0/1. Uses an isolated state/wal/_verify dir, cleaned up after.
import { append, replay, healthCheck } from "../wal/wal.mjs";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const DIR = join(ROOT, "state", "wal", "_verify");
const fails = [];

try {
  await rm(DIR, { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });

  await append("episode", { content: "alpha" }, { dir: DIR });
  await append("episode", { content: "beta" }, { dir: DIR });
  await append("episode", { content: "alpha" }, { dir: DIR }); // duplicate content -> same fingerprint

  const sunk = [];
  const res = await replay((rec) => { sunk.push(rec); }, { dir: DIR });
  if (res.replayed !== 2) fails.push(`expected 2 unique replayed, got ${res.replayed}`);
  if (res.deduped !== 1) fails.push(`expected 1 deduped, got ${res.deduped}`);
  if (sunk.length !== 2) fails.push(`sink received ${sunk.length}, expected 2`);

  const down = await healthCheck(async () => { throw new Error("unreachable"); });
  if (!down.degraded) fails.push("health check did not report degraded on outage");
  const up = await healthCheck(async () => true);
  if (up.degraded) fails.push("health check reported degraded when reachable");
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  try { await rm(DIR, { recursive: true, force: true }); } catch { /* best effort */ }
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: WAL buffers writes; replay dedupes by fingerprint (2 unique, 1 dup); degraded on outage, healthy when reachable.");
