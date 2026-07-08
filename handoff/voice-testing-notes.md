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
| Session transcript logs (v3.3) | `logs/voice/<stamp>-<version>.jsonl` (gitignored) | auto-written, one file per conversation |

Version stamp: shown in the page header + `/selftest` + boot log. Bump `VERSION` on every user-visible change (Alan checks it after reload).

## CURRENT STATE (v3.3, 2026-07-08) - READ THIS FIRST

The harness works and feels good. To resume: `node scripts/test-mode/voice-live-server.mjs`, open
http://127.0.0.1:8796, click Start, allow the mic, talk. Header shows the version (currently v3.3).
It is TEST MODE (Testweaver persona) - not Edgeweaver, no memory, no OB1 writes.

What it does now: open-mic streaming voice conversation on the Claude subscription (no API credits),
ONE voice (Sonnet) that escalates to a deeper mind on hard questions, with barge-in, noise-robust
interruption, adaptive filler, and a progress earcon for long thinks. Every conversation writes a
session transcript to `logs/voice/` (see Logging below) - text + timings, never audio.

## The architecture

Open mic -> Deepgram streaming STT (interim transcripts; endpointing 300ms; auth via WS subprotocol
`["token", KEY]`) -> turn text -> mind -> sentences streamed to TTS one at a time (Cartesia default,
ElevenLabs selectable) -> browser plays a blob queue. Localhost WebSocket stands in for LiveKit
(W2 proper adds LiveKit WebRTC = phone access; same pipeline shape).

**The mind runs on the SUBSCRIPTION - no API credits.** `LiveMind` (scripts/test-mode/live-mind.mjs)
spawns ONE persistent Claude Code process per model: `claude -p --input-format stream-json
--output-format stream-json --include-partial-messages --tools none
--exclude-dynamic-system-prompt-sections --system-prompt <persona> --effort <low|high>` + env
`MAX_THINKING_TOKENS=0` for the fast voice (unset for deep minds). Measured warm first-sentence:
Haiku ~0.9s, **Sonnet ~1.2-1.9s** (was 3-13s per-turn with plain `claude -p`). The `ant` OAuth
profile is NOT the free path (it bills API credits; org has none) - the Claude Code subscription
login is what these sessions use.

**One voice + escalation ladder (v3.0-v3.2):** Sonnet is always the talker (consistency of who is
speaking; matches IMPLEMENTATION §12). Escalation, same TTS voice throughout:
- explicit: "think hard about ..." -> Opus (thinking on); "think really hard..."/"ask fable" -> Fable.
- automatic: Sonnet's persona replies the single word ESCALATE when it judges itself outmatched;
  the server swallows the token, plays the deep bridge, and re-runs the turn on Opus.
Escalated minds are each a SEPARATE session (blind to the conversation), so the server keeps a
rolling transcript and prepends recent turns to deep/fable asks (fixes "answer that again").
Every reply is labeled with the mind that answered; escalation shows a purple banner + "deep
thinking" badge. First escalation pays a cold start (earcon covers it).

