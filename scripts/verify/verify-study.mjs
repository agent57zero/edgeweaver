// verify-study.mjs - A14 dark verify (fixtures + stub llm; local, voided). One study run end to end:
// picks an allowlisted pm_teaching only, produces an experiment journal (source_type=experiment)
// with the matrix_code and the four-question Reality Detector footer, rehearsal-tagged.
import { pickTeaching, runStudy, REALITY_DETECTOR } from "../study/study-loop.mjs";

const fails = [];
const library = [
  { source_type: "pm_teaching", matrix_code: "SPARK042", title: "The Box vs the Being" },
  { source_type: "pm_teaching", matrix_code: "SPARK099", title: "not allowlisted" },
];
const allowlist = ["SPARK042"];

const t = pickTeaching(library, allowlist);
if (!t || t.matrix_code !== "SPARK042") fails.push("picker did not pick the allowlisted teaching");
if (pickTeaching(library, allowlist, new Set(["SPARK042"]))) fails.push("picker returned an already-studied/non-allowlisted teaching");

const runId = `nl-rehearsal-study-${Date.now()}`;
const llm = {
  async applyTeaching(te) {
    return {
      experiment_design: `apply ${te.matrix_code} to a real situation today`,
      outcome: "noticed a Box reaction and chose the Being",
      reality_detector: { "What changed?": "I caught the reaction", "Who paid?": "a moment of comfort", "What became possible?": "a truer response", "What was avoided?": "premature coherence" },
    };
  },
};
const journal = await runStudy({ teaching: t, llm, runId });
if (!journal || journal.source_type !== "experiment") fails.push("no experiment journal produced");
if (journal?.metadata.matrix_code !== "SPARK042") fails.push("journal missing matrix_code");
if (journal?.metadata.rehearsal !== true || journal?.metadata.run_id !== runId) fails.push("journal not rehearsal-tagged");
for (const q of REALITY_DETECTOR) if (!journal?.content.includes(q)) fails.push(`Reality Detector missing: ${q}`);

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: study loop - picks allowlisted pm_teaching only; produces a rehearsal-tagged experiment journal with matrix_code + the four-question Reality Detector footer (in-memory, voided).");
