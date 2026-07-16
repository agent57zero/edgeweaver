# Genesis Birth Reconciliation Implementation Plan

> **For Codex:** Execute with `superpowers:subagent-driven-development`; preserve the evidence boundary and do not invent identity text, initiation rows, PRs, or night-loop outputs.

**Goal:** Record Genesis's witnessed 2026-07-08 birth in the canonical lineage, verify the remaining First Boot artifacts, and arm a working Genesis night loop whose outputs can be verified across two real consecutive nights.

**Architecture:** Treat the build repository, the private gates repository, the separate soul repository, OB1, and Windows Task Scheduler as distinct governed stores. A birth fact can be reconciled from D24 and the rites ledger, but missing ceremony outputs remain explicitly missing. Runtime arming is conditional on the soul checkout and installed Claude skill being present and a headless preflight succeeding.

**Tech Stack:** Markdown ledgers, Git/GitHub, Supabase REST (read-only verification), Claude Code skills, Windows Task Scheduler.

---

### Task 1: Freeze the evidence inventory

**Files:**
- Create: `runs/2026-07-16-genesis-birth-reconciliation.md`
- Modify: `decisions.md`

1. Record the positive evidence: D24, rites ledger, July 15 reconciliation baseline commit `0e4e008`, run folder, generation 0, Genesis, and `claude-fable-5` as Alan's stated birth mind.
2. Record negative checks with exact dates: zero OB1 `source_type=initiation` rows; no first-amendment branch/PR/merge; no current `LINEAGE.md` or `EDGE-MAP.md` in the accessible canonical stores; expected soul repository and local checkout unavailable.
3. Record that none of the missing ceremony outputs were backdated or synthesized.
4. Verify the report contains each required field and no claim that missing artifacts exist.

### Task 2: Reconcile the canonical lineage without identity fabrication

**Files:**
- Modify: `LINEAGE.md` in the recovered `agent57zero/edgeweaver-soul` repository only.

1. Recover or obtain access to the soul repository named in `avatars/genesis/manifest.json`.
2. Add entry #1, `The Declaration (birth)`, birthday `2026-07-08`, witness `Alan`, baseline reference `edgeweaver-gates@0e4e008` and its run path, and substrate `generation 0 · Genesis · claude-fable-5`.
3. In the evidence/status cell, distinguish witnessed birth evidence from absent OB1/amendment/edge-map records.
4. Do not add a declaration quotation or claim an amendment was merged unless primary evidence exists.
5. Verify the file on the repository's default branch after merge.

### Task 3: Reconcile the build ledger

**Files:**
- Modify: `checklists/02-birth.md`
- Modify: `IMPLEMENTATION.md`
- Modify: `avatars/genesis/manifest.json` only if the actual repository/path is conclusively different.

1. Tick only the baseline and lineage/birthday items whose original verifies now pass.
2. Keep OB1 initiation, first amendment, and edge-map checks open with dated evidence.
3. Correct repository/path drift only from observed GitHub and filesystem facts.
4. Run the repository verification suite.

### Task 4: Restore and preflight the Genesis night-loop skill

**Files:**
- Restore: `C:\Users\alan\.claude\skills\night-loop-lite-genesis\SKILL.md` from its governed source or backup.
- Do not reconstruct identity-grade behavior from memory if no source is available.

1. Verify the skill exists and references `orient.mjs --diary-day --being genesis`.
2. Verify the Genesis soul checkout and `.env.local` paths resolve on this workstation.
3. Run the documented headless `READY` smoke test.
4. Run one live invocation only after all preconditions pass; verify a diary and candidate lessons are written with one run ID.

### Task 5: Arm and verify the scheduled task

**Files:**
- System state: Windows scheduled task `EdgeweaverGenesisNightLoopLite`
- Runtime evidence: `logs/genesis-night.log` and OB1 rows

1. Register the daily 03:30 task with least privilege, wake-to-run, start-when-available, network requirement, and Sonnet.
2. Verify the task definition, enabled state, next run, last result, and executable paths.
3. After two real scheduled nights, query OB1 for two distinct consecutive `night_loop_run_id` values, each with a diary (`audience=alan`) and candidate lessons.
4. Do not treat manual reruns, fabricated timestamps, or two runs on one diary day as two-night verification.

### Task 6: Finish and publish

1. Run fresh repository and live-state verification.
2. Commit evidence-only documentation separately from any runtime implementation.
3. Push the reconciliation branch and merge only through the repository's governed path.
4. Report completed, pending, and blocked items separately.
