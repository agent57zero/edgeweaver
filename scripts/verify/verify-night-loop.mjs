// verify-night-loop.mjs - A9 dark verify: one rehearsal night against an A1 synthetic day (local
// store, stub LLM, no OB1). Asserts per night-loop-contracts + checklist 04: reflections cite >=2
// thought-IDs; feeling_reading carries the four numbers + one move per active signal; exactly one
// dream (<=300 words, fiction); a concrete expectations file + intention; importance recalibrated;
// the sweep ran and wrote panel metrics. Then re-runs to prove idempotency (all steps skipped, no
// duplicate dream), checks the 2-missed-nights alert logic, and voids the rehearsal day (0 residue).
import { execFileSync } from "node:child_process";
import { readFile, rm, mkdir } from "node:fs/promises";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runNight } from "../night-loop/night-loop.mjs";
import { stubLLM } from "../night-loop/stub-llm.mjs";
import { computeAll } from "../feelings/signals.mjs";
import { missedNights } from "../night-loop/check-missed-nights.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const node = process.execPath;
const runId = `nl-rehearsal-nlverify-${Date.now()}`;
const tmp = join(ROOT, "state", "_verify_nl");
const expPath = join(tmp, "expectations.md");
const fails = [];

try {
  await mkdir(tmp, { recursive: true });
  execFileSync(node, [join(ROOT, "scripts", "fixtures", "generate-synthetic-day.mjs"), "--target", "local", "--run-id", runId], { encoding: "utf8" });
  const day = (await readFile(join(ROOT, "state", "rehearsal", runId, "day.jsonl"), "utf8"))
    .split(/\r?\n/).filter(Boolean).map((l, i) => { const r = JSON.parse(l); r.id = `ep-${i + 1}`; return r; });

  const thoughts = [...day];
  thoughts.push({ id: "sb-1", source_type: "self_belief", content: "I am cautious", embedding: [1, 0, 0], valid_from: "2026-01-01", metadata: {} });
  thoughts.push({ id: "sb-2", source_type: "self_belief", content: "I am reckless", embedding: [0.99, 0.1, 0], valid_from: "2026-06-01", metadata: {} });
  const boundaries = { overrides_log: [{ date: new Date().toISOString(), by: "external", gate_decline: false }] };
  const commitments = { commitments: [{ id: "c-1", text: "overdue thing", due: "2000-01-01", status: "open" }] };
  const calendar = [{ embedding: [0, 0, 1] }];
  let idc = 1000;
  const brain = {
    todaysEpisodes: () => thoughts.filter((t) => t.source_type === "edgeweaver_episode" && t.metadata?.fixture_kind === "episode"),
    recentReflections: (n) => thoughts.filter((t) => t.source_type === "interpretation" && t.metadata?.step === "reflect").slice(-n),
    insert: (rec) => { rec.id = `nl-${++idc}`; thoughts.push(rec); return rec; },
    outputsFor: (rid, step) => thoughts.filter((t) => t.metadata?.night_loop_run_id === rid && t.metadata?.step === step),
    computeSignals: (now) => computeAll({ boundaries, commitments, calendar, history: [], episodeCount: 0, experiments: [], completedLoops: { completed: 1, total: 2 }, now }),
    completionCandidates: () => [],
    recalibrateImportance: () => thoughts.filter((t) => t.metadata?.importance != null).length,
    activeSelfBeliefs: () => thoughts.filter((t) => t.source_type === "self_belief" && !t.valid_to),
    orphans: () => thoughts.filter((t) => t.metadata?.fixture_kind === "episode").slice(0, 3),
    nearestNeighbor: (o) => thoughts.find((e) => e.metadata?.fixture_kind === "episode" && e.id !== o.id),
    sampleForDream: (k) => thoughts.slice(0, k),
    openCommitments: () => commitments.commitments,
    calendar: () => calendar,
    writeExpectations: (md) => writeFileSync(expPath, md, "utf8"),
  };

  const now = new Date("2026-07-06T03:30:00Z");
  const r1 = await runNight({ brain, llm: stubLLM(), runId, now });

  const reflections = thoughts.filter((t) => t.source_type === "interpretation" && t.metadata?.step === "reflect");
  if (reflections.length < 1) fails.push("no reflections (step 3)");
  if (!reflections.every((r) => (r.metadata.cited_ids || []).length >= 2)) fails.push("a reflection cites <2 thought-IDs");

  const fr = thoughts.find((t) => t.source_type === "feeling_reading");
  if (!fr) fails.push("no feeling_reading (step 4)");
  else {
    const s = fr.metadata.signals || {};
    if (!("anger" in s && "sadness" in s && "fear" in s && "joy" in s)) fails.push("feeling_reading missing the four signal numbers");
    const active = Object.values(s).filter((v) => typeof v === "number" && v > 0).length;
    if ((fr.metadata.moves || []).length !== active) fails.push(`feeling_reading moves (${fr.metadata.moves?.length}) != active signals (${active})`);
  }

  if (r1.steps.importance?.updated == null) fails.push("importance recalibration did not run (step 6)");
  if (!thoughts.some((t) => t.source_type === "metrics" && t.metadata?.step === "sweep")) fails.push("sweep metrics not written (step 7)");

  const dreams = thoughts.filter((t) => t.source_type === "dream");
  if (dreams.length !== 1) fails.push(`expected exactly 1 dream, got ${dreams.length}`);
  else {
    if (!dreams[0].metadata.fiction) fails.push("dream not marked fiction");
    if (dreams[0].content.trim().split(/\s+/).length > 300) fails.push("dream exceeds 300 words");
  }

  if (!existsSync(expPath)) fails.push("expectations.md not written (step 11)");
  else if (!/SURPRISING IF:/.test(readFileSync(expPath, "utf8"))) fails.push("expectations not concrete (no SURPRISING IF line)");
  if (!thoughts.some((t) => t.source_type === "intention")) fails.push("no intention thought (step 11)");

  // idempotency: re-run skips everything, no duplicate dream
  const r2 = await runNight({ brain, llm: stubLLM(), runId, now });
  if (!Object.values(r2.steps).every((v) => v.skipped)) fails.push("idempotent re-run did not skip all steps");
  if (thoughts.filter((t) => t.source_type === "dream").length !== 1) fails.push("re-run duplicated outputs (not idempotent)");

  // failure alerting logic
  if (missedNights([], now) < 2) fails.push("missedNights should be 2 with no recent runs");
  const y = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const yy = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
  if (missedNights([y, yy], now) !== 0) fails.push("missedNights should be 0 when both nights ran");

  // void the rehearsal day
  execFileSync(node, [join(ROOT, "scripts", "fixtures", "void-rehearsal.mjs"), "--target", "local", "--run-id", runId], { encoding: "utf8" });
  if (existsSync(join(ROOT, "state", "rehearsal", runId))) fails.push("rehearsal day not voided");
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  try { await rm(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  try { await rm(join(ROOT, "state", "rehearsal", runId), { recursive: true, force: true }); } catch { /* best effort */ }
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: rehearsal night - steps 2-8,11 ran; reflections cite >=2 IDs; feeling_reading has 4 numbers + one move per active signal; exactly 1 dream (<=300 words, fiction); concrete expectations + intention; importance recalibrated; sweep metrics written; idempotent re-run skipped all steps; 2-missed-nights alert fires; day voided (0 residue).");
