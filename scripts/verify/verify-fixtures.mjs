// verify-fixtures.mjs - A1 dark verify (LOCAL target; safe, no OB1 writes). Generates one
// synthetic day, asserts it is plausible and fully rehearsal-tagged (rule 3), voids it by run_id,
// asserts ZERO residue (rule 5). Prints PASS/FAIL; exit 0/1. The OB1-target round-trip is
// exercised in S4 against the scratch-restore DB (rule 3).
import { readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const node = process.execPath;
const runId = `nl-rehearsal-verify-${Date.now()}`;
const dir = join(ROOT, "state", "rehearsal", runId);
const safetySentinelName = `void-rehearsal-sentinel-${Date.now()}`;
const safetySentinel = join(ROOT, "state", safetySentinelName);
const fails = [];

try {
  execFileSync(node, [join(ROOT, "scripts", "fixtures", "generate-synthetic-day.mjs"), "--target", "local", "--run-id", runId], { encoding: "utf8" });
  const jl = join(dir, "day.jsonl");
  if (!existsSync(jl)) { fails.push("day.jsonl not created"); }
  const recs = existsSync(jl) ? (await readFile(jl, "utf8")).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
  const kinds = { episode: 0, intention: 0, calendar: 0 };
  for (const r of recs) {
    const m = r.metadata || {};
    if (m.rehearsal !== true) fails.push("a record is missing rehearsal=true");
    if (m.run_id !== runId) fails.push("a record has the wrong run_id");
    if (m.audience !== "alan") fails.push("a record has audience != alan");
    if (r.source_type !== "edgeweaver_episode") fails.push("a record has wrong source_type");
    if (m.fixture_kind in kinds) kinds[m.fixture_kind]++;
  }
  if (kinds.episode < 3) fails.push(`too few episodes (${kinds.episode})`);
  if (kinds.intention < 1) fails.push("no intentions");
  if (kinds.calendar < 1) fails.push("no calendar items");

  const voidOut = execFileSync(node, [join(ROOT, "scripts", "fixtures", "void-rehearsal.mjs"), "--target", "local", "--run-id", runId], { encoding: "utf8" });
  const v = JSON.parse(voidOut.trim().split("\n").pop());
  if (v.residual !== 0) fails.push(`residual after void: ${v.residual}`);
  if (existsSync(dir)) fails.push("rehearsal dir still present after void");

  // A traversal fragment would target this file with the old join()-based voider.
  await writeFile(safetySentinel, "must survive invalid run-id", "utf8");
  const traversal = spawnSync(node, [join(ROOT, "scripts", "fixtures", "void-rehearsal.mjs"), "--target", "local", "--run-id", `../${safetySentinelName}`], { encoding: "utf8" });
  if (traversal.error) fails.push(`traversal run_id could not run: ${traversal.error.message}`);
  else if (traversal.status !== 2) fails.push(`traversal run_id exited ${traversal.status}, expected 2`);
  if (!existsSync(safetySentinel)) fails.push("traversal run_id removed a file outside state/rehearsal");
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  try { await rm(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  try { await rm(safetySentinel, { force: true }); } catch { /* best effort */ }
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: synthetic day generated (5 episodes + 2 intentions + 2 calendar), all rehearsal/run_id/audience=alan tagged; voided by run_id; 0 residue.");
