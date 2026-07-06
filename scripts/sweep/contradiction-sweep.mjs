// contradiction-sweep.mjs - A11: self_belief contradiction sweep (night-loop step 7;
// coherence-queries.sql). Candidate pairs = active self_beliefs with cosine similarity > threshold
// (0.80 starting point). An INJECTABLE polarity judge decides whether a pair actually conflicts;
// on a real conflict, close the OLDER belief (valid_to = now), or FLAG for Alan when both seem true
// (an acknowledged, held tension is health, D9). Every false positive (similar but compatible) is
// logged so the heuristic can be tuned. The injectable judge keeps the dark verify LLM-free; at
// arming, judge = a Claude CLI polarity call and beliefs come from OB1.
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// sweep({beliefs, judge, now, threshold}) -> {closed, flagged, falsePositives, checked, candidates}
// judge(a, b) => { conflict:boolean, both_true:boolean, reason:string }
export function sweep({ beliefs, judge, now = new Date(), threshold = 0.80 }) {
  const closed = [], flagged = [], falsePositives = [];
  const isActive = (x) => !x.valid_to;
  // only embedded beliefs are comparable; an un-embedded belief (freshly written, not yet embedded)
  // is skipped this run and picked up once the embed backfill has run.
  const active = beliefs.filter((b) => isActive(b) && Array.isArray(b.embedding) && b.embedding.length);

  const pairs = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const sim = cosineSim(active[i].embedding, active[j].embedding);
      if (sim > threshold) pairs.push({ a: active[i], b: active[j], sim });
    }
  }
  pairs.sort((p, q) => q.sim - p.sim);

  let checked = 0;
  for (const { a, b, sim } of pairs) {
    if (!isActive(a) || !isActive(b)) continue; // one was already closed earlier this run
    checked++;
    const v = judge(a, b) || {};
    if (v.conflict && !v.both_true) {
      const older = new Date(a.valid_from) <= new Date(b.valid_from) ? a : b;
      const newer = older === a ? b : a;
      older.valid_to = now.toISOString();
      closed.push({ id: older.id, superseded_by: newer.id, sim, reason: v.reason });
    } else if (v.conflict && v.both_true) {
      flagged.push({ a: a.id, b: b.id, sim, reason: v.reason });
    } else {
      falsePositives.push({ a: a.id, b: b.id, sim, reason: v.reason || "similar but compatible" });
    }
  }
  return { closed, flagged, falsePositives, checked, candidates: pairs.length };
}
