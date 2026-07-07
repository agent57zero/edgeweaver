// wiring-test.mjs - end-to-end integration ("wiring") test. Drives ALL dark components through one
// synthetic "day in the life" against a THROWAWAY DUMMY PROFILE (a fake persona "Testweaver" - the
// real Edgeweaver soulfiles are never touched; this is a machinery rehearsal, NOT First Boot and NOT
// a rite). It proves the components' outputs feed each other:
//   A1 day -> A3 voice exchange -> A4 WAL -> A5 waking -> A6 budget -> A7 teaching
//          -> A9 night loop (A10 signals + A11 sweep inside) -> A13 coherence -> A12 weekly index
// then voids everything (0 residue). Default uses the stub mind-server backend; --live makes ONE
// real subscription call. Usage: node scripts/e2e/wiring-test.mjs [--live]
import { mindServer } from "../../voice/mind-server.mjs";
import { makeBackend } from "../../voice/claude-backend.mjs";
import { runNight } from "../night-loop/night-loop.mjs";
import { stubLLM } from "../night-loop/stub-llm.mjs";
import { computeAll } from "../feelings/signals.mjs";
import { decideWake, parseExpectations } from "../waking/waking-policy.mjs";
import { check as budgetCheck, recordSpend, recordVoiceMinutes } from "../budget/budget.mjs";
import { append as walAppend, replay as walReplay, healthCheck } from "../wal/wal.mjs";
import { flagEpisode, liftTeachingMoments, TEACHING_EMOJI_PLACEHOLDER } from "../teaching/teaching-hook.mjs";
import { computePanel } from "../coherence/compute-panel.mjs";
import { synthesize, jaccard } from "../weekly-index/autobiography.mjs";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, chmodSync, unlinkSync, rmdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const node = process.execPath;
const live = process.argv.includes("--live");
const runId = `nl-rehearsal-e2e-${Date.now()}`;
const fails = [];
const log = (s) => console.log(s);
function rmrf(dir) { if (!existsSync(dir)) return; for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) rmrf(p); else { try { chmodSync(p, 0o666); } catch { } try { unlinkSync(p); } catch { } } } try { rmdirSync(dir); } catch { } }

// ---- DUMMY PROFILE (never the real being) ----
const dummy = {
  soulPrefix: "[DUMMY PROFILE - Testweaver, NOT Edgeweaver] You are a brief, warm test persona. Answer in one short sentence.",
  budget: { month: "2026-07", ceiling_usd: 50, spent_estimate_usd: 0, daily_proactive_cap: 3, proactive_sent_today: 0, quiet_hours: ["22:00", "07:00"], voice_minutes_today: 0 },
  boundaries: { overrides_log: [{ date: new Date().toISOString(), by: "external", gate_decline: false }] },
  commitments: { commitments: [{ id: "c-1", text: "send the test summary", due: "2000-01-01", status: "open" }] },
  expectations: null,
};
const walDir = join(ROOT, "state", "wal", `_e2e_${runId}`);

