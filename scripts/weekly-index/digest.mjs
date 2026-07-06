// digest.mjs - A12: Alan's weekly spot-check digest (top-10 most-retrieved memories + the week's
// night-loop outputs, one-tap confirm/flag). Delivery is a NO-OP until the channel arms at Phase 3
// (dark rule 4: no live channel). build() assembles the digest; deliver() logs until the channel is
// armed, then sends via the provided sender.
export function buildDigest({ retrievedTop, nightOutputs }) {
  return {
    top_retrieved: (retrievedTop || []).slice(0, 10).map((m) => ({ id: m.id, summary: (m.content || "").slice(0, 100), retrievals: m.retrievals })),
    night_outputs: (nightOutputs || []).map((o) => ({ id: o.id, type: o.source_type, step: o.metadata?.step })),
    actions: ["confirm", "flag"],
  };
}

export async function deliver(digest, { channelArmed = false, send } = {}) {
  if (!channelArmed) return { delivered: false, reason: "channel not armed (Phase 3); digest built but not sent" };
  return { delivered: true, result: await send(digest) };
}
