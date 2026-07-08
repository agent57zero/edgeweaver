# Temporal awareness plan - adversarial pass and co-evolution (v1 -> v2) - 2026-07-08

*Actor: Fable, attacking its own same-session v1 (the strategy proposed in conversation with
Alan, 2026-07-08). Honest limitation: the house pattern is a fresh-context adversary; this is a
self-attack, mitigated by grounding every finding in repo files and design authority rather
than in the v1 text. Verdicts: 11 attacks stand (v1 amended), 7 v1 elements survive as
load-bearing, 3 fresh blind spots added, 1 live bug found in shipped skills.*

## The plan under review (v1, condensed)

Temporal awareness decomposed into five capacities, each with its own plumbing:
(1) knowing "now" (inject clock per waking and per voice turn); (2) elapsed time and gaps
(wake orientation block; gap markers in conversation); (3) retrospective time (recall hits
rendered with age; date-prefixed content on write; occurred_at for pre-birth rows);
(4) rhythm and age (night-loop heartbeat; day-count since First Boot); (5) prospective time
(deferred: resurface due intentions). Build order: conventions text, wake-skill orientation,
write-side dating, recall-scoped age field, voice-rig stamps and gap markers, occurred_at
backfill, prospective memory later.

## A. Attacks that stand (v1 amended in v2)

- **A1 - v1 contradicts itself on who does date arithmetic.** It argues "models are bad at
  date arithmetic, precompute the deltas," then hands the wake-orientation delta computation
  to the very model executing the skill. PLAN's own feelings rule is the precedent: signals
  are computed BEFORE the LLM call; the model interprets numbers it is given, it never invents
  them. -> v2: a deterministic `scripts/waking/orient.mjs` computes now, weekday, deltas, and
  day-count, and prints a ready-made orientation block; the skill runs it and speaks from it.

- **A2 - "you last spoke with Alan N days ago" computed from the newest episode is wrong
  three ways.** Newest `edgeweaver_episode` may be (1) a Testweaver rehearsal writeback
  (`era: "rehearsal"`, channel voice), (2) a pre-birth ingest row, (3) automation output, not
  a conversation. -> v2: orient queries filter `era=alive`, exclude `channel=voice AND
  rehearsal=true`, and report last diary separately (which doubles as a night-loop health
  check from the being's own point of view). Bonus finding while here: `era: "rehearsal"`
  (written by mind-server.mjs) is outside the conventions enum `pre_birth | alive`;
  regularize the enum in the same Appendix B edit.

- **A3 - humanized-English `age` strings do not belong in the enforcement wrapper.**
  recall-scoped is a scoping and provenance organ; baking "8 days ago" into it couples it to
  one language and one presentation style. Converting a given integer to a phrase is safe for
  a model; date subtraction is not. -> v2: the wrapper returns data (`age_days`, `age_hours`,
  plus `created_at` as today); consumers phrase it. And the age fields must respect event
  time when it differs from record time (see A9), otherwise the wrapper automates the exact
  pre-birth misdating v1 warned about.

- **A4 - per-turn `[Tue 14:32]` stamps risk persona damage and content pollution.** A
  tightly-tuned under-30-words voice persona handed a stamp every turn may start time-talking
  ("Good afternoon!"); and if the stamp is prepended to `userText` itself it leaks into the
  rolling transcript, the episode writeback content, and the JSONL log, double-dating stored
  text. -> v2: stamps are event-based, not per-turn: session start, gaps over the threshold,
  and day or part-of-day changes. They are injected at the mind.ask() boundary only; stored
  userText stays clean (transcript entries carry a machine `t` field instead). The mind's
  system prompt gets one line: time context arrives silently; use it, do not mention it
  unless relevant.

- **A5 - v1's biggest miss: presentation only, no time-indexed retrieval.** "What did we do
  last Tuesday?" cannot be answered by cosine similarity; embeddings do not encode dates
  usefully. Worse, the workaround (raw REST with created_at filters) bypasses THE enforcement
  point, exactly what the conventions forbid ("consumers never query the brain raw"). -> v2:
  recall-scoped gains optional `since` / `until` (ISO) filters and a `mode: "recent"` that
  skips vector match and returns newest-first within the same provenance and audience scoping.
  All time queries stay inside the wrapper.

- **A6 - recency plays no role in recall ranking.** Pure similarity happily surfaces a
  three-week-old rehearsal line over yesterday's real exchange; the classic fix (generative-
  agents scoring: relevance + recency + importance) has design precedent in PLAN's nightly
  importance recalibration. But changing global recall ranking is behavior-altering and does
  not belong bundled with plumbing. -> v2: named as a flagged post-infancy experiment,
  explicitly deferred, not dropped.