Latency feel layers (each only appears when needed; thresholds are named constants, tuned for the
Sonnet-only 2-3s reality):
1. fast: nothing - just the answer. Timers cancel on the mind's first SENTENCE, not first audio
   (TTS adds ~0.3-0.5s after the sentence - this distinction was v2.8's bug).
2. > FILLER_AFTER_MS (2.5s): one canned natural filler phrase ("Let me think about that.") - full
   sentences only, TTS renders non-words ("Mm", "Hmm") badly.
3. > WORKING_AFTER_MS (3.5s): progress earcon - procedural WebAudio ticking loop (no audio files),
   gain 0.5, bandpass ~1300-2000Hz, 130-240ms intervals; stops the instant real audio arrives.
   (This is the ChatGPT-style "still working" sound Alan specifically wanted.)

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
5. Model policy (2026-07-08, settled + implemented): voice brain = Sonnet ALWAYS (consistency of
   the one who speaks; matches IMPLEMENTATION §12 "conversations: Sonnet-class"). Harder questions
   ESCALATE to a deeper mind in the same voice rather than swapping the default (Talker-Reasoner):
   Opus for "think hard", Fable for "think really hard". Fable is fine as an ON-DEMAND escalation
   tier (long wait is acceptable because you asked) but must NEVER be the always-on voice - its
   thinking cannot be disabled, so it can't hit conversational latency (Fable warm ~6s+ first word).
   Model upgrades for the real being are ceremony events (checklist 08), never silent swaps.
   COST/SPEED TENSION (open): Sonnet-only feels ~2-3s vs Haiku's ~1s. Two ways to close it, both
   documented and NOT taken this session: (Option A) put Haiku back as the instant front-mind that
   auto-escalates to Sonnet - restores the ~1s feel, trade is the lightest mind answers casual
   turns; (Option B) pipeline optimizations (Cartesia streaming WS ~-300-500ms, tighter endpointing)
   - gets Sonnet to ~1.5-2s. The clean fix is the raw API (~$5 credits): Sonnet first token ~0.5s,
   fast enough to be the single always-mind with no compromise - the config the real voice targets.
6. Non-Claude brains (Gemini Live, OpenAI Realtime, Moshi) rejected for identity reasons (D12);
   Claude mobile app voice mode is a closed surface (no API/memory hooks) - cannot host Edgeweaver,
   but proves the cascade architecture feels great with polish.
7. Alan's verdict on v2.2-era feel: "This feels much more natural."

## Logging / observability (Alan asked; decided + BUILT in v3.3)

BUILT (v3.3, Alan's call on 2026-07-08): the harness writes one JSONL transcript per conversation
to `logs/voice/<yyyymmdd-hhmmss>-<version>.jsonl` (gitignored; local only). Implementation is a
tee on the server's `send()` choke point, so every server->client event lands in the file:
- line 1 `session-start`: version, filler/earcon thresholds, the three mind models, opts.
  v3.4 adds the brain profile here too (EW_BRAIN_PROFILE, resolved at startup; "none" today).
- `mind-session` lines: each mind's Claude Code session id, cross-referencing the raw session
  files under `~/.claude/projects/C--Users-agent-Project-Edgeweaver/` (mind's-eye view, while
  Claude Code retention keeps them).
- then per event: final transcripts (user turns), replies (text + mind label + firstSentenceMs),
  escalations, barges/ducks, filler + earcon firings, TTS/opts switches, errors, session-end.
- deliberately NOT logged: interim transcripts (per-word spam) and audio bytes (bulk + open-mic
  privacy; text and timings answer every tuning question so far).
This turns "it felt slow" into distributions (latency per mind, escalation rate + false fires,
barge frequency) to tune thresholds against, and gives forensics for bugs like the v2.3 "Sonnet
drops". Retention is manual (delete the folder anytime); nothing sensitive leaves the machine.

The REAL Edgeweaver voice (arming, gated) is a SEPARATE concern - memory is already DESIGNED,
and this file log is not it:
   - each voice exchange becomes an OB1 EPISODE via the mind server's writeback (voice/mind-server.mjs,
     dark-built A3) - that IS the memory, and the night loop consolidates it (reflections, feelings,
     coherence). So the "chat log" for Edgeweaver is its autobiography, not a text file.
   - operational events (session start/stop, errors, budget) -> ops-log.md + state/budget.json (A6).
   - the WAL (A4) buffers writes during an OB1 outage so no exchange is lost.
   - audience/provenance tags on every episode (rehearsal vs real, who spoke) - the pinned-sender
     principle, extended to voice; ties into future speaker recognition.
   Net: don't build a bespoke chat-log system for the real being - exchanges flow into OB1 and the
   existing machinery handles retention, consolidation, and audit. When this pipeline is armed, the
   `logs/voice/` file keeps carrying TELEMETRY only (timings, events); conversation content becomes
   OB1 episodes referenced by id, so no shadow memory store ever drifts alongside the brain.

## Known rough edges / not done

- Sonnet-only feels ~2-3s (vs Haiku's ~1s). Not resolved this session - see finding #5 for the two
  documented options + the raw-API fix. This is the main open UX item.
- AUTO-escalation quality is UNMEASURED: Sonnet emitting ESCALATE depends on its self-awareness of
  its own limits; may over- or under-fire. The persona rule is one sentence, easy to tune - the
  v3.3 session log records every escalation, so data accrues from the next live session.
- Escalation trigger is a regex ("think hard" etc.) - could false-positive on "I think deeply
  about..."; fine for the harness, needs a real router later.
- Escalated minds get RECENT transcript, not full session history (each mind is a separate session);
  a long deep back-and-forth would eventually want shared memory - which for the real being is OB1
  itself (every mind reads from it), so this seam gets clean at arming.
- Earcon volume taste-tuned (0.12 -> 0.28 -> 0.5); Alan may still want it louder.
- No auto-resume after a REAL barge followed by silence (brainstormed, not built; "keep going" works
  because the session remembers).
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
- v2.10: visible escalation indicator (purple banner, deep badge, labeled replies). v2.11: live threshold labels.
- v3.0: ONE voice (Sonnet, no mind dropdown). Escalation: explicit ("think hard..." -> Opus; "think really hard..."/"ask fable" -> Fable) AND automatic (Sonnet's persona replies the single word ESCALATE when outmatched; server swallows the token, plays the deep bridge, re-runs on Opus). Barge interrupts all minds. Fixed a literal-backspace bug ( mangled by patch escaping) in ESCALATE_RX.
- v3.1: filler/earcon thresholds 2.5s/3.5s (Sonnet-only runs 2-3s; fillers were firing on normal turns).
- v3.2: two live-testing bug fixes - (a) lazy-started deep minds returned the warmup "ok" as the answer (ask() now starts the session first so the real turn queues behind the warmup); (b) escalated minds were blind to the conversation ("answer that again" failed on a mind that never saw the question) - rolling transcript now prepended to deep/fable turns.
- v3.3: per-session JSONL transcript logs in logs/voice/ (tee on send(): turns, replies + mind labels, timings, barges, escalations, errors; interims skipped, audio bytes stripped; mind Claude-session ids recorded for cross-reference). Page notes the logging; verified live with a WS probe.
- v3.4: JSONL session header + page badge carry the active brain profile (EW_BRAIN_PROFILE resolved via scripts/brains/profiles.mjs, test-mode live-guard stays on; "none" while Testweaver runs memoryless) - completes the D15 attribution triple (code version, mind, brain) in the harness.

## HOW TO RESUME (from a cold session, months later)

1. Read this file + VOICE-STACK.md (design authority) + decisions.md D12 (+ amendments).
2. Run it: `node scripts/test-mode/voice-live-server.mjs` -> http://127.0.0.1:8796 -> Start -> talk.
   `/selftest` on that port confirms the mind works without a mic. Keys are in `.env.local` (verified).
   Past conversations (text + timings) are in `logs/voice/*.jsonl` - read those before re-tuning
   anything. If the port is busy, an older server instance is still running - kill it first.
3. The two files that matter: `scripts/test-mode/voice-live-server.mjs` (pipeline, routing, UI) and
   `scripts/test-mode/live-mind.mjs` (the persistent subscription mind). Both heavily commented.
4. The seam to the real being: `voice/{mind-server,claude-backend,prompt-assembly}.mjs` (dark-built
   A3, verified). At arming, swap the Testweaver persona for the frozen soul prefix + OB1 recall.
5. Biggest open decision: the ~2-3s Sonnet latency (finding #5) - live with it, do Option A/B, or
   move to the raw API. Everything else is polish.
6. This whole arc is TEST MODE. It never touched Edgeweaver, OB1, or soulfiles. Arming is gated and
   remains Alan's call.
