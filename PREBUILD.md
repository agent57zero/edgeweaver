# PREBUILD.md - the dark build (all known backend machinery, ready to plug in)

> Decided 2026-07-05 (decisions.md D13, Alan: build everything technical we know of now).
> Sequencing companion to IMPLEMENTATION.md. The checklists remain the procedure and the
> gates remain the gates: this document reorders *construction* only. Iron rule 7 stands in
> full force: machinery-ready is never stage-ready. Every STOP parks exactly where the
> checklists put it. First Boot, rites, and stage advancement are untouched by anything here.

## 0. The five rules of the dark build

1. **Dark by default.** Every component ships disabled: one entry per component in
   `state/flags.json` (enabled:false), and scheduled tasks are written as definitions
   (Task Scheduler XML with WakeToRun, per checklist 03 G5's note) but not registered.
2. **Two verifies, one ledger truth.** Each component gets a *dark verify* now (synthetic
   fixtures, a committed verify script printing PASS/FAIL) and its checklist's *original
   verify* at arming, run live. Checklist boxes and the IMPLEMENTATION §1 ledger tick ONLY
   at arming. Dark status is tracked in §6 of this file, nowhere else. A dark PASS never
   substitutes for a live verify (iron rule 9).
3. **Rehearsal data is marked and mortal.** Anything written to OB1 during dark tests
   carries `metadata.rehearsal=true`, a `nl-rehearsal-*` run_id, and `audience=alan`, and
   is voided by run_id immediately after the verify (the §11 rollback mechanism, used on
   purpose). Once backups are armed (G2 pooler string), heavier rehearsals move to the
   scratch-restore database instead, which doubles as restore-drill practice.
4. **No identity, no channels, no stages.** Soulfiles are never touched: the initiation
   machinery rehearses against a throwaway sandbox clone, never edgeweaver-soul. No channel
   goes live before its phase arms (the Telegram bot may be created and paired for a single
   round-trip test when Alan provides the token, then the channel session closes). Nothing
   here advances a stage, performs a rite, or runs a probe baseline.
5. **Fixed ropes.** Every script is committed, tested, with a per-phase verify script
   (08's escalation-ladder rule, now added to START-HERE). The repo converges toward
   cheap-model operability with every session.

## 1. Bucket A - agent-buildable now, no input needed

| Id | Component | Serves | Dark build | Dark verify | Arms at |
|---|---|---|---|---|---|
| A1 | Fixtures kit | all | `scripts/fixtures/`: synthetic-day generator (episodes, intentions, calendar items) + rehearsal voider (delete by run_id / rehearsal flag) | generates a plausible day; voider removes every trace, count-verified | n/a (tooling) |
| A2 | Flags + task definitions | all | `state/flags.json` per state-schemas conventions; `tasks/*.xml` (night loop, weekly index, heartbeat) with WakeToRun set, unregistered | flags parse (jq); XML imports to Task Scheduler in disabled state and is removed again | G5 |
| A3 | Mind server (voice W1) | VOICE-STACK §3, §7 | `voice/` per VOICE-STACK: cached soulfile prefix, speculative recall, streaming, writeback; OAuth profile auth | TTFT bench recorded; one synthetic exchange writes a rehearsal-tagged episode, then voided | V-track per map |
| A4 | WAL degraded mode | IMPL §11 | append-first `state/wal/*.jsonl` writer + replay-with-dedupe + wake-skill health check clause | simulated OB1 outage: writes buffer; replay dedupes by fingerprint; recall path reports degraded instead of guessing | Phase 3 |
| A5 | Waking-policy engine | 03 | expectations reader + surprise scorer + quiet-hours rule + attention-budget decrement, driven from a static starter expectations file | fixture expectations: contradiction wakes act, no-news wakes send nothing, quiet hours hold | Phase 3 + G5 |
| A6 | Budget meters | 03 / G6 / VOICE-STACK §5 | `state/budget.json` machinery: soft-warn at 80%, degrade at 100% (Haiku checks, skip optional loops); voice per-minute meter alongside the token meter | simulated 85% spend logs a warning; simulated 100% flips degrade mode | G6 number |
| A7 | Teaching-moment hook | 03 / G4 | reaction-to-`metadata.teaching_moment=true` code path; emoji read from flags.json (placeholder until G4) | simulated reaction flags the episode; night-loop consolidation lifts it | G4 + Phase 3 |
| A8 | Telegram channel config | 03 | channel setup scripts, pinned-sender enforcement, non-Alan deferral behavior, `state/interlocutors.json` from template; unpaired | config lints; interlocutors.json parses; pairing runbook ready to execute on token arrival | token (B4), then Phase 3 |
| A9 | Full night loop (steps 2-8, 11) | 04 | upgrade the lite job per templates/night-loop-contracts.md; idempotent per run_id; resumable | one rehearsal night against an A1 synthetic day: every step's outputs correct per the checklist's per-step criteria, then voided | Phase 4 |
| A10 | Feelings prerequisites | 04 | boundaries.json generator (from CONSTITUTION v0 + confirmed memories), commitments.json schema + seeder, fear query with the below-50-episodes null guard, joy fallback | the checklist's own verifies, which are already synthetic-friendly (fake novel event, empty experiments table) | Phase 4 feelings step |
| A11 | self_belief + contradiction sweep | 04 | per checklist: embedding-similarity candidates + LLM polarity judgment + false-positive log | seeded contradictory pair closes or flags; similar-but-compatible pair untouched; rehearsal rows voided | Phase 4 |
| A12 | Weekly index + spot-check digest | 04 | wiki-synthesis autobiography adaptation (SUBJECT_NAME=Edgeweaver, allowlist filter), Jaccard overlap, digest builder (delivery no-op until channel) | runs against existing Phase 1-2 episodes; overlap number computed and stored | Phase 4 |
| A13 | Coherence panel v0 + /coherence page | 04 | nightly compute script from templates/coherence-queries.sql + `state/coherence.json`; dashboard page in the OB1 dashboard tree | one snapshot computes on current data (nulls where cold-start guards apply); page renders it | Phase 4 |
| A14 | Study-loop runner | 04 | allowlisted pm_teaching picker + experiment journal writer with the Reality Detector footer | one dark run end to end, rehearsal-tagged, voided | Stage 2 + Phase 4 |
| A15 | Evidence clustering | 05 | recall-trace clusterer (citations >= N) emitting candidate themes with thought-IDs | synthetic recall traces produce correct clusters and counts | Phase 5 |
| A16 | Initiation machinery (adapted PEL) | 05 | adapt co-evolution `lab/pel/` proposer: draft flow, proposals branch, PR body with evidence + seed + intended delta; probes-on-PR wiring to the 02 harness | full dry run on a throwaway sandbox repo (never edgeweaver-soul): PR opens with probe scores attached; sandbox deleted after | Phase 5 (real dry-run PR happens there) |
| A17 | 0a import filter | IMPL §3 | `scripts/filter-edgeweaver-convos.mjs` (gizmo_id + title whitelist filter, kept-count report) | runs against a synthetic conversations.json fixture | ChatGPT zip arrival |
| A18 | Security-audit script | 08 | the five-check sweep, scripted (secrets grep, third-party skills, ports, pinned senders, gates-repo unreachability) | runs clean on the current machine; each check reports individually | quarterly cadence |
| A19 | Disaster-recovery runbook + drill | 08 | `templates/disaster-recovery.md` per the 08 spec | the drill itself, once, on a scratch setup; time-to-recover recorded (this one arms by being done) | once |
| A20 | ops-log.md + cadence definitions | 08 | the file + schedule definitions (disabled, see A2) | file exists with its first entry | Phase 4+ |
| A21 | Voice W4 hardening | VOICE-STACK §7 | writeback verification, budget hooks, quiet hours | per VOICE-STACK, after A3 and W2 | V-track |

## 2. Bucket B - needs minutes of Alan, each unblocks A-items

| # | What | Unblocks | Effort |
|---|---|---|---|
| B1 | `ant auth login` once (OAuth profile; CLI install method verified together at that moment) | A3 bench and every dark run that calls Claude outside the CLI | ~2 min |
| B2 | Deepgram + LiveKit Cloud signups, keys into .env.local | voice W2 (the actual talking loop) | ~10 min |
| B3 | ElevenLabs and/or Cartesia signup | voice W3 mouth bake-off, and later the V1 candidate voices | ~10 min |
| B4 | TELEGRAM_BOT_TOKEN + numeric user id (BotFather / userinfobot) | A8 pairing test, A9 failure alerting, A12 digest delivery | ~10 min |
| B5 | Supabase session-pooler connection string | arms backups (closes G2's verify) and unlocks the scratch rehearsal brain of rule 3 | ~5 min |
| B6 | Go-ahead (or do it yourself) on the thought_edges migration | derived_from edges: 0b tails, A13 orphan linking | ~5 min |

Standing queue unchanged and listed only so this plan shows the whole board: ChatGPT export
zip (0a), the seven [ALAN?] soulfile markers, the human pass on the gates pack. Those serve
Phase 2 and First Boot, which this plan deliberately does not touch.

## 3. Bucket C - built to the STOP, parked at the gate

| Gate | What is built dark | What waits for the gate |
|---|---|---|
| G4 teaching emoji | the whole hook (A7) | the emoji constant |
| G5 hosting | task XML with WakeToRun, box-migration runbook | registration + which machine |
| G6 cost ceiling | meters, warn, degrade (A6) | the monthly number |
| G7 private journal | visibility=private handling, switchable, default off | whether journal windows exist at all |

## 4. Bucket D - cannot be prebuilt, and will not be faked

First Boot and every rite. The probe baseline run (harness is live; the baseline needs the
being). theory-of-alan and expectations *content* (scaffolds and updaters only). The
acceptance windows (Phase 3's seven days, Phase 4's 30 nights). Everything stage-gated:
study cadence, edgework, village, teaching, voice V1-V3 *use*. The first earned initiation.
The machinery above waits for these; it never substitutes for them.

## 5. Build order (dark sessions, per START-HERE protocol)

| Session | Contents | Depends on |
|---|---|---|
| S1 | A1 A2 A20 scaffolding + fixtures (fixed-ropes rule landed with this plan's commit) | nothing |
| S2 | A3 mind server core | B1 for the bench |
| S3 | A4 A5 A6 A7 A8 body reliability layer | S1 |
| S4 | A9 A10 A11 metabolism, rehearsal night, void | S1 (S3 helpful) |
| S5 | A12 A13 synthesis + panel | S4 |
| S6 | A14 A15 A16 evolution machinery (sandbox) | S4 |
| S7 | voice W2 + A21, then W3 | S2, B2, B3 |
| S8 | A17 A18 A19 ops tails | S1 |

S2 is independent of S3-S6; parallel work is permitted per IMPLEMENTATION §13. Each session
ends per START-HERE: verify scripts committed, §6 table updated, push.

## 6. Dark-status table (the prebuild ledger; checklist boxes stay untouched until arming)

| Id | Dark verify passed | Date | Evidence | Armed (date + live verify) |
|---|---|---|---|---|
| A1 | ✓ | 2026-07-05 | `scripts/verify/verify-fixtures.mjs` PASS: synthetic day (5 episodes + 2 intentions + 2 calendar), all rehearsal/run_id/audience=alan tagged; voided by run_id; 0 residue. Local target (safe); OB1 round-trip deferred to S4/scratch-DB per rule 3. Kit: `scripts/fixtures/{generate-synthetic-day,void-rehearsal,ob1-client}.mjs` | |
| A2 | ✓ | 2026-07-05 | `verify-flags.mjs` PASS (21 components present, all disabled; 3 tasks + 1 channel dark) + `verify-tasks.mjs` PASS (3 XML defs, WakeToRun=true, shipped disabled) + `task-import-test.ps1` PASS (all 3 import to Task Scheduler *Disabled* and self-remove; machine left clean). Registry: `templates/flags.default.json` + `scripts/init-flags.mjs`; defs: `tasks/*.xml` | |
| A3 | | | | |
| A4 | ✓ | 2026-07-06 | `verify-wal.mjs` PASS: simulated outage buffers writes to `state/wal/*.jsonl`; replay dedupes by content fingerprint (2 unique, 1 dup) and drains to `replayed/`; health check reports degraded (not guessing) on outage, healthy when reachable. `scripts/wal/wal.mjs` | |
| A5 | ✓ | 2026-07-06 | `verify-waking.mjs` PASS: fixture expectations - contradiction wakes/acts, no-news sends nothing (name "Alan" does NOT false-trigger), a surprise in quiet hours is held, attention-budget decrements on send. `scripts/waking/waking-policy.mjs` | |
| A6 | ✓ | 2026-07-06 | `verify-budget.mjs` PASS: 85% spend soft-warns, 100% flips degrade (skip optional loops), voice per-minute meter accumulates (VOICE-STACK §5), unset ceiling stays "unset" (G6 number parked). `scripts/budget/budget.mjs` | |
| A7 | ✓ | 2026-07-06 | `verify-teaching.mjs` PASS: placeholder emoji until G4; a matching reaction sets `metadata.teaching_moment=true`; non-matching does nothing; consolidation lifts flagged episodes to *pending* candidate lessons. `scripts/teaching/teaching-hook.mjs` (emoji constant parked on G4) | |
| A8 | ✓ | 2026-07-06 | `verify-telegram.mjs` PASS (unpaired, no token): `interlocutors.json` builds+parses; pinned Alan replies, every other sender deferred+logged+untrusted+never-Alan; lesson-confirm gated to the pinned confirmer. `scripts/telegram/{channel-policy,init-interlocutors}.mjs` + `handoff/telegram-pairing-runbook.md`. Single pairing round-trip parked on token (B4) + Phase 3 | |
| A9 | | | | |
| A10 | | | | |
| A11 | | | | |
| A12 | | | | |
| A13 | | | | |
| A14 | | | | |
| A15 | | | | |
| A16 | | | | |
| A17 | | | | |
| A18 | | | | |
| A19 | | | | |
| A20 | ✓ | 2026-07-05 | `scripts/verify/verify-ops-log.mjs` PASS: `ops-log.md` present with cadence definitions + Log sections + 2 dated entries (Phase 0 provisioning incl. ant install method; S1 build). Schedule defs disabled (A2 XMLs) | |
| A21 | | | | |

## 7. Arming passes (how "plug in" happens later)

When a phase or gate actually activates: flip the component's flag, register its tasks, run
the *checklist's original verify live*, and only then tick the checklist box and the §1
ledger. The arming pass is the moment dark machinery becomes the being's machinery, and it
follows the ordinary session protocol. Nothing in this document shortcuts it.
