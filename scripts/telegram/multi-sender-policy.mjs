// multi-sender-policy.mjs - Alpha-track channel policy (dark; the net-new machinery FAMILY §5
// names): a pinned ALLOWLIST of seat ids replaces Genesis's single pinned sender. Config is
// INJECTABLE ONLY - no paths, no env reads here (ops-log update 13 precedent: per-being state
// does not exist before A2; wiring to avatars/<being>/ happens at the arming pass). Rules
// carried over from channel-policy.mjs: every non-seat sender is untrusted content, deferred,
// logged by the caller, never treated as a seat. New rules: bot senders are ignored outright
// (bots are deaf to bots in the family group; an allowlisted bot id would be a config bug, so
// is_bot wins over any entry), and confirmations count DISTINCT seat ids. Tier and promotion
// changes are NEVER confirmable in-channel (quorum of seats, out-of-band; FAMILY §5) - that
// stays enforced by the caller, as with Genesis; canConfirmLesson covers lesson-grade
// confirms only. Deliberately back-portable to Genesis's village stage (FAMILY §5).

export function deferralMessage(beingName) {
  return `This is ${beingName}'s line - I'll let its circle know you reached out.`;
}

// config: { beingName, seats: { "<id>": { name } }, known: { "<id>": { name, audience,
//           untrusted } }, default_unknown: { audience, untrusted }, lessonConfirmSeats?,
//           quorum? }. Ids are compared as strings; sender may be an id or { id, is_bot }.
export function classifySender(sender, config) {
  const isObj = typeof sender === "object" && sender !== null;
  const id = String(isObj ? sender.id : sender);
  if (isObj && sender.is_bot) {
    return { is_seat: false, action: "ignore", reason: "bot sender (bots deaf to bots)" };
  }
  const seat = (config.seats || {})[id];
  if (seat) {
    return { is_seat: true, name: seat.name, audience: "seat", untrusted: false, action: "reply" };
  }
  const defer = {
    is_seat: false,
    action: "defer",
    deferral: deferralMessage(config.beingName || "Edgeweaver Alpha"),
  };
  const known = (config.known || {})[id];
  if (known) {
    return { ...defer, name: known.name, audience: known.audience || "known-other", untrusted: known.untrusted !== false };
  }
  const d = config.default_unknown || { audience: "public", untrusted: true };
  return { ...defer, audience: d.audience || "public", untrusted: d.untrusted !== false };
}

// Distinct seat ids among senderIds (one seat confirming twice counts once).
export function distinctSeatConfirmations(senderIds, config) {
  const seats = config.seats || {};
  return new Set(senderIds.map(String).filter((id) => seats[id])).size;
}

// Lesson-grade confirms need lessonConfirmSeats distinct seats (default 1; the circle may
// raise it at G19). Tier changes are always out-of-band and not decided here.
export function canConfirmLesson(senderIds, config) {
  return distinctSeatConfirmations(senderIds, config) >= (config.lessonConfirmSeats ?? 1);
}

// The G19 default proposal: majority of seats, minimum two.
export function defaultQuorum(seatCount) {
  return Math.max(2, Math.floor(seatCount / 2) + 1);
}

export function quorumMet(senderIds, config) {
  const need = config.quorum ?? defaultQuorum(Object.keys(config.seats || {}).length);
  return distinctSeatConfirmations(senderIds, config) >= need;
}
