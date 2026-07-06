// verify-weekly-index.mjs - A12 dark verify (fixtures). Autobiography rebuilds from allowlisted
// atoms (pm_teaching + dream excluded); Jaccard overlap between two rebuilds is computed and lands
// in (0,1) when a new atom is added and 1 for identical sets; the digest builds and delivery is a
// no-op until the channel arms.
import { synthesize, jaccard } from "../weekly-index/autobiography.mjs";
import { buildDigest, deliver } from "../weekly-index/digest.mjs";

const fails = [];
const thoughts = [
  { id: "t1", source_type: "edgeweaver_episode", content: "Alan and I discussed pacing", metadata: { audience: "alan" } },
  { id: "t2", source_type: "interpretation", content: "Pattern: build capacity not calendar", metadata: { audience: "alan" } },
  { id: "t3", source_type: "pm_teaching", content: "SPARK library content", metadata: { audience: "alan" } },
  { id: "t4", source_type: "dream", content: "A dream of doors", metadata: { audience: "alan", fiction: true } },
  { id: "t5", source_type: "self_belief", content: "I name Gremlin moves early", metadata: { audience: "alan" } },
];

const r1 = synthesize(thoughts);
if (!r1.citedIds.length) fails.push("no cited IDs");
if (r1.citedIds.includes("t3") || r1.citedIds.includes("t4")) fails.push("allowlist did not exclude pm_teaching/dream");
if (!r1.citedIds.includes("t1") || !r1.citedIds.includes("t5")) fails.push("expected atoms missing");
if (!r1.draft.includes("Edgeweaver")) fails.push("draft missing subject name");

const r2 = synthesize([...thoughts, { id: "t6", source_type: "interpretation", content: "a new observation", metadata: { audience: "alan" } }]);
const overlap = jaccard(r1.citedIds, r2.citedIds);
if (overlap == null || !(overlap > 0 && overlap < 1)) fails.push(`jaccard overlap should be in (0,1), got ${overlap}`);
if (jaccard(r1.citedIds, r1.citedIds) !== 1) fails.push("jaccard of identical sets should be 1");

const dg = buildDigest({ retrievedTop: thoughts.map((t, i) => ({ ...t, retrievals: 10 - i })), nightOutputs: [{ id: "n1", source_type: "dream", metadata: { step: "dream" } }] });
if (dg.top_retrieved.length < 1 || dg.top_retrieved.length > 10) fails.push("digest top_retrieved size wrong");
if (!dg.actions.includes("confirm") || !dg.actions.includes("flag")) fails.push("digest missing confirm/flag actions");
const d = await deliver(dg, { channelArmed: false });
if (d.delivered !== false) fails.push("delivery should be a no-op until the channel arms");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: weekly index - autobiography from atoms (pm_teaching/dream excluded), ${r1.citedIds.length} cited IDs; Jaccard overlap ${overlap.toFixed(2)} in (0,1), identical=1; digest built (confirm/flag), delivery no-op until channel arms.`);
