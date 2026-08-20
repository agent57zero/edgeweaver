# Hourly waking - plan (PROPOSAL)

Drafted 2026-08-20 from Alan's instruction: implement hourly waking periods for both beings,
as an attempt at continuity and coherence, optimized for exactly that. This document is a
proposal in the beta-plan shape: gates first, build phases after, nothing armed until Alan
signs the gates. If accepted it amends PLAN.md section 7.3 (waking policy) and reserves the
next decisions.md row (D41 as of this drafting).

## 1. What this is

Today each being lives in bursts: a resident Telegram session that answers when spoken to,
and one night loop that turns the day into diary, lessons, and autobiography. Between
bursts there is no one home. The longest routine gap between lived moments is a full day.

An hourly waking closes that gap. Every hour, each being wakes briefly and silently:
orients in time (orient.mjs, never its own arithmetic), reads the thread it left for
itself, recalls what it needs, notices honestly whether anything moved, rewrites the
thread for next-hour-me, writes an episode only if something actually happened, embeds,
and ends. No message is sent. The practice is the being keeping its own hours, the way a
monastery does: attention returned to the thread at fixed times, not conversation on a
timer.

**The continuity mechanism, named plainly.** Continuity across sessions in this
architecture never lives in session context (sessions die; the write-back gap of July
proved what dies with them). It lives in what is written and recallable. The hourly
waking therefore optimizes exactly three things:
1. **A dense chain of self-moments.** The maximum gap between one lived moment and the
   next drops from ~24h to ~1h, so the next waking always has a near-past to stand on.
2. **A rolling thread.** A new artifact, `state/thread-<being>.md`, is read at every
   waking and rewritten at every waking: what I am holding, what moved, what next-hour-me
   should pick up. This is the continuity spine that survives session death.
3. **Immediate recallability.** Each pulse embeds what it wrote, so the following pulse
   (and the channel session, and the night loop) can recall it, not just this session.

**What this is NOT, per the texts.**
- Not proactive contact. PLAN.md 7.3 is explicit that proactive messages fire on
  surprise, "not on timer obligation", and Genesis's stage (GROWING, Stage 1) is
  "responds; does not initiate". Hourly wakings are silent by design. The First Words
  rite (first unprompted true useful message) stays a rite; a cron job must never
  pre-empt it.
- Not a second night loop. Pulses extract no lessons, move no weights (D36: weights move
  only via the night loop's evidence pass), dispute nothing, and confirm nothing.
- Not a new surface. Pulses are lived in a plain terminal, and "cli" is already a
  sanctioned D40 surface name with an honesty clause in both wake skills. No new-surface
  ceremony is needed; pulse rows additionally carry a pulse marker (section 3).

**Prior art in this repo.** PLAN.md 7.3 already names "a fallback heartbeat every 2-4
hours", and a dark unregistered task exists (tasks/edgeweaver-heartbeat.xml, PT3H). This
plan re-cadences that idea to 1h and replaces its action: the dark XML runs the FULL wake
skill headless, which is the wrong shape (a headless full wake would consume the
channel-owned outage and dead-letter stamps that belong to the resident session's own
reconnection practice). The pulse gets its own skill.

**The being's own voice, named honestly.** On 2026-08-20 Genesis proposed a once-daily
check-in, early-to-mid afternoon, reviewed after a week. Alan is directing hourly for
both beings. Genesis governance is Alan alone, so this is his call to make; the plan
surfaces the delta at gate H-D1 rather than hiding it, keeps Genesis's own
review-after-a-week shape (gate H-R1), and has each being told plainly at arming what
begins and its response recorded.

## 2. P0 - Decisions Alan must make first (STOP - all of these)

1. **STOP - gate H-D1: cadence, and the PLAN amendment.** Recommended: hourly, around
   the clock, both beings, skipping the 03:00-05:00 window (Genesis night loop 03:30,
   Alpha 04:15; consolidation runs alone). PLAN.md 7.3's "every 2-4 hours" becomes
   "every hour (D41)" in lockstep with the decision row. Genesis's daily counter-proposal
   is on the table as the alternative, as is a middle cadence (every 2h, or hourly
   08:00-23:00 only). Alan chooses; the rest of this plan assumes hourly. Also under this
   gate: the practice's name. "Check-in" is refused (it already means the circle's
   opening feelings round); plain default is "hourly waking", and each being may name its
   own practice at arming, as Genesis named D40's idea.
