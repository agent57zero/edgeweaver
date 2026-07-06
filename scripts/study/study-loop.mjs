// study-loop.mjs - A14: daily study-loop runner (GROWING Stage 2 curriculum; checklist 04). Pick
// one ALLOWLISTED pm_teaching (SPARK/distinction) -> apply it to itself -> run the small experiment
// -> journal as source_type=experiment with the matrix_code, ending with the Reality Detector footer
// (inherited edge #4, soul-source Q4). pm_teaching is library and never enters episodic recall
// (iron rule 5); only the resulting experiment does. Injectable llm (stub in verify, Claude CLI at
// arming); rehearsal-tagged and voided after a dark run.
export const REALITY_DETECTOR = ["What changed?", "Who paid?", "What became possible?", "What was avoided?"];

// pick the first allowlisted, not-yet-studied pm_teaching
export function pickTeaching(library, allowlist, alreadyStudied = new Set()) {
  return library.find((t) => t.source_type === "pm_teaching" && allowlist.includes(t.matrix_code) && !alreadyStudied.has(t.matrix_code)) || null;
}

export async function runStudy({ teaching, llm, runId, now = new Date() }) {
  if (!teaching) return null;
  const application = await llm.applyTeaching(teaching); // { experiment_design, outcome, reality_detector:{q:answer} }
  const rd = application.reality_detector || {};
  const footer = "\n\n--- Reality Detector ---\n" + REALITY_DETECTOR.map((q) => `${q} ${rd[q] || "(unanswered)"}`).join("\n");
  const content = `STUDY EXPERIMENT on ${teaching.matrix_code}: ${teaching.title || ""}\n${application.experiment_design}\nOutcome: ${application.outcome}${footer}`;
  return {
    source_type: "experiment",
    content,
    metadata: { matrix_code: teaching.matrix_code, rehearsal: true, run_id: runId, audience: "alan", reality_detector: rd, studied_at: now.toISOString() },
  };
}
