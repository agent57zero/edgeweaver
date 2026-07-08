// night-loop.mjs - A9: full night-loop orchestrator (steps 2-8, 11) per night-loop-contracts.md.
// Steps 1, 9, 10 stay in the lite job. Idempotent per night_loop_run_id (skip a step whose outputs
// already exist), resumable; a step failure logs and continues (only 1->3 and 11 carry hard
// ordering). Deterministic work (2 no-op, 6 importance recalibration) is inline; LLM steps
// (3,4,5,7,8,11) call an INJECTABLE `llm` so the dark verify runs with a stub (no B1, no OB1). The
// `brain` interface is OB1-backed at arming and fixture-backed in the verify. All outputs carry the
// run_id + step + rehearsal tags.
import { sweep } from "../sweep/contradiction-sweep.mjs";

export const STEP_ORDER = ["ingest", "reflect", "feelings", "completion", "importance", "sweep", "dream", "intentions"];

export async function runNight({ brain, llm, runId, now = new Date(), weekly = false, log = () => {}, generation = 0 }) {
  const results = {};
  const alreadyDone = (step) => brain.outputsFor(runId, step).length > 0;
  const mk = (source_type, content, extra) => ({
    source_type, content,
    metadata: { night_loop_run_id: runId, step: extra.step, rehearsal: true, run_id: runId, audience: "alan", generation, ...extra },
  });
  async function step(name, fn) {
    if (alreadyDone(name)) { results[name] = { skipped: true }; return; }
    try {
      results[name] = await fn();
      // idempotency marker for steps that produce no queryable output (2 no-op, 6 recalc, empty 5)
      if (brain.outputsFor(runId, name).length === 0) brain.insert(mk("night_loop_receipt", `step ${name} complete`, { step: name }));
    } catch (e) { results[name] = { error: e.message }; log(`step ${name} failed: ${e.message}`); }
  }

  // 2 - ingest projection queue (no-op until Phase 6 projections)
  await step("ingest", () => ({ ingested: 0, note: "no-op until Phase 6" }));

  // 3 - reflect (1->3: consolidate is the lite job's step 1)
  await step("reflect", async () => {
    const eps = brain.todaysEpisodes();
    const refl = await llm.reflect(eps, brain.recentReflections(3));
    for (const r of refl) brain.insert(mk("interpretation", r.content, { step: "reflect", cited_ids: r.cited_ids }));
    for (const sb of (await llm.selfBeliefs?.(eps)) || []) brain.insert(mk("self_belief", sb.content, { step: "reflect", valid_from: now.toISOString() }));
    if (weekly) { const g = await llm.gremlin(eps); brain.insert(mk("gremlin_report", g.content, { step: "reflect" })); }
    return { reflections: refl.length };
  });

  // 4 - feelings reading (signals computed BEFORE the LLM call; it never invents the numbers)
  await step("feelings", async () => {
    const signals = brain.computeSignals(now);
    const fr = await llm.feelingReading(signals);
    brain.insert(mk("feeling_reading", fr.content, { step: "feelings", signals, moves: fr.moves }));
    return { signals, moves: fr.moves };
  });

  // 5 - completion loops (stale high-salience memories)
  await step("completion", async () => {
    let n = 0;
    for (const m of brain.completionCandidates()) { const l = await llm.completionLoop(m); brain.insert(mk("interpretation", l.content, { step: "completion", about: m.id })); n++; }
    return { processed: n };
  });

  // 6 - importance recalibration (deterministic v1 formula + decay)
  await step("importance", () => ({ updated: brain.recalibrateImportance(now) }));

  // 7 - coherence sweep (contradiction sweep + orphan edges + panel metrics)
  await step("sweep", async () => {
    const s = sweep({ beliefs: brain.activeSelfBeliefs(), judge: llm.polarityJudge, now });
    const edges = brain.orphans().map((o) => ({ from: o.id, to: brain.nearestNeighbor(o)?.id })).filter((e) => e.to);
    brain.insert(mk("metrics", JSON.stringify({ closed: s.closed.length, flagged: s.flagged.length, false_positives: s.falsePositives.length, orphan_edges: edges.length }), { step: "sweep" }));
    return { closed: s.closed.length, flagged: s.flagged.length, orphanEdges: edges.length };
  });

  // 8 - dream (exactly one, fiction, <=300 words)
  await step("dream", async () => {
    const d = await llm.dream(brain.sampleForDream(6));
    brain.insert(mk("dream", d.content, { step: "dream", fiction: true }));
    return { dreamWords: d.content.trim().split(/\s+/).length };
  });

  // 11 - intentions + expectations (last; hard ordering)
  await step("intentions", async () => {
    const out = await llm.intentions({ commitments: brain.openCommitments(), calendar: brain.calendar() });
    brain.writeExpectations(out.expectations_md);
    brain.insert(mk("intention", out.intention, { step: "intentions" }));
    return { expectationsWritten: true };
  });

  return { runId, steps: results, order: STEP_ORDER };
}