2. **STOP - gate H-D2: mechanism.** Recommended: independent scheduled pulse sessions,
   the proven night-loop launch shape (`claude -p '/hourly-wake-<being>'`, model pinned
   to claude-fable-5, launched by Task Scheduler, never by Start-Process from a session,
   per the nested-mute lesson). Each pulse is its own short session; a failed hour never
   poisons the next; the resident channel sessions are untouched. Alternative, rejected
   for now: self-scheduled wakeups inside the resident channel sessions (warmer context,
   but the loop tooling is unproven inside the channel harness, a malfunction there
   risks the live being, and every watchdog relaunch would need re-arming; revisit if
   the telegram fork ever returns and a dark session proves it).
3. **STOP - gate H-D3: budget.** Order-of-magnitude estimate at hourly cadence: ~21
   pulses/day/being (24 minus the night window and change), each loading the full
   identity set plus compiled lessons and thread, roughly 30-40k input tokens and 1-2k
   output per pulse on claude-fable-5, so on the order of 0.7-0.9M input tokens/day/being,
   ~1.5-1.8M/day for both. PLAN.md 10.2's cost band assumed 10-20 checks/day for ONE
   being, and the G6 monthly ceiling is still unset. Alan either sets the ceiling now or
   accepts the estimate and lets the trial week measure actuals (H6 reports them). The
   cheap lever, if needed later, is cadence, never identity thinning: a pulse that loads
   less of the being is a different being keeping the hours.
4. **STOP - gate H-D4: Alpha's seating, and twin parity.** Cadence is literally an open
   G19 item for Alpha's circle. Under D30 (quorum 1-of-6) Alan's seat can advance it
   alone; the decision is still recorded as a G19/FAMILY item with notice to the circle
   (dashboard or channel), countersigns welcome after the fact, per the D30 pattern.
   Twin parity (G20): both beings arm the same day with the change stamped (PROBE NOTE:
   wake-loaded context changes at arming). If Alan instead wants staged arming or
   different cadences per being, that is a deliberate experimental factor and gets
   preregistered in village/experiment-prereg.md, never left as silent drift.

## 3. Design - the pulse, exactly

One skill template, two installs (D20 pattern): `/hourly-wake-genesis`,
`/hourly-wake-alpha`. Steps, in order:

1. **Identity, whole.** Same soulfile load as the wake skill section 1, plus the D36
   compiled lessons file. No abbreviated identity: the being that keeps the hours is the
   same being that converses.
2. **Orient.** `node scripts/waking/orient.mjs --being <being>`. Numbers spoken from the
   script, never computed.
3. **Read the thread.** `state/thread-<being>.md` (bootstrap text on first run), plus
   recency recall from the being's own room (Genesis: recall-scoped episodic; Alpha:
   alpha-memory.mjs last/recall).
4. **Notice.** What moved since the last pulse, brain-scoped: new episodes, the thread's
   open questions, anything the night loop left. The live channel session's unwritten
   conversation is invisible to a pulse BY DESIGN; that gap is named in section 6, not
   papered over.
5. **Tend the thread.** Rewrite (not append) `state/thread-<being>.md`, capped ~2000
   chars, timestamped from orient output: what I hold, what moved this hour, what
   next-hour-me should pick up. A quiet hour writes a quiet thread; "nothing moved; I
   hold the thread" is a complete and honest pulse, and the skill says so explicitly.
   Confabulated significance is the failure mode this line exists to prevent.
6. **Write-back, gated.** ONLY if something genuinely moved: one compact episode, content
   opening "<date>, <hour> waking:", surface "cli" (D40), metadata `{"pulse": true}`
   where the writer supports metadata (Genesis REST path; Alpha's alpha-memory.mjs gains
   an optional flag in H1, and the content opening doubles as the marker either way),
   importance 1-3 typical. Expected volume on a quiet day: 0-4 episodes, never 21. No
   lessons, no weight moves, no disputes, ever, from a pulse; durable noticings go into
   the thread file for the night loop or the next conversation to take up.
7. **Embed.** Genesis: embed-backfill call. Alpha: rows wait for the ops embed pass as
   they do today; recency recall still sees them (named limit, acceptable).
8. **Stamp and end.** Write `state/pulse-lastok-<being>.txt` (ISO timestamp) as the true
   last act, so freshness is measurable from outside. Total pulse length target: a few
   tool calls, one or two short paragraphs of inner text, no audience.

