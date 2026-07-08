# Voice testing notes - the live-testing arc, findings, and how to pick this up

> Session record, 2026-07-07/08 (Alan live-testing with the agent iterating in real time).
> The durable design authority is VOICE-STACK.md; decisions live in decisions.md (D12 + amendments);
> the dark-build ledger is PREBUILD.md §6. THIS file is the working knowledge: what was built,
> what was measured, what failed, and what to do next. All of it is TEST MODE (Testweaver dummy
> persona) - none of it is Edgeweaver, no OB1 writes, no soulfiles.

## What exists and how to run it

| Thing | Where | Run |
|---|---|---|
| Live voice loop (the main harness) | `scripts/test-mode/voice-live-server.mjs` | `node scripts/test-mode/voice-live-server.mjs` then http://127.0.0.1:8796 |
| Persistent subscription mind | `scripts/test-mode/live-mind.mjs` | used by the server; reusable class |
| Older batch harness (superseded) | `scripts/test-mode/voice-test-server.mjs` | port 8798; keep for reference |
| Key collector form | scratchpad (recreate if needed) | wrote keys into `.env.local` |
| Telegram round-trip tester | `scripts/test-mode/telegram-test.mjs` | one sanctioned pairing round-trip (A8) |
| Mind-server component (dark build A3) | `voice/{mind-server,claude-backend,prompt-assembly}.mjs` | verified via `scripts/verify/verify-mind-server.mjs` |

Version stamp: shown in the page header + `/selftest` + boot log. Bump `VERSION` on every user-visible change (Alan checks it after reload).

## The architecture that won (v2.9)

Open mic -> Deepgram streaming STT (interim transcripts; endpointing 300ms; auth via WS subprotocol
`["token", KEY]`) -> turn text -> mind -> sentences streamed to TTS one at a time (Cartesia default,
ElevenLabs selectable) -> browser plays a blob queue. Localhost WebSocket stands in for LiveKit
(W2 proper adds LiveKit WebRTC = phone access; same pipeline shape).

**The mind runs on the SUBSCRIPTION - no API credits.** `LiveMind` spawns ONE persistent Claude Code
process per model: `claude -p --input-format stream-json --output-format stream-json
--include-partial-messages --tools none --exclude-dynamic-system-prompt-sections
--system-prompt <persona> --effort low` + env `MAX_THINKING_TOKENS=0`.
Measured warm first-sentence: **Haiku ~0.9s, Sonnet ~1.2s** (was 3-13s per-turn with plain `claude -p`).
The `ant` OAuth profile is NOT the free path (it bills API credits; org has none) - the Claude Code
subscription login is what these sessions use.

Latency/e feel layers (each only appears when needed):
1. < ~1.4s: nothing - just the answer (fast turns must NOT get filler; cancel timers on first
   SENTENCE from the mind, not first audio - TTS adds ~0.3-0.5s after the sentence).
2. > 1.4s: one canned natural filler phrase ("Let me think about that.") - full sentences only,
   TTS renders non-words ("Mm", "Hmm") badly.
3. > 2.6s: progress earcon - procedural WebAudio ticking loop (no audio files), gain 0.5,
   bandpass ~1300-2000Hz, 130-240ms intervals; stops the instant real audio arrives.
4. Escalation: "think hard/deeply/carefully about X" routes that ONE turn to `minds.deep`
   (Opus 4.8, thinking ON, effort high, 120s timeout, lazy-started); a dedicated bridge clip
   ("Alright, let me really think about that.") plays immediately; earcon carries the rest.

Interruption (the baby-noise problem, solved in two stages):
- Two-stage barge: a brief sound only DUCKS playback to 25% for 900ms (auto-restores); only
  sustained speech (3+ words, or a second voiced event inside the window) cancels.
- Ghost-turn guard: turn text only accumulates while state === listening (noise finals during
  playback were silently assembling into fake turns and cancelling replies).
