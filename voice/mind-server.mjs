// mind-server.mjs - A3/W1: the mind server (the invariant organ; VOICE-STACK §3). Text in, streamed
// text out, cached soulfile prefix, speculative OB1 recall, async writeback. PLUGGABLE Claude
// backend (subscription default; D12 amended 2026-07-06). This is the module boundary; W2 wraps it
// in the LiveKit worker (or exposes it as a localhost sidecar). respond() assembles the frozen-prefix
// prompt, (speculatively) recalls from OB1, calls the backend, and writes back a voice episode. The
// per-turn recall runs while the user is mid-sentence in production, so it costs ~0 on the hot path.
import { assemblePrompt, PLACEHOLDER_PREFIX } from "./prompt-assembly.mjs";
import { makeBackend } from "./claude-backend.mjs";

export function mindServer({ backend = makeBackend("subscription"), recall = async () => "", writeback = async () => null, soulPrefix = PLACEHOLDER_PREFIX } = {}) {
  return {
    backend,
    async respond({ userText, sessionContext = "", runId, now = new Date() }) {
      const recallBlock = await recall(userText);            // speculative recall (OB1 vector search)
      const { system, turn } = assemblePrompt({ soulPrefix, sessionContext, recallBlock, userText });
      const r = await backend.respond({ system, turn });      // streamed text out (subscription/claude -p)
      const episode = {
        source_type: "edgeweaver_episode",
        content: `VOICE EXCHANGE\nUser: ${userText}\nEdgeweaver: ${r.text}`,
        metadata: { channel: "voice", rehearsal: true, run_id: runId, audience: "alan", era: "rehearsal", ttft_ms: r.ttftMs, duration_ms: r.durationMs, backend: r.backend, ts: now.toISOString() },
      };
      const written = await writeback(episode);               // async episode writeback (rehearsal-tagged)
      return { text: r.text, ttftMs: r.ttftMs, durationMs: r.durationMs, backend: r.backend, episode: written || episode };
    },
  };
}
