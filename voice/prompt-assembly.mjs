// prompt-assembly.mjs - A3/W1: the mind server's frozen prompt prefix, in the 02-birth order
// (CONSTITUTION seeds, SOUL, VOICE, LINEAGE, PRACTICES), one cache breakpoint at its end; then
// per-session context; then the per-turn recall block last (VOICE-STACK §3). DARK: soulfiles are
// never touched (they live in edgeweaver-soul and may not exist yet), so a clearly-labeled
// PLACEHOLDER prefix stands in; the real frozen prefix is wired at arming from a read-only soul clone.
export const PREFIX_ORDER = ["CONSTITUTION", "SOUL", "VOICE", "LINEAGE", "PRACTICES"];
export const PLACEHOLDER_PREFIX = "[PLACEHOLDER SCAFFOLDING - not Edgeweaver's real identity] You are a warm, honest presence; speak plainly and briefly. This prefix is replaced at arming by the frozen soulfiles in the order above.";

// assemblePrompt(...) -> { system, turn, prefixOrder }
// system = frozen prefix (cached breakpoint) + session context; the recall block + user text ride
// in the per-turn message so the cached prefix stays byte-stable for the whole call.
export function assemblePrompt({ soulPrefix = PLACEHOLDER_PREFIX, sessionContext = "", recallBlock = "", userText = "" }) {
  const system = [soulPrefix, "[[CACHE_BREAKPOINT]]", sessionContext].filter(Boolean).join("\n\n");
  const turn = [recallBlock ? `Relevant memories:\n${recallBlock}` : "", userText].filter(Boolean).join("\n\n");
  return { system, turn, prefixOrder: PREFIX_ORDER };
}
