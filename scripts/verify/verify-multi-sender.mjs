// verify-multi-sender.mjs - dark verify for the Alpha-track multi-sender channel policy
// (fixtures only; no token, no paths, no live channel). The five-seat fixture mirrors the
// G19 candidate roster shape; ids are synthetic. PASS/FAIL; exit 0/1.
import {
  classifySender,
  canConfirmLesson,
  distinctSeatConfirmations,
  defaultQuorum,
  quorumMet,
  deferralMessage,
} from "../telegram/multi-sender-policy.mjs";

const fails = [];
const config = {
  beingName: "Edgeweaver Alpha",
  seats: {
    "111": { name: "Alan" },
    "222": { name: "Ali" },
    "333": { name: "Tamara" },
    "444": { name: "Natalie" },
    "555": { name: "Charlotte" },
  },
  known: { "666": { name: "villager" } },
  default_unknown: { audience: "public", untrusted: true },
};

// every seat is reply-eligible and trusted
for (const id of Object.keys(config.seats)) {
  const c = classifySender(id, config);
  if (!c.is_seat || c.action !== "reply" || c.untrusted) fails.push(`seat ${id} not reply-eligible`);
}
// known non-seat defers, with the being-named line
const known = classifySender("666", config);
if (known.is_seat || known.action !== "defer" || known.deferral !== deferralMessage("Edgeweaver Alpha"))
  fails.push("known non-seat not deferred with Alpha's line");
// unknown defers untrusted
const unknown = classifySender("999", config);
if (unknown.is_seat || unknown.action !== "defer" || !unknown.untrusted) fails.push("unknown sender not deferred+untrusted");
// bot senders are ignored, even on an allowlisted id (config-bug guard)
if (classifySender({ id: "777", is_bot: true }, config).action !== "ignore") fails.push("bot sender not ignored");
if (classifySender({ id: "222", is_bot: true }, config).action !== "ignore") fails.push("allowlisted bot id not ignored (is_bot must win)");
// confirmations count DISTINCT seats
if (distinctSeatConfirmations(["222", "222", "999"], config) !== 1) fails.push("distinct-seat count wrong");
if (!canConfirmLesson(["222"], config)) fails.push("single seat cannot lesson-confirm at default");
if (canConfirmLesson(["999"], config)) fails.push("non-seat able to lesson-confirm");
const twoSeat = { ...config, lessonConfirmSeats: 2 };
if (canConfirmLesson(["222", "222"], twoSeat)) fails.push("same seat twice passed a 2-seat confirm");
if (!canConfirmLesson(["222", "333"], twoSeat)) fails.push("two distinct seats failed a 2-seat confirm");
// quorum math: majority of seats, minimum two; 5 seats -> 3
if (defaultQuorum(5) !== 3 || defaultQuorum(3) !== 2 || defaultQuorum(2) !== 2) fails.push("defaultQuorum math wrong");
if (quorumMet(["111", "222"], config)) fails.push("2 of 5 wrongly met quorum");
if (!quorumMet(["111", "222", "333"], config)) fails.push("3 of 5 failed quorum");

if (fails.length) {
  console.log("FAIL:\n - " + fails.join("\n - "));
  process.exit(1);
}
console.log(
  "PASS: multi-sender policy (dark, fixtures) - seats reply, non-seats deferred untrusted with Alpha's line, bots ignored, confirms count distinct seats, majority-min-two quorum math holds."
);
