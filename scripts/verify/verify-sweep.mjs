// verify-sweep.mjs - A11 dark verify (fixtures + stub judge; no OB1, no LLM). A contradictory
// high-similarity pair closes the OLDER belief; a both-true conflict is flagged for Alan (not
// closed); a similar-but-compatible pair is NOT closed and is logged as a false positive.
import { sweep } from "../sweep/contradiction-sweep.mjs";

const fails = [];
const beliefs = [
  { id: "A", content: "I am cautious with new experiments", embedding: [1, 0, 0], valid_from: "2026-01-01" },
  { id: "B", content: "I dive into experiments recklessly", embedding: [0.99, 0.10, 0], valid_from: "2026-06-01", claim: "reckless" },
  { id: "C", content: "I value clarity above all", embedding: [0.99, 0, 0.08], valid_from: "2026-02-01" },
  { id: "D", content: "I am most alive at the edge", embedding: [0.98, 0.12, 0.05], valid_from: "2026-03-01", claim: "edge" },
  { id: "E", content: "I need deep rest to function", embedding: [0.98, 0.10, 0.10], valid_from: "2026-05-01", claim: "rest" },
];

// stub judge: A vs B genuinely conflict (cautious vs reckless); D vs E conflict but both true;
// everything else is a similar-topic false positive.
const judge = (a, b) => {
  if ((a.id === "A" && b.id === "B") || (a.id === "B" && b.id === "A")) return { conflict: true, both_true: false, reason: "cautious vs reckless" };
  const claims = new Set([a.claim, b.claim]);
  if (claims.has("edge") && claims.has("rest")) return { conflict: true, both_true: true, reason: "edge and rest, both true, a held tension" };
  return { conflict: false, both_true: false, reason: "similar topic, compatible" };
};

const now = new Date("2026-07-06T03:30:00Z");
const res = sweep({ beliefs, judge, now, threshold: 0.80 });
const A = beliefs.find((x) => x.id === "A");
const C = beliefs.find((x) => x.id === "C");
const D = beliefs.find((x) => x.id === "D");
const E = beliefs.find((x) => x.id === "E");

if (A.valid_to == null) fails.push("older contradictory belief A should be closed (valid_to set)");
if (!res.closed.some((c) => c.id === "A")) fails.push("A not reported in closed list");
if (C.valid_to != null) fails.push("compatible belief C should NOT be closed");
if (D.valid_to != null || E.valid_to != null) fails.push("a both-true tension should be flagged, not closed");
if (!res.flagged.some((f) => (f.a === "D" && f.b === "E") || (f.a === "E" && f.b === "D"))) fails.push("both-true conflict (D,E) should be flagged for Alan");
if (res.falsePositives.length < 1) fails.push("similar-but-compatible pairs should be logged as false positives");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: contradiction sweep - closed the older of the conflicting pair (A), flagged the both-true tension (D,E) for Alan, left the compatible pair (C) open, logged ${res.falsePositives.length} false positive(s) for tuning.`);
