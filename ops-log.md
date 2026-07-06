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
