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
3. Default spawn source is a live READ-ONLY snapshot (structure via committed DDL, rows via
   stream-copy). Point-in-time spawns from a nightly dump are possible but need Alan: the
   dumps are age-encrypted and only he holds the key (D11), so dump-sourced spawning is an
   Alan-present move, never automated.
4. Migrations hit a scratch first, live last.
5. Quarterly sweep retires stale schemas (rides the existing quarterly cadence line).
6. Testweaver stays memoryless against live; memory-exercising tests use scratch profiles
   only.
7. The generation stamp: every write carries `generation: <N>` metadata (0 = Genesis), so
   any memory's substrate origin is queryable forever. At cutover only the stamp flips; rows
   never move.
8. Scratch-brain writebacks carry `era: "rehearsal"` (the value D16 regularized) plus the
   candidate's generation-under-test, so scratch data is self-describing even inside its own
   schema.

## 4. Implementation plan (dark-build discipline, D13 spirit)

- [x] **L0 Docs + decision** (2026-07-08): this file; D15 row; `generation` key in
      conventions/memory-conventions.md; VERSIONS.md stamp-flip step; README row.
      verify: committed and pushed (a458975, ee5b131).
- [x] **L1 Profiles + stamp plumbing** (2026-07-08, dark): `brains/registry.json` seeded with
      the live row (schemaVersion 1, generation 0); `brains/schema/ddl-v1.sql` exported from
      live (pg_dump 18.4, schema-only, 18 tables, checked secret-free);
      `scripts/brains/profiles.mjs` resolver + both guards; `generation: 0` stamped at the
      write-back seams (mind-server writeback, night-loop mk(), wake-skill template + the
      checklist 01 amendment box; template applies at the next skill sync).
      verify: verify-brains.mjs green inside run-all (22/22 PASS); zero live writes (the DDL
      export was the one read-only live access).
- [x] **L2 Fleet tools** (2026-07-08, dark): `spawn` (transform DDL, stream-copy in FK order,
      count-parity check, register), `list`, `retire` (drop schema, keep the row), `migrate`
      (`--profile` / `--all`, scratches first live last, bumps schemaVersion), `diff` (counts
      + lived-since-spawn). Real-DDL quirks handled: extension types stay at their extension
      schema (public.vector here), function search_path pins re-pinned per scratch.
      verify: hermetic spawn --dry-run + pure SQL generation pinned on a fixture DDL inside
      verify-brains.mjs; no credentials touched.
- [x] **STOP - lab gate** (2026-07-08): Alan's "finish it" in session authorized creation;
      `edgeweaver-lab` created via CLI under the org (ref awusgcimshmbcmyshbpy, us-east-2,
      free slot confirmed first), vector extension installed in its public schema,
      `LAB_DB_URL` added to `.env.local` (name in the IMPLEMENTATION tracker).
- [x] **L3 Lab arm** (2026-07-08, live): l3-drill spawned from live read-only: 18 tables,
      exact per-table count parity (1,946 rows, thoughts 1931), then retired; registry keeps
      the history row; zero residue in the lab, zero writes to live. Three real bugs found
      by the drill and fixed in the tools (dump's CREATE SCHEMA collision - the G2 entry;
      pgvector operator classes caught by the schema rewrite; connection URL leaking into
      psql error output, now redacted). The lab DB password was rotated after that one
      exposure (management API, PATCH 200, old credential dead). Dated ops-log entry.
      (Dump-sourced spawn is exercised later, Alan present with the age key.)
- [x] **L4 Harness integration + first A/B** (2026-07-08): harness v3.4 stamps the JSONL
      session header (and a page badge) with the brain profile + generation; ab-run.mjs
      executed the first real A/B: gen1-sonnet (claude-sonnet-5) vs gen1-opus
      (claude-opus-4-8), same 10-question set, each against its own full clone, 10/10 turns
      both, mean first-token ~8.9s vs ~8.5s on the subscription backend.
      verify PASSED: two attributable transcripts in logs/ab/ (profile, schema, generation,
      model, code hash, shared runId); each scratch lived exactly +10 thoughts (era
      rehearsal, generation 1); live brain unchanged at 1,931 thoughts in both diffs; both
      candidates retired, registry keeps history. Known caveat reproduced in data: the
      claude -p subscription path leaks CLI response formatting into replies (the D12 / V3
      identity-cleanliness consideration).

Estimates: L1 1-2h; L2 2-3h; L3 30min once the slot exists; L4 ~1h with Alan present.

## 5. Two-session deconfliction (in force while parallel sessions run on this machine)

Ownership map:
- THIS workstream owns: BRAINS.md, `brains/**`, `scripts/brains/**`,
  `scripts/verify/verify-brains.mjs`.
