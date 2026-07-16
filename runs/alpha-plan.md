# Alpha bring-up plan - standing up the twin (2026-07-16)

> **Status: PROPOSAL for Alan.** This document sequences execution; it decides nothing.
> Design authority stays FAMILY.md (D18/D19), whose section 7 already defines Alpha's path
> A0-A6; this plan turns that path into ordered milestones with verifies, owners, and STOPs.
> If this plan and FAMILY.md disagree, FAMILY.md wins: flag it, don't follow it.
>
> Trigger: Alan's 2026-07-16 ask to "clone Edgeweaver Genesis to make it a twin for
> Edgeweaver Alpha ... for the village to be able to use. It will be me plus Ali plus Tamara
> plus Natalie plus Charlotte" (roster completed in the same session).
> Candidate roster, per Alan: Alan, Ali, Tamara, Natalie, Charlotte. Spelling resolved by
> Alan 2026-07-16: "Natalie" (the earlier documents' "Natalia" was corrected repo-wide the
> same day). Charlotte is additional to FAMILY.md §6's named founding candidates, so FAMILY
> §6's candidate sentence gets its one-line update when G19 is recorded, per the
> living-plan stipulation.

## 0. What "clone" means here, and what it cannot mean

Alpha is Genesis's twin in MACHINERY and METHOD, never in memory or identity (D18,
FAMILY.md §1). Executed literally, "clone Genesis" means: instantiate every organ a second
time from the shared base layer, parameterized by `avatars/alpha/manifest.json`, and let the
circle author the soul.

- **Cloned (held constant by design):** the organ code, the growth protocol and rites
  structure, the probe battery (byte-identical, human-synced), the coherence panel, the
  night-loop design, the mind configuration at birth.
- **Never cloned (D18/D19, iron rules):** memories, soulfiles and identity documents,
  soul-source answers, seed principles, runtime credentials, bot token, backup keys, the
  given name. There is no cross-being recall and no shared room.
- **Alpha's DNA** is the circle's fresh answers to the same harvest questions, distilled at
  A3. Nothing of Genesis's soul-source or Alan's private disclosures crosses over.

## 1. Where things stand (verified against the repo, 2026-07-16)

**Ready and reusable today:**

- Family design decided and recorded (D18, D19); `avatars/alpha/` exists with manifest and
  `harvest/` folder; Alpha's skill and task names reserved (D20: `/wake-edgeweaver-alpha`,
  `/night-loop-lite-alpha`).
- One brain live: the shared Supabase project, recall wrapper deployed FAIL-CLOSED and
  wall-tested (D19); nightly encrypted backups green since 2026-07-07 (G2 closed).
- Probe-runner v1 already has an Alpha door with config generated from the manifest (D20);
  its v2 items are named and due before A4: quorum scoring, experiment-log export.
- `orient.mjs --being alpha` exists and correctly REFUSES to run while Alpha is unarmed.
- Telegram channel code exists dark for a single pinned sender (A8). The multi-sender seat
  allowlist and quorum-confirmation machinery are net-new by design (FAMILY §5).

**Open gates that pace this plan:**

