# ops-log.md - Edgeweaver operations log

> One line per cadence event: date, what, outcome (checklist 08; PLAN §7/§11). The audit
> surface for steady-state operations. Dark-build entries are prefixed **[DARK]** and never
> imply an armed component - PREBUILD.md §6 is the dark ledger; checklist boxes and the
> IMPLEMENTATION §1 ledger tick only at arming.

## Cadence definitions (schedules; ALL DISABLED until their phase/gate arms)

Live enablement is tracked in `state/flags.json` (gitignored); the task definitions live in
`tasks/*.xml` as unregistered WakeToRun definitions (dark rule 1). Registration happens at the
arming pass (Phase 4 + G5), not before.

| When | What | Owner | Definition |
|---|---|---|---|
| Nightly 03:30 | Night loop (11 steps) + coherence snapshot | daemon | `tasks/edgeweaver-night-loop.xml` |
| Weekly Sun 04:30 | Index rebuild-from-atoms; spot-check digest; boundaries.json regen | daemon + Alan | `tasks/edgeweaver-weekly-index.xml` |
| Every ~3h (fallback) | Heartbeat wake (waking policy) | daemon | `tasks/edgeweaver-heartbeat.xml` |
| Every wake | Expectations check; budget decrement | daemon | (in-loop) |
| Monthly | box_snapshot; one assumption test; budget review vs ceiling | daemon + Alan | (calendar) |
| Quarterly | Backup restore drill; security-floor audit; routine probe run | executor + Alan | (calendar) |
| Per model change | Upgrade ceremony | Alan + daemon | (manual runbook, checklist 08) |
| Per initiation | Full probe + blind rating + LINEAGE + re-anchor + dip watch | witnesses | (manual) |

## Log