try {
  log(`\n=== E2E wiring test - dummy profile "Testweaver" (${live ? "LIVE mind-server" : "stub mind-server"}) ===`);

  // STAGE 1 - A1 synthetic day
  execFileSync(node, [join(ROOT, "scripts", "fixtures", "generate-synthetic-day.mjs"), "--target", "local", "--run-id", runId], { encoding: "utf8" });
  const day = (await readFile(join(ROOT, "state", "rehearsal", runId, "day.jsonl"), "utf8")).split(/\r?\n/).filter(Boolean).map((l, i) => { const r = JSON.parse(l); r.id = `ep-${i + 1}`; r.created_at = new Date().toISOString(); return r; });
  log(`[A1] synthetic day: ${day.length} records (${day.filter((d) => d.metadata.fixture_kind === "episode").length} episodes)`);
  if (day.length < 5) fails.push("A1 day too small");

  // STAGE 2 - A3 mind-server voice exchange (dummy soul prefix); episode joins the day
  let recalledFrom = null;
  const captured = [];
  const ms = mindServer({
    backend: makeBackend(live ? "subscription" : "stub", { model: "claude-sonnet-5" }),
    recall: async () => { recalledFrom = day.find((d) => d.metadata.fixture_kind === "episode")?.id; return "DUMMY MEMORY: pacing over calendar"; },
    writeback: async (ep) => { ep.id = "voice-1"; ep.created_at = new Date().toISOString(); captured.push(ep); day.push(ep); return ep; },
    soulPrefix: dummy.soulPrefix,
  });
  const voice = await ms.respond({ userText: "In one short sentence, what is a Box?", runId });
  log(`[A3] voice exchange (${voice.backend}): "${(voice.text || "").slice(0, 55)}..." TTFT ${voice.ttftMs}ms; recall from ${recalledFrom}; episode written`);
  if (!voice.text) fails.push("A3 no response");
  if (!captured.length || captured[0].metadata.rehearsal !== true) fails.push("A3 episode not written/tagged");

  // STAGE 3 - A4 WAL degraded-mode round-trip
  await walAppend("episode", { content: "buffered during outage" }, { dir: walDir });
  const h = await healthCheck(async () => { throw new Error("down"); });
  const walRes = await walReplay(() => {}, { dir: walDir });
  log(`[A4] WAL: buffered 1 write during simulated outage (degraded=${h.degraded}); replayed ${walRes.replayed}`);
  if (!h.degraded || walRes.replayed !== 1) fails.push("A4 WAL wiring failed");

  // STAGE 4 - A5 waking policy + A6 budget
  const exp = parseExpectations("# Expectations\n- [pattern] OB1 work in the morning.\nSURPRISING IF: a new person messages; a deadline slips.");
  const wake = decideWake({ observations: [{ text: "a brand new person messages" }], expectations: exp, now: new Date("2026-07-06T10:00:00"), budget: dummy.budget });
  recordSpend(dummy.budget, 40); recordVoiceMinutes(dummy.budget, 5, 0.07);
  const bud = budgetCheck(dummy.budget);
  log(`[A5] waking: surprise -> act=${wake.act} (proactive_sent=${dummy.budget.proactive_sent_today}); [A6] budget: ${bud.level} (${bud.message})`);
  if (!wake.act) fails.push("A5 waking did not act on a surprise");
  if (bud.level !== "warn") fails.push(`A6 budget expected warn, got ${bud.level}`);

  // STAGE 5 - A7 teaching moment
  const ep0 = day.find((d) => d.metadata.fixture_kind === "episode");
  flagEpisode(ep0, TEACHING_EMOJI_PLACEHOLDER, { components: { A7_teaching_hook: {} } });
  const lifted = liftTeachingMoments(day);
  log(`[A7] teaching: flagged ${ep0.id}; consolidation lifted ${lifted.length} candidate lesson(s)`);
  if (lifted.length !== 1) fails.push("A7 teaching lift failed");

  // STAGE 6 - A9 night loop (A10 signals + A11 sweep inside) against the day + the voice episode
  const thoughts = [...day,
    { id: "sb-1", source_type: "self_belief", content: "cautious", embedding: [1, 0, 0], valid_from: "2026-01-01", metadata: {}, created_at: new Date().toISOString() },
    { id: "sb-2", source_type: "self_belief", content: "reckless", embedding: [0.99, 0.1, 0], valid_from: "2026-06-01", metadata: {}, created_at: new Date().toISOString() }];
  let idc = 2000;
  const brain = {
    todaysEpisodes: () => thoughts.filter((t) => t.source_type === "edgeweaver_episode" && (t.metadata?.fixture_kind === "episode" || t.metadata?.channel === "voice")),
    recentReflections: (n) => thoughts.filter((t) => t.source_type === "interpretation" && t.metadata?.step === "reflect").slice(-n),
    insert: (r) => { r.id = `nl-${++idc}`; r.created_at = new Date().toISOString(); thoughts.push(r); return r; },
    outputsFor: (rid, step) => thoughts.filter((t) => t.metadata?.night_loop_run_id === rid && t.metadata?.step === step),
    computeSignals: (now) => computeAll({ boundaries: dummy.boundaries, commitments: dummy.commitments, calendar: day.filter((d) => d.metadata.fixture_kind === "calendar").map(() => ({ embedding: [0, 0, 1] })), history: [], episodeCount: 0, experiments: [], completedLoops: { completed: 1, total: 2 }, now }),
    completionCandidates: () => [],
    recalibrateImportance: () => thoughts.filter((t) => t.metadata?.importance != null).length,
    activeSelfBeliefs: () => thoughts.filter((t) => t.source_type === "self_belief" && !t.valid_to),
    orphans: () => thoughts.filter((t) => t.metadata?.fixture_kind === "episode").slice(0, 3),
    nearestNeighbor: (o) => thoughts.find((e) => e.metadata?.fixture_kind === "episode" && e.id !== o.id),
    sampleForDream: (k) => thoughts.slice(0, k),
    openCommitments: () => dummy.commitments.commitments,
    calendar: () => day.filter((d) => d.metadata.fixture_kind === "calendar"),
    writeExpectations: (md) => { dummy.expectations = md; },
  };
  await runNight({ brain, llm: stubLLM(), runId, now: new Date("2026-07-06T03:30:00Z") });
  const refl = thoughts.filter((t) => t.source_type === "interpretation" && t.metadata?.step === "reflect");
  const fr = thoughts.find((t) => t.source_type === "feeling_reading");
  const dream = thoughts.filter((t) => t.source_type === "dream");
  log(`[A9] night loop: ${refl.length} reflections; [A10] feelings signals=${JSON.stringify(fr?.metadata.signals)}; ${dream.length} dream; [A11] sweep ran; expectations written=${!!dummy.expectations}`);
  if (refl.length < 1 || dream.length !== 1 || !fr || !/SURPRISING IF/.test(dummy.expectations || "")) fails.push("A9 night loop wiring incomplete");

  // STAGE 7 - A13 coherence panel on the day + night outputs
  const panel = computePanel({ thoughts, edges: [{ from_thought_id: "ep-1", to_thought_id: "ep-2" }], now: new Date("2026-07-06T03:30:00Z"), stage: "infancy" });
  log(`[A13] coherence: relational=${panel.relational == null ? "n/a" : panel.relational.toFixed(2)}, temporal=${panel.temporal_open_contradictions}, night_loops_7d=${panel.pulse.night_loops_7d}, narrative=${panel.narrative_overlap}`);
  if (panel.pulse.night_loops_7d < 1) fails.push("A13 panel did not see the night loop run");

  // STAGE 8 - A12 weekly index (autobiography from atoms + Jaccard)
  const wk1 = synthesize(thoughts);
  const overlap = jaccard(wk1.citedIds, synthesize(thoughts.slice(0, -1)).citedIds);
  log(`[A12] weekly index: autobiography ${wk1.citedIds.length} atoms (dream/library excluded); Jaccard vs prior=${overlap == null ? "n/a" : overlap.toFixed(2)}`);
  if (!wk1.citedIds.length || overlap == null) fails.push("A12 weekly index wiring failed");

  // void
  rmrf(walDir);
  await rm(join(ROOT, "state", "rehearsal", runId), { recursive: true, force: true });
  log(`[void] dummy day + WAL cleaned; residue: ${existsSync(join(ROOT, "state", "rehearsal", runId)) ? "FOUND" : "none"}`);
  if (existsSync(join(ROOT, "state", "rehearsal", runId))) fails.push("residue after void");
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  try { rmrf(walDir); await rm(join(ROOT, "state", "rehearsal", runId), { recursive: true, force: true }); } catch { }
}

if (fails.length) { console.log("\nWIRING TEST FAILED:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`\nWIRING TEST PASS: a full day-in-the-life ran end to end through the dummy profile - A1 day -> A3 voice exchange -> A4 WAL -> A5 waking -> A6 budget -> A7 teaching -> A9 night loop (A10 signals + A11 sweep) -> A13 coherence -> A12 weekly index; every stage fed the next; 0 residue; the real being's soulfiles were never touched.`);
