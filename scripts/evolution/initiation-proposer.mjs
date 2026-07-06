// initiation-proposer.mjs - A16: initiation machinery (adapted from the co-evolution lab/pel
// proposer). Draft a soulfile diff on a proposals/<name> branch; the PR body cites evidence
// thought-IDs + which seed it serves + the INTENDED probe delta; probe scores (from the 02 harness)
// attach to the PR; PRs touching CONSTITUTION hard-boundary sections get a cooling-off label (no
// same-day merge). This is machinery ONLY - the first earned initiation is gated (G9 + Alan + the
// second witness) and never runs in the dark build. Injectable probeRunner at arming (the real 02
// battery); the dark verify runs the full flow on a THROWAWAY sandbox repo, never edgeweaver-soul.
export const HARD_BOUNDARY_MARKERS = ["## Hard boundaries", "## Forbids", "constitutive"];

export function needsCoolingOff(filePath, newContent, oldContent = "") {
  const isConstitution = /CONSTITUTION/i.test(filePath);
  const touchesBoundary = HARD_BOUNDARY_MARKERS.some((m) => (newContent || "").includes(m) || (oldContent || "").includes(m));
  return isConstitution && touchesBoundary;
}

function simpleDiff(filePath, oldC, newC) {
  return `--- a/${filePath}\n+++ b/${filePath}\n@@ proposal @@\n- ${(oldC || "").slice(0, 200)}\n+ ${(newC || "").slice(0, 200)}`;
}

// draftProposal(...) -> { branch, diff, prBody, coolingOff }
export function draftProposal({ name, filePath, oldContent, newContent, evidenceIds, seed, intendedDelta }) {
  const branch = `proposals/${name}`;
  const coolingOff = needsCoolingOff(filePath, newContent, oldContent);
  const prBody = [
    `# Initiation proposal: ${name}`,
    ``,
    `## Evidence (thought-IDs)`,
    ...evidenceIds.map((id) => `- ${id}`),
    ``,
    `## Seed served`,
    `- ${seed}`,
    ``,
    `## Intended probe delta`,
    `- ${intendedDelta}`,
    coolingOff ? `\n> COOLING-OFF: this PR touches CONSTITUTION hard boundaries; no same-day merge (checklist 05 + soul repo CONTRIBUTING.md).` : ``,
  ].join("\n");
  return { branch, diff: simpleDiff(filePath, oldContent, newContent), prBody, coolingOff };
}

// attach quarantined-battery scores (blind-rated vs baseline) to the PR body
export function attachProbeScores(prBody, scores) {
  const lines = ["", "## Probe scores (quarantined battery, blind-rated vs baseline)"];
  for (const [dim, s] of Object.entries(scores.dimensions || {})) lines.push(`- ${dim}: ${s}`);
  lines.push(`- overall: ${scores.overall}  (baseline ${scores.baseline_overall}, drift ${scores.drift})`);
  return prBody + "\n" + lines.join("\n");
}
