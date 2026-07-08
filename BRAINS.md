# BRAINS.md - the brain lab (fleet architecture for testing incarnations)

> How we run many Edgeweavers safely: one sacred live brain, disposable cloned brains for
> candidates, single-source propagation for everything authored. Decided as D15. Versioning
> methodology: VERSIONS.md. Memory rules: conventions/memory-conventions.md.

## 0. The principle

Everything AUTHORED has one source of truth and propagates to every incarnation (soul repo ->
personality; migration files -> schema; this repo -> body code). Everything LIVED diverges by
design (each cloned brain forks at spawn and lives its own life). The live brain is sacred:
test tooling never holds its write credentials. At a real generation cutover nothing migrates;
the new generation inherits the same live brain (VERSIONS.md continuity principle). Rejected
on those grounds: table-per-generation in the live database (fights the OB1 toolchain, splits
one continuous memory, and gives weaker isolation than separate credentials).

## 1. Topology

| Layer | What | Where |
|---|---|---|
| Live brain | `public` schema, untouched by tests | Supabase project "Edgeweaver" |
| The lab | one Postgres schema per scratch brain (`s_<name>`, all 18 tables) | second free Supabase project `edgeweaver-lab` (Alan's queue, §6) |
| Profiles | `EW_BRAIN_PROFILE` resolves to connection + schema in every brain consumer | `brains/registry.json` (metadata, committed) + `.env.local` (values; names-only iron rule) |
| Fleet tools | spawn / list / retire / migrate / diff | `scripts/brains/` |
| Evaluation | same question set or probe battery across profiles; JSONL session logs stamp (code version, mind, brain profile) | harness + `logs/voice/` |

Sizing: one brain is tens of MB (~1,946 rows + embeddings), so the free 500 MB lab holds
roughly 10-20 resident scratches; "dozens over time, a few concurrent" works because
scratches are ephemeral. Overflow options if ever needed: a local Postgres cluster, or an
ephemeral Pro-compute project (billed hourly, ~$2-3 per testing week).

## 2. Propagation model

| Axis | Source of truth | Reaches all incarnations | Deliberate divergence |
|---|---|---|---|
| Personality | `edgeweaver-soul` | next session start (profiles default `soulRef: main`) | pin one profile's `soulRef` to a branch (the natural rehearsal for a soul PR; canon still enters only via the witnessed merge) |
| Schema | DDL + migrations in `brains/schema/` | `migrate --all` walks the registry (scratches first, live last) | apply to one profile only (a memory-architecture experiment; per VERSIONS.md that is generation-boundary material) |
| Body code | this repo | process restart | run a candidate from a branch or config, recorded in its registry row |
| Memory | none, by design | never propagates | forks at spawn (that is the point) |

Guards: registry rows carry `schemaVersion` and `soulRef`, so drift is readable from one
file; consumers refuse to start on a schemaVersion mismatch; the `live` profile refuses to
load in test-mode processes unless explicitly armed (`EW_ALLOW_LIVE=1`).

## 3. Hygiene rules

1. Ephemeral by default: spawn for a test window, retire after. The registry row stays as
   history.
2. Scratch memories are rehearsal-grade and are NEVER bulk-merged into live. Learnings
   promote through the existing review flow (or re-teaching), never row copies.
3. Spawn from a nightly dump for point-in-time; from live READ-ONLY for freshness.
4. Migrations hit a scratch first, live last.
5. Quarterly sweep retires stale schemas (rides the existing quarterly cadence line).
6. Testweaver stays memoryless against live; memory-exercising tests use scratch profiles
   only.
7. The generation stamp: every write carries `generation: <N>` metadata (0 = Genesis), so
   any memory's substrate origin is queryable forever. At cutover only the stamp flips; rows
   never move.

## 4. Implementation plan (dark-build discipline, D13 spirit)

- [ ] **L0 Docs + decision** (this commit): this file; D15 row; `generation` key in
      conventions/memory-conventions.md; VERSIONS.md stamp-flip step; README row.
      verify: committed and pushed.
- [ ] **L1 Profiles + stamp plumbing** (dark; new files + small wiring): `brains/registry.json`
      seeded with the live row (schemaVersion 1); DDL export to `brains/schema/ddl-v1.sql`
      (`pg_dump --schema-only`; structure only, committable); `scripts/brains/profiles.mjs`
      resolver + the two guards; `generation: 0` stamped at the write-back seams (mind-server
      writeback, night-loop writes, wake-skill spec text). Wiring into voice/mind-server.mjs
      waits for a clean window (§5).
      verify: `scripts/verify/verify-brains.mjs` green inside run-all (resolver, guards,
      stamp present on a fixture write); zero live calls.
- [ ] **L2 Fleet tools** (dark): `spawn` (create schema from DDL, stream-copy ~2k rows from a
      dump or live read-only, register), `list`, `retire` (drop schema, mark row), `migrate`
      (`--profile` / `--all`, stamps schemaVersion), `diff` (row counts, new-since-spawn).
      verify: dry-run mode emits correct SQL against fixtures; no credentials touched.
- [ ] **STOP - lab gate**: Alan confirms a free-project slot and creates `edgeweaver-lab`
      (or authorizes creation under the org). Credential tracker gains `LAB_DB_URL`
      (name only).
- [ ] **L3 Lab arm** (live): spawn a scratch from the latest nightly dump; verify row-count
      parity with the backup manifest (18 tables / ~1,946 rows); retire it. Spawn once from
      live read-only; retire. Zero residue; dated ops-log entry.
- [ ] **L4 Harness integration + first A/B**: brain profile in the JSONL session header and a
      page badge; two scratches, one 10-question set, two configs; findings to
      handoff/voice-testing-notes.md.
      verify: two attributable transcripts; live brain row-count unchanged.

Estimates: L1 1-2h; L2 2-3h; L3 30min once the slot exists; L4 ~1h with Alan present.

## 5. Two-session deconfliction (in force while parallel sessions run on this machine)

Ownership map:
- THIS workstream owns: BRAINS.md, `brains/**`, `scripts/brains/**`,
  `scripts/verify/verify-brains.mjs`.
- Temporal-awareness workstream (parallel; currently drafting in
  `runs/temporal-awareness-coevolve.md`): expected to touch wake-skill recall scoring, night
  loop, prompt assembly, temporal metadata. Nothing here blocks it.
- Shared, append-only files, edited in ONE small commit per session: decisions.md (take the
  next free D-number at commit time; this plan claimed D15 while D14 was highest),
  conventions/memory-conventions.md (this workstream adds ONLY the `generation` key),
  VERSIONS.md, README.md, ops-log.md.

Working-tree rules while more than one session is active:
1. `git pull --ff-only` immediately before every commit.
2. Stage NAMED FILES ONLY. START-HERE's session-end `git add -A` is written for solo
   sessions; with parallel sessions it would stage the other session's half-done work.
3. Land shared-file edits early and small; keep long-running work inside owned new files.
4. Before touching a contended file (voice/mind-server.mjs, prompt-assembly.mjs,
   conventions/memory-conventions.md), check `git status` and recent log for the other
   session's activity; if dirty, defer or coordinate through Alan.

## 6. Alan's inputs (the queue for this track)

| What | Unblocks | Notes |
|---|---|---|
| Confirm free-project slot; create `edgeweaver-lab` (or say "create it" and the agent does) | L3 | Supabase dashboard shows the org's active projects; free tier allows 2 |
| Blessing for this plan + naming taste (lab name, `s_<name>` schema prefix) | L1 | defaults stand unless changed |
| Later, only when a test needs NEW writes embedded: deploy embed function to the lab | L4+ | reuse the committed scripts/edge-functions source |