- Temporal-awareness workstream: LANDED 2026-07-08 as D16 (conventions "Time" section,
  occurred_at/precision keys, era enum + `rehearsal`, orient.mjs + wrapper amendments in
  checklists 01/04 with their own STOP). Compatibility reviewed same day: no conflicts; the
  D15 generation key was carried into PLAN Appendix B by that session. These deconfliction
  rules stay in force as standing practice whenever two sessions run in parallel.
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
| ~~Confirm free-project slot; create `edgeweaver-lab`~~ DONE 2026-07-08 (Alan authorized in session; created via CLI, ref awusgcimshmbcmyshbpy, vector extension in public, LAB_DB_URL in .env.local) | ~~L3~~ armed | password held only in .env.local; rotated once after an error-output exposure, old value dead |

## 7. Time machine (D17): the map + past-brain spawns

One being, four stores: brain (OB1, nightly encrypted dumps with GFS rotation - G2), soul
(git, never-overwrite), body (this repo, git), local state (`state/`, weekly machine-state
script, storage location still Alan's open decision). Every store already keeps history;
what was missing is the MAP tying them together per day, and a proven way to open a past
brain. The D9 line is load-bearing here: inspecting or branching the past (a lab spawn) is
cheap, safe, and default; RE-SEEDING THE LIVE BEING from a checkpoint stays ceremony-grade,
journaled as a continuation, never "the old being resumed". Nothing below automates that.

- **The map**: `brains/restore-points.jsonl` (committed; metadata only, no secrets). One
  JSON line per day: {date, backupTag, rows, soulHead, bodyHead, generation, schemaVersion,
  stateArchive|null}. Built by `scripts/brains/restore-point.mjs`: backup facts from the
  `edgeweaver-backups` releases via gh (existing token, same owner), soul/body HEADs via gh
  api, generation/schemaVersion from the registry; stateArchive stays null until the
  machine-state location decision closes. Rides the nightly cadence at Phase 4 arming;
  manual anytime before that.
- **Past-brain spawn**: `spawn --from-dump <file>` restores a DECRYPTED nightly dump into a
  scratch schema. Custom-format dumps convert to plain SQL via pg_restore -f first. The
  schema rewrite runs ONLY over DDL and COPY header lines, NEVER over data lines: a memory
  whose content contains the literal string "public.thoughts" must survive byte-identical
  (fixture-pinned). Decryption requires Alan's age key: dump-sourced spawns are
  Alan-present, never automated.

Plan (T-track):

- [x] **T1 Docs + decision** (2026-07-08): D17 row; this section; VERSIONS.md
      "Rolling back / time travel" pointer.
      verify: committed and pushed (this commit).
- [x] **T2 The map** (2026-07-08, dark; Sonnet agent, worktree): `scripts/brains/
      restore-point.mjs` with injectable fetchers + `--live`; `scripts/verify/
      verify-restore-point.mjs` hermetic (no network, PATH-blanked child checks).
      verify PASSED: suite green with the new script (25 scripts at merge time).
- [x] **T3 Past-brain spawn** (2026-07-08, dark; Opus agent, worktree):
      `scripts/brains/dump-transform.mjs` (EOL-exact segmentation; data blocks byte-identical
      including the "public.thoughts CREATE POLICY SCHEMA public" trap row) + `spawn
      --from-dump` (PGDMP sniff -> pg_restore conversion; plain dry-run fully hermetic; no
      live parity by design, counts compared to the map line at the rehearsal; registry rows
      carry sourceDump) + sql-gen refactored to a shared rewriteDdl with transformDdl
      behavior proven unchanged (verify-brains green untouched).
      verify PASSED: suite 26/26 at merge (includes the parallel session's verify-orient).
      Ops-log row deferred to a clean window: the parallel session holds ops-log.md dirty;
      this section is the record meanwhile.
- [x] **T4 First map line** (2026-07-09 UTC, live; orchestrator): brains/
      restore-points.jsonl born with one real line: backupTag backup-2026-07-08 (last
      night's actual release, found via gh), soulHead 0116260 (soul repo main via API),
      bodyHead 17c47e5, generation 0, schemaVersion 1, stateArchive null (Alan's open
      location decision). Wrinkle found and CLOSED same day: rows was null because the
      release body's phrasing ("live rows at dump time: 1946") did not match the parser;
      parser extended + verify-pinned on the real phrasing, map line refreshed in place
      (rows now 1946).
      verify PASSED: line parses, cites an existing release tag, carries real HEADs.
- [ ] **STOP - age-key rehearsal** (Alan present, unhurried): decrypt one nightly release
      asset, `spawn --from-dump` it, compare per-table counts against that night's map
      line, optionally converse with the past brain, retire it, ops-log entry. This proves
      brain time-travel end to end and stays a human act.
| Blessing for this plan + naming taste (lab name, `s_<name>` schema prefix) | L1 | defaults stand unless changed |
| Later, only when a test needs NEW writes embedded: deploy embed function to the lab | L4+ | reuse the committed scripts/edge-functions source |