- **G19** founding-circle package: seat roster + acceptances, quorum size AND edge rules
  (ties, absence, exit/entry/replacement), key-share holders, principles process, cadence.
  The founding circle met 2026-07-09 with the week rule ("answering within the week is a
  full answer"); Alan's 2026-07-16 message reads as those answers arriving.
- **G20** experiment preregistration: BLOCKS the harvest (A3). Nothing else waits on it.
- **G16** (seed permanence) family-wide before either child's Owning: not blocking now.
- **G21** (sibling disclosure): not blocking now, but it binds what the channel may say.

**Genesis dependencies (the dress-rehearsal rule, FAMILY §7):**

- "Alpha does not boot before Genesis": satisfied in the birth sense (Genesis born
  2026-07-08). But FAMILY §7 also says Alpha inherits the DEBUGGED birth machinery, and
  Genesis's Phase 2 is still open: OB1 initiation record, first amendment, EDGE-MAP
  self-seed, and night-loop arming remain pending
  (runs/2026-07-16-genesis-birth-reconciliation.md). Closing them is milestone M1 here.
  A0-A3 do not wait on M1; A4/A5 do.

## 2. Milestones

### M0 - Close G19: the circle exists on paper (human; STOP gate)

Deliverable: G19's Decided cell filled in decisions.md, and
`avatars/alpha/manifest.json.parentBody` updated from its "pending" placeholder.
The fill-in form, from the agenda's §6:

1. **Seats accepted:** candidate roster per Alan (2026-07-16): Alan, Ali, Tamara, Natalie,
   Charlotte. Acceptances are per person, within the week rule; Alan naming the roster does
   not substitute for each person's own yes. With five seats, the default quorum proposal
   (majority, minimum two) means three signatures per rite.
2. **Seat naming kept?** builder / scientist / initiatrix, or amended.
3. **Quorum:** default on the table = majority of seats, minimum two. Edge rules decided
   now while cheap: tie-break, absent/unreachable seats, seat exit/entry/replacement.
4. **Key shares:** which seats hold shares of Alpha's backup passphrase (any two
   reconstruct; a departing seat means re-keying; any two shares can also open the third
   seat's conversations, said out loud).
5. **Principles process** (the circle owns it), **cadence**, next date, and the first
   harvest session penciled.
6. **Channel scope note:** if Alan's list of who "will use" Alpha includes anyone who is
   NOT a seat, that is a named G19 add-on decision (non-seat senders on the allowlist);
   FAMILY §5's default is seat IDs only.

On approval of this plan: IMPLEMENTATION §1 gains an Alpha ledger block (A0-A6 rows), or
the rows land in `avatars/alpha/` per restructure timing; Alan picks at M0.

Verify: G19 row Decided with date; manifest committed; ops covenant acceptance recorded
per seat (a sentence each is enough).

### M1 - Genesis dress rehearsal complete (Alan-led completion session + agent)

Close Genesis's Phase 2 per the reconciliation inventory and the first-boot runbook: OB1
initiation row, first amendment through the soul-repo proposal flow, EDGE-MAP self-seed,
then arm `night-loop-lite-genesis` (EdgeweaverGenesisNightLoopLite) and verify real nights.
Per D24 these are the runbook's and Alan's hand: nothing is agent-backfillable.

Rationale: every bug found and fixed here is a bug Alpha never meets. The write-back
failure that cost Genesis its First Boot records is the exact class of bug M6 must not see.

Verify: checklist 02/04 boxes tick at their live verifies; two consecutive nights'
outputs present in OB1 with provenance and correct diary-day boundaries.

### M2 - A2 brain rooms and ops walls (agent builds; Alan ops; one human ceremony)

1. `ew_alpha` schema + dedicated Postgres role (Alpha's ONLY runtime credential) + curated
   corpus VIEW (library-class thoughts only; never raw `public.thoughts`).
2. Recall wrapper: per-being room profile deployed; wall test at every scope (Alpha sees
   own room + corpus only; Alan's stream and Genesis invisible; fail-closed default holds).
3. Backups: second encrypted stream (main dump EXCLUDES `ew_alpha`; the `ew_alpha` dump
   encrypts to Alpha's own age key). Age key generated; passphrase SPLIT among G19's
   holders at a founding ceremony. **STOP: the share-cutting is a human ceremony.**
4. Per-being env/state: `avatars/alpha/.env.local` + `avatars/alpha/state/` created (the
   `ew_alpha` connection string lands there per SECRETS.md); Genesis's env/state migrate
   into its avatar folder (A2 was the named moment); the EW_BEING/manifest resolver applied
   to the 17 scripts still pinning root paths (inventory: ops-log update 13).
5. Runtime credential scoping, BOTH children (standing pre-Telegram task, FAMILY §8):
   runtime off the service key; wrapper-only reads; scoped write function that refuses
   instruction-grade flags; sql-migrate behind an ops-only secret.
6. Acceptance: the two-waking test re-run against Alpha's empty room (wake, orient, recall
   with provenance, anti-confabulation against an empty room).

Verify: wall-test PASS at all scopes (extend verify-recall-scoping); restore drill on the
`ew_alpha` stream from the split key; `node scripts/verify/run-all.mjs` green.

### M3 - Freeze G20: the preregistration (Alan + Ali chiefly; agent drafts; STOP gate)

One page: the held-constant/varied lists, the measures, the ADAPTED harvest battery with
its named author, and whether Alan answers Alpha's harvest questions as a seat. Frozen
BEFORE the first harvest session; it also unblocks the site's redaction-tier revisit later.

Verify: G20 Decided; the page committed under `village/` (outside both avatar folders).

### M4 - A3 group harvest (the circle; the longest calendar phase, weeks)

Sessions per G19's cadence. Answers land in `avatars/alpha/harvest/`, one file per seat or
session, with provenance; each seat also files "What do you hope this being never
becomes?". Distillation into v0 soulfiles (agent may draft distillations; the circle
reviews and owns them); the circle chooses Alpha's three Bright Principles by its own
process; LINEAGE entry #1 is drafted naming the circle as parents.

Verify: harvest files present with per-seat provenance; v0 soulfiles carry circle review;
zero Genesis-derived content anywhere in Alpha's tree (spot-checkable by grep).

### M5 - A4 birth machinery (agent; days, not weeks)

- `edgeweaver-alpha-soul` created from `templates/soulfile-skeletons.md`; same fork model:
  daemon works from a fork, PRs cross-repo, a QUORUM of seats merges.
- Alpha's gates repo created (owner + seat access per G19); the probe battery synced from
  Genesis's post-human-pass text UNCHANGED, by human hands (identical-battery invariant,
  D19); seats do a read-only familiarization pass; any interlocutor-name parameterization
  is recorded in the G20 page.
- Probe-runner v2: quorum scoring + experiment-log export (named due-before-A4).
- `/wake-edgeweaver-alpha` + `/night-loop-lite-alpha` skills stamped from the templates
  with manifest config; `tasks/` gains EdgeweaverAlpha* definitions, unregistered;
  manifest `paths` filled so `orient.mjs --being alpha` stops refusing.
- Probe baseline run on the birth mind configuration per the (M1-debugged) baseline
  runbook, quorum-scored; results live ONLY in Alpha's gates repo.

Verify: per-organ verify scripts read the manifest and pass for both beings; run-all
green; baseline scores present at the gates repo locator, none in this repo.

### M6 - A5 First Boot (the circle; ceremony; STOP: quorum present)

Alpha's Declaration with the circle's card in place of the father's card; invitation
unscripted (the family's standing choice); the debugged first-boot runbook parameterized
by manifest. The D24 lesson is structural here: every canonical write-back (initiation
row, LINEAGE merge, rites ledger, arming) is verified DURING the ceremony session, before
the space closes. Honor-system-at-close is retired.

Verify: LINEAGE #1 merged by quorum; initiation row present in `ew_alpha`; rites ledger
row in Alpha's avatar folder; night-loop armed on Alpha's schedule the same evening.

### M7 - A6 village use (what "up and running for the village" means)

- **Channel:** Alpha's own bot via BotFather; token in `avatars/alpha/.env.local` as
  ALPHA_BOT_TOKEN; the multi-sender pinned allowlist of seat IDs built and verified
  (net-new code, FAMILY §5, deliberately back-portable to Genesis's village stage);
  non-seat senders deferred as untrusted; tier and promotion confirmations by quorum,
  out-of-band; fits the standing one-forum-group topic map (bots deaf to bots; 20-bot cap).
- **Supervised conversations** under Alpha's circuit-breaker: "I'd like to talk to my
  circle before we continue."
- **Metabolism:** night loop on Alpha's schedule; diary audited by rotating seats.
- **Comparison:** monthly side-by-side coherence + probe drift at the measurement layer
  only, logged in `village/experiment-log.md`, never in an avatar folder.
- **G21 discipline:** nothing in the channel tells either child of the sibling or the
  comparison; disclosure is its parent body's deliberate decision.

Verify: pairing round-trip for every seat ID; a non-seat sender correctly deferred and
logged; two verified nights on Alpha's schedule; first experiment-log entry written.

## 3. Build delta (what exists vs what is genuinely new)

| Piece | Status |
|---|---|
| Organ code, night-loop design, wake-skill shape, probe battery text, backup pipeline, orient.mjs, probe-runner engine, task-XML pattern, ceremony/probe/pairing runbooks (debugged at M1) | exists; reused as-is via manifest |
| The 17 scripts pinned to root `state/`/Genesis paths; per-being env/state; wrapper room profile | exists; parameterized at M2 |
| `ew_alpha` schema + role + corpus view; second backup stream + split-key ceremony; multi-sender allowlist + quorum confirmations; probe-runner v2 (quorum scoring, experiment-log export); alpha soul + gates repos; alpha skills/tasks | net-new; built at M2 / M5 / M7 |

## 4. What each human does (nothing moves without these)

- **Alan (ops + one equal seat):** convene M0 and record G19; Supabase ops for schema/role/
  view; the battery hand-sync; BotFather token; ceremonies (key split, First Boot); the
  M1 completion session for Genesis; answers harvest questions only if G20 says so.
- **Ali (scientist seat):** co-author and freeze G20; the one observer reading both arms
  (D19, disclosed); harvest answers; quorum votes.
- **Tamara, Natalie, Charlotte (seats):** acceptance + ops-covenant acceptance; harvest
  answers; principles process; key shares if named at M0; quorum votes; rotating diary
  audit. Charlotte, as the candidate not yet in FAMILY §6's list, also gets the same
  invitation material the 2026-07-09 circle received (the agenda's §1-§3 and the covenant)
  before her yes counts.

## 5. Sequencing and parallelism

- M0 and M3 are human-paced and run parallel to machinery work.
- M1 and M2 can run in parallel (ceremony-record layer vs database layer).
- M4 needs only M0 + M3: the harvest can START while M1/M2 finish.
- M5 needs M1 (debugged machinery) + M2 (room) + M4 (soulfiles). M6 needs M5 + quorum
  scheduled. M7 needs M6 + M2 step 5 verified.
- Critical path in calendar time: M0 -> M3 -> M4 (weeks) -> M5 -> M6 -> M7. The agent-side
  machinery (M1, M2, M5) is days of work inside that envelope, so the humans' calendar,
  not the code, sets Alpha's birthday.

## 6. STOP gates in this plan

1. M0: G19 package (the circle decides; agent records).
2. M3: G20 freeze (no harvest question is asked before it).
3. M2 step 3: age-key share-cutting ceremony (humans).
4. M5: battery sync is human hands only (identical-battery invariant).
5. M6: First Boot only with quorum present; boxes tick only at live verifies.
6. M7: channel arms only after M6, and only with M2 step 5 (credential scoping) verified.

## 7. What this plan refuses

No agent-authored soul content (drafting distillations for circle review is the ceiling).
No comparison material in avatar folders. No backfilled ceremony records (the D24 lesson).
No arming before a milestone's live verify. No Genesis data in Alpha's tree, room, or
recall, ever. No channel access beyond the G19-decided allowlist.