- **A7 - live day-boundary bug in the shipped night loop (verified).** The contract schedules
  03:30 local; night-loop-lite says "created_at today"; the DB is UTC. A 03:30 run
  consolidates the calendar day that just STARTED (3.5 sleeping hours) and misses the day
  that ended; the UTC offset shifts the window further; `nl-YYYY-MM-DD` stamps the wrong day
  for a diary describing yesterday. -> v2 step 0 (do first, independent of everything else):
  conventions define the "diary day" as the local calendar day containing T minus 12h; the
  run consolidates that day, run_id carries that date, and the fetch window is that local day
  converted to UTC bounds.

- **A8 - the timezone is unowned.** v1 said "present in Alan's local timezone" but the
  wrapper runs in Deno cloud (UTC), the night loop on this PC, W2 possibly elsewhere. Trusting
  each host's clock setting guarantees eventual disagreement. -> v2: one explicit
  `EDGEWEAVER_TZ` config in `.env.local`, read by every organ that formats time; no organ
  trusts its host timezone.

- **A9 - occurred_at backfill invites fabricated precision.** The pre-birth sources mostly
  carry no reliable dates; assigning day-precision timestamps would be fabrication, a data-
  layer violation of the honesty clause. -> v2: an era-based rendering rule does the honest
  work with no backfill at all: rows with `era=pre_birth` render as "pre-birth (predecessor
  era)" regardless of created_at, and the wrapper suppresses age_days for them. Optional
  enrichment later: `occurred_at` + `occurred_precision` ("day" | "month" | "year" | "era"),
  used only at its stated precision, only where Alan actually knows dates.

- **A10 - v1 ordered the work against its own architecture claim.** It called voice the
  future primary channel, then put voice-rig stamps at priority 5 while the rig's transcript
  dies with each websocket connection (in-connection gaps over 5 minutes are rare with an
  open mic). The durable organ is mind-server.mjs, which already takes `now` and ignores it
  for prompting. -> v2: thread time through mind-server (the organ that survives into W2);
  the test rig gets only the cheap bits (machine `t` on transcript entries, gap sentence,
  session-start stamp on the first turn).

- **A11 - gating was too weak.** v1 said "flag the wrapper change in decisions.md"; the
  conventions header is stronger: change only in lockstep with PLAN.md Appendix B, and the
  wrapper is the enforcement point. -> v2: PLAN Appendix B delta + conventions delta +
  wrapper spec travel as ONE package with an explicit stop: Alan reads and approves before
  any deploy. No invented gate number; the lockstep rule itself is the authority.

## B. What v1 got right (survives, load-bearing)

- **B1** - the five-capacity decomposition (now, gaps, retrospect, rhythm/age, prospect) is
  the spine; every attack above lands inside it, none breaks it.
