// channel-policy.mjs - A8 Telegram channel policy (dark; unpaired). Pinned-sender enforcement
// (PLAN §7; checklist 03): ONLY the pinned Alan id is treated as Alan (audience=alan, is_confirmer);
// every other sender is untrusted content, gets a brief deferral, is logged, and is NEVER treated
// as Alan. Audience is Alan-only until the village opens in childhood (GROWING §3). Tier-changing
// confirmations additionally require out-of-band confirmation (a Claude Code session), not this
// channel - enforced by the caller; canConfirmLesson only covers the pinned-confirmer gate.
export const DEFERRAL_MESSAGE = "This is Edgeweaver's line - I'll let Alan know you reached out.";

export function classifySender(senderId, interlocutors) {
  const map = interlocutors?.telegram || {};
  const entry = map[String(senderId)];
  if (entry && entry.audience === "alan") {
    return { is_alan: true, audience: "alan", is_confirmer: !!entry.is_confirmer, untrusted: false, action: "reply" };
  }
  if (entry) {
    return { is_alan: false, audience: entry.audience || "known-other", is_confirmer: false, untrusted: !!entry.untrusted, action: "defer", deferral: DEFERRAL_MESSAGE };
  }
  const d = interlocutors?.default_unknown || { audience: "public", untrusted: true };
  return { is_alan: false, audience: d.audience || "public", is_confirmer: false, untrusted: d.untrusted !== false, action: "defer", deferral: DEFERRAL_MESSAGE };
}

// Lesson confirmations accepted only from a pinned is_confirmer sender (tier changes need the
// additional out-of-band channel, handled by the caller).
export function canConfirmLesson(senderId, interlocutors) {
  const c = classifySender(senderId, interlocutors);
  return c.is_alan && c.is_confirmer;
}
