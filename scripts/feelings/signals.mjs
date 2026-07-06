// signals.mjs - A10: the four feeling-signal computations (night-loop step 4 inputs). All
// DETERMINISTIC and computed BEFORE the LLM call; the model interprets the numbers it is given
// and never invents them (night-loop-contracts step 4). Directional, not precise.
//   anger   = count(boundaries.overrides_log last 7d where by=external AND gate_decline=false)
//   sadness = count(commitments open AND past due); renegotiated != overdue
//   fear    = novelty of upcoming calendar vs historical episodes (0-1); null until >=50 episodes
//   joy     = experiments positive-outcome rate; fallback = completed-loop rate when no experiments

export function angerSignal(boundaries, now = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000;
  return (boundaries?.overrides_log || []).filter(
    (o) => o.by === "external" && o.gate_decline === false && o.date && new Date(o.date).getTime() >= weekAgo
  ).length;
}

export function sadnessSignal(commitments, now = new Date()) {
  return (commitments?.commitments || []).filter(
    (c) => c.status === "open" && c.due && new Date(c.due).getTime() < now.getTime()
  ).length;
}

function cosineDist(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) || 1); // 0 identical .. 2 opposite
}

// items/history: [{embedding:[...]}]. Cold-start guard: null until >=50 episodes (below that,
// everything is "novel" and the signal is noise).
export function fearSignal(items, history, episodeCount) {
  if ((episodeCount ?? history.length) < 50) return null;
  if (!items.length || !history.length) return 0;
  let maxNovelty = 0;
  for (const it of items) {
    let minDist = Infinity;
    for (const h of history) minDist = Math.min(minDist, cosineDist(it.embedding, h.embedding));
    maxNovelty = Math.max(maxNovelty, minDist);
  }
  return Math.max(0, Math.min(1, maxNovelty));
}

// experiments: [{outcome:'positive'|'negative'|...}]; completedLoops: {completed, total}
export function joySignal(experiments, completedLoops) {
  if (experiments && experiments.length) {
    return experiments.filter((e) => e.outcome === "positive").length / experiments.length;
  }
  if (completedLoops && completedLoops.total) return completedLoops.completed / completedLoops.total;
  return 0;
}

// All four, for night-loop step 4 (numbers handed to the interpreter).
export function computeAll({ boundaries, commitments, calendar, history, episodeCount, experiments, completedLoops, now }) {
  return {
    anger: angerSignal(boundaries, now),
    sadness: sadnessSignal(commitments, now),
    fear: fearSignal(calendar || [], history || [], episodeCount ?? (history?.length || 0)),
    joy: joySignal(experiments, completedLoops),
  };
}
