// evidence-cluster.mjs - A15: evidence clustering (checklist 05). Find confirmed lessons/practices
// cited >= N times (start N=5) via recall traces -> candidate amendment themes with thought-IDs +
// citation counts. Clusters by a theme key; at arming, theme grouping can use embedding similarity.
// Only CONFIRMED memories qualify (an amendment must rest on confirmed evidence). DARK: counts
// citations from synthetic recall traces.
export function clusterEvidence(recallTraces, memories, N = 5) {
  const counts = new Map();
  for (const tr of recallTraces) {
    for (const item of tr.items || []) {
      if (item.used === false) continue; // ignored retrievals do not count as evidence
      counts.set(item.memory_id, (counts.get(item.memory_id) || 0) + 1);
    }
  }
  const memById = new Map(memories.map((m) => [m.id, m]));
  const qualifying = [...counts.entries()]
    .filter(([id, c]) => c >= N && memById.get(id)?.confirmed)
    .map(([id, c]) => ({ id, count: c, theme: memById.get(id).theme || "untagged", content: memById.get(id).content }));

  const byTheme = {};
  for (const q of qualifying) (byTheme[q.theme] ||= []).push(q);
  return Object.entries(byTheme)
    .map(([theme, items]) => ({ theme, thoughtIds: items.map((i) => i.id), citations: items.reduce((s, i) => s + i.count, 0), members: items.length }))
    .sort((a, b) => b.citations - a.citations);
}