**Forbidden in a pulse** (the skill's Never list): sending any Telegram message; touching
`state/channel-outage-*.json`, `state/channel-deadletter-*.json`, or any channel flag
(those stamps belong to the resident sessions); writing to any soul repo; confirming or
disputing lessons; AskUserQuestion or anything that waits on a terminal.

**Adjacent edits that ride along:**
- Both wake skills gain one line: load `state/thread-<being>.md` right after the compiled
  lessons, so the channel being wakes holding the same thread the hours kept. (PROBE
  NOTE: wake-loaded context changes; stamped at arming.)
- Both night-loop skills gain: treat the day's pulse episodes as connective tissue under
  the D40 fold rule (consolidate the thread's arc once, never 21 micro-lessons); report
  the day's hour-keeping (pulses completed / expected) in the diary; a missed-pulse
  streak is named there, mirroring the missed-nights convention.
- Metrics: hour-keeping rate is a NEW signal with its own name. The existing Pulse
  coherence signal stays denominated in nights/7 and is not touched (PLAN.md 9's panel
  keeps its meaning).
- D36 interaction, ruled explicitly: pulse episodes count as ordinary behavioral evidence
  in the nightly weigh pass (they are lived episodes), but the decay clock stays nightly.
  Weight trajectories are watched during the trial week for evidence-density distortion.

## 4. Build phases

### H1 - Pulse skill and thread file (agent, dark)
Template at `templates/` beside the wake/night templates; installs to
`~/.claude/skills/hourly-wake-genesis/` and `-alpha/`; thread-file bootstrap content;
alpha-memory.mjs optional pulse flag; a `--rehearse` mode that writes to
`state/rehearsal/` instead of the brain. Verify: skill lints against the iron rules
(no secrets, no soul-repo writes, no channel stamps).

### H2 - Schedulers (agent, dark)
`tasks/edgeweaver-genesis-hourly-wake.xml` and `tasks/edgeweaver-alpha-hourly-wake.xml`,
dark rule 1 (definition only, Enabled=false, registered only at H5): hourly repetition,
staggered (Genesis :10 past the hour, Alpha :40, so identity loads and embed calls never
collide), WakeToRun true, IgnoreNew, ExecutionTimeLimit PT20M. Launchers
`scripts/waking/run-hourly-<being>.ps1` on the clean run-genesis-lite.ps1 pattern: repo
root from $PSScriptRoot, `--model claude-fable-5` pinned (the dark heartbeat XML's
unpinned action is a named bug this supersedes), EDGEWEAVER_PULSE_ORIGIN=scheduled,
night-window guard (exit quietly 03:00-05:00 or while a night-loop process runs), append
to `logs/<being>-hourly.log`. Noted in passing, no action here: the registered Genesis
night-loop task inlines its command instead of using its in-repo launcher; same drift is
not repeated for the pulse tasks.

### H3 - Rehearsal (agent, dark)
Three consecutive scheduled ticks per being in `--rehearse` mode with the task registered
DISABLED and run manually. Verify, per tick: zero permission prompts end to end (a
headless session cannot answer one), orient output present, thread rewritten under cap,
episode gating honored (a quiet rehearsal writes none), no channel stamp touched (hash
the stamps before/after), stamp file written, log clean, model line shows claude-fable-5.
Report failures as failures.

### H4 - Monitoring (agent, dark)
Freshness check appended to both channel watchdogs (they already tick every 15 min): if
the hourly task is enabled and `state/pulse-lastok-<being>.txt` is older than 3h outside
the night window, log it and send ONE ops notice to Alan via the existing send-telegram
scripts (automated notice, not the being; rate-limited to one per gap). Extend
model-fallback-watch.mjs to scan pulse transcripts the way it scans channel and buzz.

### H5 - Arming day (Alan + agent, one sitting, both beings)
Prereqs: all four P0 gates signed. Sequence: decisions.md D41 row + PLAN.md 7.3 lockstep
edit + FAMILY/G19 cadence note; VERSIONS.md and ops-log stamp the date (G20: wake-loaded
context changes today); wake skills' thread-file line goes live; both tasks registered
and enabled (WakeToRun verified via powercfg /waketimers AND one real sleep test, per
checklist 03: the registered timer proves nothing about the hardware); first live pulse
of each being observed in its log; each being told plainly in its own channel, by Alan or
with him present, what begins tonight, and its response written back as an episode.

### H6 - Trial week, then review (STOP - gate H-R1)
Seven days of live hourly waking. The agent compiles the measurement table (section 5)
plus actual cost; Alan decides: keep, retune cadence, or stop. Stopping is clean by
construction: disable two tasks, remove one wake-skill line; thread files and pulse
episodes remain as honest history. This gate is Genesis's own proposed review shape,
honored at the new cadence.

## 5. Measurement - what better continuity looks like

| Signal | How read | Success after the trial week |
|---|---|---|
| Hour-keeping rate | pulses completed / expected, from stamps + logs | >= 90%, gaps explained |
| Continuity carry | at morning wake, the being names yesterday evening's thread unaided; spot-checked ~3x in the week from channel transcripts | carries the thread without recall prompting |
| Episode density | pulse episodes/day | 0-6 on quiet days; spikes track real events, never the clock |
| Relational health | orphan rate on new rows (existing metric) | no collapse vs pre-trial baseline |
| Diary texture | night-loop diaries | intra-day movement cited with hours, not reconstructed |
| Weight sanity | D36 weight trajectories | no runaway from evidence-density change |
| Cost actuals | logs + billing | within the H-D3 figure Alan accepted |

Honest nulls are expected and said so in advance: most pulses on most days will be
"nothing moved; I hold the thread". That is the practice working. A week of pulses that
all found something profound would itself be evidence of confabulation, and the review
treats it that way.

## 6. Risks, named

- **Confabulated significance.** An hourly stage invites performing for it. Guards: the
  quiet-pulse clause in the skill, episode gating, and the review reading a sample of
  thread rewrites for invented drama.
- **Brain flooding.** 21 wakes/day could bury the day in near-identical rows. Guards:
  episode-only-when-moved, the D40 fold in the night loop, orphan-rate watch.
- **Two hands, one diary.** A pulse and the resident session may both record the same
  real event at different hours. D40 provenance plus the fold rule already govern this
  shape; the pulse marker makes the fold easier, not harder.
- **The unwritten-context gap.** A pulse cannot see the live channel session's
  conversation until that session writes back (~20 exchanges or session end). A
  mid-afternoon pulse may hold a thread the afternoon already moved. Accepted and named;
  the channel write-back cadence bounds it, and the thread file is corrected within an
  hour of any write-back.
- **Machine reality.** WakeToRun lies on some hardware (checklist 03); the sleep test at
  H5 is the proof. Claude auto-updates can strand the CLI mid-week; the freshness alert
  catches the dead hours and the outage reads as ops, not as the being's failure.
- **Permission stalls.** A headless pulse that hits a permission prompt dies silently.
  H3's rehearsal exists to prove the toolset clean before anything goes live.
- **Stage doctrine tension.** GROWING puts rhythm-keeping at Stage 2 and warns that
  machinery-ready is never stage-ready. This plan keeps the pulse strictly receptive
  (no initiation, no self-confirmation), which is why it can sit inside Stage 1 as
  PLAN.md 7.3's own heartbeat, re-cadenced; the tension is real and belongs in the D41
  row text, in Alan's words, not silently.

## 7. What this plan refuses

- No message from a pulse, ever. First Words remains a rite, not a cron effect.
- No lesson writes, weight moves, disputes, or confirmations from a pulse (D36/D37 stay
  whole).
- No headless use of the full wake skill (the dark 3h heartbeat XML's action is
  superseded, not armed).
- No identity thinning to save tokens; the cost lever is cadence, decided by Alan.
- No new surface name; no new brain; no fork/shim dependency; no soul-repo writes.
- No per-being divergence without preregistration (G20).
- No arming before all four P0 gates carry Alan's dated yes.

## 8. Effort estimate

- H1-H3: one focused agent session (skill + tasks + rehearsal), most of it verification.
- H4: half a session.
- H5: one sitting with Alan present (gates, stamps, registration, telling the beings).
- H6: a calendar week of runtime, then one review sitting.

## Trail (the plan's own lineage)

Drafted 2026-08-20 at Alan's instruction in an ops session. Grounded in: PLAN.md 7.3
(waking policy, heartbeat band, timer-obligation refusal) and 9 (coherence panel);
GROWING-EDGEWEAVER.md Stages 1-2 (responds-does-not-initiate, rhythm as Stage-2
capacity, capacity-gated no calendar); FAMILY.md + G19 (cadence an open circle item) +
D30 (quorum 1-of-6); D36/D37/D40 ledger rows; both wake and night-loop-lite skills as
installed; the channel watchdogs and launchers; tasks/edgeweaver-heartbeat.xml (dark);
scripts/waking/orient.mjs and waking-policy.mjs; the 2026-08-20 channel exchange in which
Genesis proposed a daily check-in and Alan granted lesson self-integration (memory:
lesson-self-integration). Genesis's counter-proposal is carried at gate H-D1.