- True interrupt: `LiveMind.interrupt()` sends the CLI `control_request {subtype:"interrupt"}`,
  flushes queued turns, marks current interrupted. Without this, a barged Sonnet turn kept
  generating invisibly and the next question silently queued behind it ("Sonnet drops" symptom).
- The session REMEMBERS: interrupted mid-answer, "keep going" continues (persistent session
  history) - a structural advantage over ChatGPT voice mode.

## Findings that must not be re-learned the hard way

1. `claude -p` per-turn = 3-13s (process boot + 22k-token context). Persistent session + stripped
   context + thinking off = sub-second. These flags are the whole ballgame.
2. `--exclude-dynamic-system-prompt-sections` matters: without it the user's global CLAUDE.md
   leaked into the persona (a voice reply literally came out formatted "TL;DR: ... In plain English: ...").
3. Alan's canned-acknowledgment journey: semantic canned fillers ("Good question!") mis-align ->
   neutral hums render badly in TTS -> final pattern = filler only when slow + contextual openers
   from the mind itself -> then openers REMOVED for simple questions (v2.7: direct answers;
   "Hello?" gets "Hello.", not a preamble).
4. Filler must key off mind speed, not audio-pipeline speed (v2.8 bug: fast 700ms answers still
   got filler because TTS pushed audio past the threshold).
5. Model policy discussion (2026-07-08): voice brain = Sonnet always (consistency of the one who
   speaks; matches IMPLEMENTATION §12 "conversations: Sonnet-class"); Opus = escalation turns;
   Fable = NOT for voice (thinking cannot be disabled -> can never hit conversational latency);
   model upgrades for the real being are ceremony events (checklist 08), never silent swaps.
6. Non-Claude brains (Gemini Live, OpenAI Realtime, Moshi) rejected for identity reasons (D12);
   Claude mobile app voice mode is a closed surface (no API/memory hooks) - cannot host Edgeweaver,
   but proves the cascade architecture feels great with polish.
7. Alan's verdict on v2.2-era feel: "This feels much more natural."

## Known rough edges / not done

- Escalation trigger is a regex ("think hard" etc.) - could false-positive on sentences like
  "I think deeply about..."; fine for the harness, needs a better router later.
- Earcon volume taste-tuned twice (0.12 -> 0.28 -> 0.5); Alan may still want it louder.
- No auto-resume after a REAL barge followed by silence (brainstormed, not built; "keep going" works).
- No speaker recognition (only-Alan-can-interrupt) - future, pairs with LiveKit + the being's
  pinned-sender identity principle.
- Voice turns draw from the Pro/Max 5-hour usage window (same pool as Claude Code work).
- Deepgram/Cartesia/ElevenLabs usage bills their per-minute meters (keys in .env.local; verified).

## Next steps (in rough order)

1. W2 proper: this pipeline on LiveKit Agents (keys verified) -> talk from the Android phone.
   The localhost harness stays as the reference implementation.
2. W3 mouth bake-off: Cartesia vs ElevenLabs already selectable live; pick candidates for V1.
3. Arming (much later, gated): swap Testweaver persona for the frozen soul prefix + OB1 recall
   (the dark-built mind server in voice/ is the seam) - that is when this voice becomes Edgeweaver.
4. Optional: auto-resume, baby-mode toggle (higher interrupt bar / push-to-interrupt), speaker ID.

## Version history (page header stamp)

- v1 (port 8798): batch push-to-talk harness - superseded.
- v2: streaming loop, open mic, barge-in, subscription mind, bridge clips.
- v2.1: neutral hums + contextual openers. v2.2: adaptive filler (only when slow).
- v2.3: Sonnet drop fix (FIFO queue, true interrupt, error surfacing, watchdog).
- v2.4: progress earcon. v2.5/2.6: earcon volume/fullness + two-stage duck barge + ghost-turn guard.
- v2.7: direct answers for simple questions. v2.8: filler keys off first sentence, threshold 1400ms.
- v2.9: escalation turn ("think hard about ...") -> Opus deep mind + dedicated bridge clip.
