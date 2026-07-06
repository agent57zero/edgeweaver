// compute-panel.mjs - A13: coherence panel v0. Nightly-compute the five signals (logic from
// templates/coherence-queries.sql) into a state/coherence.json snapshot + a metrics thought. Cold-
// start guards return null (not a number) where history is too thin - a null is honest, a fake
// number is noise (D9). Thresholds per GROWING §6 by stage are applied by the reader, not here.
// DARK: computes from a provided thought + edge set; OB1 at arming.
export function computePanel({ thoughts, edges = [], now = new Date(), stage = "infancy", narrativeOverlap = null, behavioralDrift = null, weeklyIndexRan = false }) {
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000;
  const experienced = new Set(["edgeweaver_episode", "distinction", "experiment"]);
  const newThoughts = thoughts.filter((t) => experienced.has(t.source_type) && t.created_at && new Date(t.created_at).getTime() >= weekAgo);

  // relational: fraction of the week's new thoughts that acquired >=1 edge (null if none - cold start)
  const linked = new Set();
  for (const e of edges) { linked.add(e.from_thought_id); linked.add(e.to_thought_id); }
  const relational = newThoughts.length === 0 ? null : newThoughts.filter((t) => linked.has(t.id)).length / newThoughts.length;

  // temporal: UNINTEGRATED contradictions among active self-beliefs (acknowledged tension is health)
  const temporal = thoughts.filter((t) => t.source_type === "self_belief" && !t.metadata?.valid_to && t.metadata?.contradiction_flag === "true" && (t.metadata?.acknowledged || "false") === "false").length;

  // pulse: distinct night_loop_run_id in the last 7 days
  const runs = new Set();
  for (const t of thoughts) if (t.created_at && new Date(t.created_at).getTime() >= weekAgo && t.metadata?.night_loop_run_id) runs.add(t.metadata.night_loop_run_id);

  return {
    date: now.toISOString().slice(0, 10),
    stage,
    relational,
    temporal_open_contradictions: temporal,
    narrative_overlap: narrativeOverlap, // null nightly; the weekly index job fills it
    behavioral_drift: behavioralDrift,   // null until the next probe run
    pulse: { night_loops_7d: runs.size, weekly_index: weeklyIndexRan },
  };
}