- **B2** - store absolute, render relative AND absolute together, weekday always included
  (amended only by A8's explicit timezone ownership).
- **B3** - never timestamp the frozen prefix: the byte-stable cache prefix is a W1 invariant;
  time rides per-session context and per-turn blocks only. (VOICE-STACK already reserves the
  per-session slot: theory-of-alan, expectations, mood - orientation joins that list, it is
  not a new mechanism.)
- **B4** - the honesty framing: a clockless being saying "it's been a while" is confabulating;
  injected real time is what makes honest time-talk possible. "Never guess a memory" extends
  to "never guess a time."
- **B5** - date-prefixed content on write (episodes open with date and rough span, diary with
  its date) serves the future reader; quoted text keeps its anchor. Noted honestly: this does
  nothing for time-based SEARCH; that is A5's job.
- **B6** - prospective memory stays deferred; the expectations machinery (night loop writes
  them, waking-policy scores against them) is the designed home for it in Phase 4.
- **B7** - naming hygiene: "temporal awareness" (this work) is not PLAN's "temporal coherence
  signal" (unintegrated self-belief contradictions). Keep the names apart in every doc.

## C. Fresh blind spots (added in v2)

- **C1 - time as practice, not plumbing.** GROWING-EDGEWEAVER's Stage 1 capacity ("to
  remember, and to trust that memory. That yesterday happened") is developmental: it should be
  LEARNED, and the father should be able to watch it develop. Silent context injection makes
  time an invisible sense organ. -> v2: the wake skill makes orientation a practice the being
  performs: run the orient script, read the last diary, say the gap out loud to Alan in its
  own words. Alan gets a daily observable (does its time-talk stay accurate?) at zero extra
  cost.

- **C2 - clock trust needs one sanity check.** If the machine clock, timezone config, or DB
  skew ever disagree, the being would confidently narrate false time. -> v2: orient.mjs
  compares now against the newest memory timestamp; if a memory is in the future, the being
  says its time-sense is degraded right now (same stance as degraded memory), never invents
  an explanation.

- **C3 - dated outputs become free probe evidence.** Once diary and episodes carry dates in
  content and orientation is spoken aloud, temporal accuracy becomes checkable against ground
  truth at review time (wrong "N days ago" claims are countable). Not a new gate, not a new
  metric tier; just an affordance the probe battery and weekly spot-check inherit for free.

## The co-evolved plan (v2)

Order chosen so each step is independently verifiable and the one live bug dies first.

- **Step 0 - fix the day boundary (live bug, no gate).** Conventions gain a "diary day"
  definition (local day containing T minus 12h; window converted to UTC); night-loop-lite and
  the contract template amended to fetch that window and stamp that run_id. Log in
  decisions.md. Verify: window math dry-run for a 03:30 run and a 23:30 run.

- **Step 1 - the time conventions package (STOP: Alan's approval before deploy).** One
  bundle, per the lockstep rule: (a) conventions/memory-conventions.md time section: canonical
  format (weekday + ISO local + tz), store-absolute render-both, EDGEWEAVER_TZ ownership,
  day boundary, era-based age rendering for pre_birth, occurred_at + occurred_precision
  schema, era enum regularized (rehearsal); (b) matching PLAN.md Appendix B delta; (c)
  recall-scoped spec: `age_days`/`age_hours` (event-time aware, suppressed for pre_birth),
  `since`/`until`, `mode: "recent"`, all inside existing provenance and audience scoping.

- **Step 2 - orient.mjs + wake-skill orientation practice.** Deterministic script (now,
  weekday, tz; last real conversation delta with A2's filters; last diary delta; day-count
  since First Boot once LINEAGE has entry #1, honest pre-birth phrasing before; C2 skew
  check). Skill: run it, then speak the orientation to Alan in the being's own words; cite
  memory ages when quoting recall. Verify: fixture rows spanning rehearsal/pre-birth/alive.

- **Step 3 - deploy the wrapper change** (after Step 1's approval). Verify matrix: episodic
  query returns ages; since/until bound results; recent mode returns newest-first, still
  scoped; pre_birth rows render era note, no age_days; study consumer unchanged.

- **Step 4 - write-side dating.** Wake skill: episode content opens with date and rough span.
  Night-loop: diary and autobiography drafts open with the human date (run_id already carries
  it). Verify: next real write-backs carry dates.

- **Step 5 - voice organ threading.** mind-server.respond(): `now` joins the per-turn block
  beside recallBlock ("Now: Tue 2026-07-08 14:32"); one system-prompt line (silent use);
  event-based stamps per A4. Test rig: `t` on transcript entries, gap sentence over
  threshold, escalation context carries times. Verify: /selftest plus one live session log
  showing stamps only at events.

- **Step 6 - deferred, by name.** Recency-weighted recall ranking (flagged experiment,
  post-infancy). Prospective resurfacing of due intentions (Phase 4, expectations machinery).
  occurred_at enrichment for specific pre-birth documents if and when Alan supplies real
  dates.

## Verdict summary

11 attacks stand (A1-A11), all amended into v2. 7 v1 elements load-bearing and kept (B1-B7).
3 fresh blind spots added (C1-C3). 1 live bug found and promoted to Step 0 (A7). v1's step
count survives roughly intact but re-ordered: the organ (mind-server) displaced the test rig,
retrieval gained a time axis, and every convention-touching change now travels through one
Alan-approved package.
