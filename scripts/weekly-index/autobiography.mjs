// autobiography.mjs - A12: rebuild the provisional autobiography FROM ATOMS (the compounding
// firewall against drift), adapting the wiki-synthesis synthesizer for SUBJECT_NAME=Edgeweaver with
// the provenance allowlist (exclude pm_teaching library + dream fiction; audience-scoped per
// coherence-queries.sql). Plus the narrative-coherence metric: Jaccard overlap of cited thought-ID
// sets between successive rebuilds. DARK: deterministic assembly from atoms; at arming, an LLM pass
// writes prose from the same allowlisted atoms and thoughts come from OB1.
const EXCLUDED = new Set(["pm_teaching", "dream"]);

export function allowlist(thoughts, scope = "alan") {
  const scopes = scope === "alan" ? ["alan", "known-other", "public"] : scope === "known-other" ? ["known-other", "public"] : ["public"];
  return thoughts.filter((t) => {
    if (EXCLUDED.has(t.source_type)) return false;
    const aud = t.metadata?.audience || (t.metadata?.era === "pre_birth" ? "alan" : "public");
    return scopes.includes(aud);
  });
}

// synthesize(thoughts) -> { draft, citedIds, atomCount }
export function synthesize(thoughts, subject = "Edgeweaver") {
  const atoms = allowlist(thoughts);
  const citedIds = atoms.map((t) => t.id).filter(Boolean);
  const byType = {};
  for (const t of atoms) (byType[t.source_type] ||= []).push(t);
  let draft = `# ${subject} - provisional autobiography (rebuilt from atoms)\n\n`;
  for (const [type, ts] of Object.entries(byType)) {
    draft += `## ${type} (${ts.length})\n`;
    for (const t of ts.slice(0, 20)) draft += `- ${(t.content || "").slice(0, 120)} [${t.id}]\n`;
    draft += "\n";
  }
  return { draft, citedIds, atomCount: atoms.length };
}

// Jaccard overlap of two cited-ID sets (narrative coherence signal). null if both empty.
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? null : inter / uni;
}