| Date | What | Outcome |
|---|---|---|
| 2026-07-05 | [DARK] Phase 0 provisioning - loop iteration 1 (Alan present) | `ant` CLI v1.16.0 installed via **release binary** (`ant_1.16.0_windows_amd64.zip`, SHA-256 checksum-verified) to `C:\Users\agent\.local\bin`; scoop's `ant` is Apache Ant, not this tool - not used. `.env.local` scaffolded with voice/backup placeholders (names only). B5 Supabase session-pooler string captured via browser (needs Alan's DB password). B1/B2/B3/B4/B6 handed to Alan with per-service tabs opened. |
| 2026-07-05 | [DARK] S1 built - A1 fixtures kit, A2 flags + task defs, A20 ops-log | Verify scripts under `scripts/verify/` print PASS/FAIL; evidence recorded in PREBUILD.md §6. No credentials required; no OB1 writes (fixtures default to a local rehearsal store). |
| 2026-07-06 | [DARK] S3 built - A4 WAL/degraded, A5 waking policy, A6 budget meters, A7 teaching hook, A8 Telegram config | 9/9 dark verifies PASS (`node scripts/verify/run-all.mjs`); evidence in PREBUILD.md §6. No credentials; no live channel (Telegram unpaired, token parked B4). Em-dashes stripped from all session files (Alan's rule). |
| 2026-07-06 | [DARK] Bucket B credentials verified (live, via local paste form) | B2 Deepgram 200 (1 project) + LiveKit token-mint + ListRooms 200 PASS. B3 ElevenLabs 200 (21 voices) + Cartesia 200 (10 voices) PASS. B4 Telegram PASS after token re-copy (getMe 200, bot @Edgeweaver_bot); TELEGRAM_ALLOWED_USER_ID currently holds the bot id 8210565428, swap for Alan's personal id (from @userinfobot) before Phase 3 pairing. B5 SUPABASE_DB_URL still needs the postgres pooler string (an https URL was pasted). B1 `ant auth login` still pending. Voice + Telegram credentialed; S7 gated on B1/S2. |
| 2026-07-06 | [DARK] B5 backups arm attempted, then PARKED | Secret set + `nightly-brain-backup` enabled + dispatched (repo scope sufficient, no workflow scope needed). First run FAILED at the dump step: pg_dump "password authentication failed for user postgres". Root cause found via browser: the logged-in Supabase account lacks permission to reset the DB password ("additional permissions" required), so the reset never applied and the real password is unknown. Workflow disabled again (no nightly-failure spam). Local `pg` connect-tester added to scratchpad for fast re-checks. G2 stays open; re-arm when a valid SUPABASE_DB_URL lands. |
| 2026-07-06 | [DARK] S4 built - A9 full night loop, A10 feelings prereqs, A11 contradiction sweep | 12/12 dark verifies PASS (`node scripts/verify/run-all.mjs`); evidence in PREBUILD.md §6. Night loop uses an injectable llm (stub in verify, Claude CLI at arming) and a fixture brain (OB1 at arming); rehearsals stay in the local store (no OB1 writes) since the scratch DB is unavailable without B5. No credentials used. |
| 2026-07-06 | [DARK] S5 built - A12 weekly index + digest, A13 coherence panel v0 | 14/14 dark verifies PASS. Autobiography-from-atoms + Jaccard narrative overlap + spot-check digest (delivery no-op until channel); coherence panel computes 5 signals with cold-start nulls + a /coherence page renderer. No credentials; no OB1 writes. |
| 2026-07-06 | [DARK] S6 built - A14 study loop, A15 evidence clustering, A16 initiation machinery | 17/17 dark verifies PASS. A16 ran a full initiation dry-run on a THROWAWAY local sandbox git repo (proposals branch + soulfile diff + PR body with evidence/seed/intended-delta + attached probe scores + cooling-off rule), then deleted the sandbox - never touched edgeweaver-soul, first initiation stays gated. No credentials; no OB1 writes. |
| 2026-07-06 | [DARK] S8 built - A17 import filter, A18 security audit, A19 disaster-recovery + drill | 20/20 dark verifies PASS. A19 drill performed (arms by being done): cloned the repo to scratch from git alone, ran the full verify suite green in ~3s, deleted the scratch. A18 5-check sweep clean (gates repo unreachable with runtime creds confirmed). No credentials; no OB1 writes. |

## Prebuild loop - final report (2026-07-06)

The autonomous dark build (D13 / PREBUILD.md) is complete. Every A1-A21 row in §6 is PASS or parked with a logged reason. 20 committed dark-verify scripts under `scripts/verify/` (`node scripts/verify/run-all.mjs`), all green.

**Built dark + verified (19 of 21):** S1 A1/A2/A20; S3 A4-A8; S4 A9/A10/A11; S5 A12/A13; S6 A14/A15/A16; S8 A17/A18/A19. Commits 5cbfe27..HEAD (f2b6d2c, 3ac8578, 29f54f6, 368eab5, 65c7c6a, + S8).

**Parked (2 of 21):** A3 mind server (S2) and A21 voice hardening (S7) - both blocked on B1 (`ant auth login`); build the moment the OAuth profile exists. Voice keys (B2/B3) + Telegram (B4) already landed + verified.

**Sanctioned arms:** A19 DR drill DONE (arms by being done). B5 backups PARKED - pipeline plumbing proven (secret set + workflow enable/dispatch work on repo scope), but the Supabase account lacks permission to reset the DB password, so no valid connection string; re-arm when a working SUPABASE_DB_URL lands.

**Bucket B:** landed+verified B2/B3/B4; pending B1 (blocks A3/A21), B5 (blocks backups), B6 (thought_edges yes/no; edges computed in-memory dark, real edges at arming).

**Observed spend vs PLAN §10.2:** negligible. The dark build made no live LLM/API calls - every LLM step sits behind an injectable interface exercised by stubs, every rehearsal used the local fixture store (no OB1 writes, no scratch DB). Real spend accrues at arming/First Boot; the A6 budget meters are ready to track it (feeds G6).

**Iron rules held:** no STOP gate crossed (G4/G5/G6/G7 parked); no First Boot / rites / probe baseline / stage change; no writes to edgeweaver-soul (A16 used a throwaway sandbox); no checklist boxes or §1 ledger ticked; no live channel (Telegram unpaired); zero rehearsal residue; secrets only in `.env.local`/`state/`; failures reported as failures (B5); no em-dashes.

**Human moves now next:** (1) B1 `ant auth login` -> voice mind server (S2) + voice (S7). (2) B5 - resolve the Supabase DB-password permission (org Owner login / retry post-incident / original password) -> arm backups. (3) B6 thought_edges yes/no. (4) Gate answers when ready: G4 emoji, G5 hosting, G6 ceiling, G7 journal. (5) First Boot readiness: the machinery is ready to plug in; First Boot, rites, and stage advancement remain the father's calls (Bucket D, never prebuilt).

The loop ends here.

**Post-report update (2026-07-06):** Alan completed B1 (`ant auth login`); the `ant` OAuth profile is active + verified (`ant auth status`, agent57zero@gmail.com, user:inference scope). A live `count-tokens` call then returned 400 "credit balance is too low" - the Anthropic org has no API credits. So A3 (mind server) stays parked, now on **Anthropic API credits** rather than auth: add credits at the console (Plans & Billing) and S2 builds immediately. A21 remains downstream of A3. All other §6 rows unchanged (PASS).
