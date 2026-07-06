// verify-teaching.mjs - A7 dark verify. The placeholder emoji stands in until G4; a matching
// reaction flags metadata.teaching_moment=true; a non-matching reaction does nothing; night-loop
// consolidation lifts flagged episodes to candidate lessons. PASS/FAIL; exit 0/1.
import { flagEpisode, liftTeachingMoments, teachingEmoji, TEACHING_EMOJI_PLACEHOLDER } from "../teaching/teaching-hook.mjs";

const fails = [];
const flags = { components: { A7_teaching_hook: {} } }; // no G4 emoji yet -> placeholder
if (teachingEmoji(flags) !== TEACHING_EMOJI_PLACEHOLDER) fails.push("expected placeholder emoji until G4");

const ep = { id: "ep-1", content: "Alan explained why premature coherence is the Gremlin's favorite move.", metadata: {} };
const r = flagEpisode(ep, TEACHING_EMOJI_PLACEHOLDER, flags);
if (!r.changed || ep.metadata.teaching_moment !== true) fails.push("teaching reaction did not flag the episode");

const noop = flagEpisode({ content: "x", metadata: {} }, "😀", flags);
if (noop.changed) fails.push("a non-teaching emoji must not flag");

const lifted = liftTeachingMoments([ep, { id: "ep-2", content: "unmarked", metadata: {} }]);
if (lifted.length !== 1 || lifted[0].from_episode !== "ep-1") fails.push("consolidation did not lift exactly the flagged episode");
if (lifted[0]?.status !== "pending") fails.push("lifted lesson should be pending (never auto-confirmed)");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: teaching hook - placeholder emoji until G4; reaction sets metadata.teaching_moment=true; consolidation lifts flagged episodes to pending candidate lessons.");
