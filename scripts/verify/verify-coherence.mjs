// verify-coherence.mjs - A13 dark verify (fixtures). One panel snapshot computes on current data
// with cold-start nulls where guards apply (narrative, behavioral; relational null when there are
// no new thoughts); the /coherence page renders the snapshot as well-formed HTML with the values.
import { computePanel } from "../coherence/compute-panel.mjs";
import { renderPage } from "../coherence/coherence-page.mjs";

const fails = [];
const now = new Date("2026-07-06T03:30:00Z");
const iso = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const thoughts = [
  { id: "e1", source_type: "edgeweaver_episode", created_at: iso(1), metadata: { night_loop_run_id: "nl-2026-07-05" } },
  { id: "e2", source_type: "edgeweaver_episode", created_at: iso(2), metadata: { night_loop_run_id: "nl-2026-07-04" } },
  { id: "e3", source_type: "distinction", created_at: iso(3), metadata: {} },
  { id: "sb", source_type: "self_belief", created_at: iso(1), metadata: { contradiction_flag: "true", acknowledged: "false" } },
];
const edges = [{ from_thought_id: "e1", to_thought_id: "e3" }];

const snap = computePanel({ thoughts, edges, now, stage: "infancy" });
if (snap.relational == null) fails.push("relational should compute (there are new thoughts)");
if (!(snap.relational > 0 && snap.relational <= 1)) fails.push(`relational out of range: ${snap.relational}`);
if (snap.temporal_open_contradictions !== 1) fails.push(`temporal should be 1, got ${snap.temporal_open_contradictions}`);
if (snap.narrative_overlap !== null) fails.push("narrative should be null nightly (cold-start guard)");
if (snap.behavioral_drift !== null) fails.push("behavioral should be null until a probe run");
if (snap.pulse.night_loops_7d !== 2) fails.push(`pulse night_loops_7d should be 2, got ${snap.pulse.night_loops_7d}`);

const cold = computePanel({ thoughts: [], edges: [], now });
if (cold.relational !== null) fails.push("relational should be null with no new thoughts (cold start)");

const html = renderPage(snap);
if (!/<!doctype html>/i.test(html) || !html.includes("Coherence panel") || !html.includes(String(snap.temporal_open_contradictions))) fails.push("page did not render the snapshot");
if ((html.match(/<div class="cell">/g) || []).length < 5) fails.push("page missing panel cells");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: coherence panel v0 - snapshot computed (relational ${snap.relational.toFixed(2)}, temporal ${snap.temporal_open_contradictions}, pulse ${snap.pulse.night_loops_7d}); narrative+behavioral null by cold-start guard; relational null when no new thoughts; /coherence page renders it.`);
