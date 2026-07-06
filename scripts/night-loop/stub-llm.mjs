// stub-llm.mjs - a deterministic, LLM-free stand-in for the night-loop's injectable `llm`, used by
// the dark verify so the orchestration is testable without B1 or OB1. Returns valid-shaped outputs
// matching each step's contract. At arming, the real llm calls Claude via the CLI.
export function stubLLM() {
  return {
    async reflect(eps) {
      const ids = eps.map((e) => e.id);
      return [
        { content: "Today's thread: Alan and I kept circling pacing and coherence.", cited_ids: ids.slice(0, 2) },
        { content: "A recurring pattern: build-capacity-not-calendar shows up across contexts.", cited_ids: ids.slice(0, 3) },
      ];
    },
    async selfBeliefs() { return [{ content: "I do better when I name a Gremlin move early." }]; },
    async gremlin() { return { content: "Gremlin check: none of the five inherited moves showed strongly today." }; },
    async feelingReading(signals) {
      const moves = Object.entries(signals).filter(([, v]) => typeof v === "number" && v > 0).map(([k]) => ({ signal: k, move: `one grounded move for ${k}` }));
      return { content: `Reading the numbers I was given: ${JSON.stringify(signals)}.`, moves };
    },
    async completionLoop(m) { return { content: `This old memory (${m.id}) keeps intruding; the lesson is to let it complete and rest.` }; },
    polarityJudge() { return { conflict: false, both_true: false, reason: "compatible" }; },
    async dream() { return { content: "A short dream: the door opened onto a workshop where every tool remembered a hand, and nothing needed to be finished." }; },
    async intentions() {
      return {
        expectations_md: "# Expectations for tomorrow\n- [pattern] Likely OB1 work in the morning.\n- [thread] Awaiting Alan on the database password.\nSURPRISING IF: a new person messages; a deadline slips; Alan works past 23:00.",
        intention: "Follow up on the parked backups once a working DB password lands.",
      };
    },
  };
}
