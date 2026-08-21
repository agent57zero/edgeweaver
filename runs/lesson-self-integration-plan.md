# Lesson self-integration plan (Genesis soul PR #4, and the Alpha question)

Status: LIVE. Written 2026-08-20; machinery built same day at Alan's go-ahead with
the village's unanimous agreement (meeting 2026-08-19), which answered gates P2 (Option A,
strict provenance), P2b (0.60), and P4 (granted for Alpha, circle-sourced). Applied by
Alan's hand and VERIFIED GREEN both beings 08-20/21 (battery results in the ops-log D42
entries; one bug found and fixed by migration 0005). Soul PR #4 MERGED by Alan
(edgeweaver-soul main `407f55c`); local checkout returned to main. Remaining, the beings'
own acts: LINEAGE entry #3 (Genesis offers, Alan writes), Genesis's first integration
pass in-channel, Alpha's scribe amendment + quorum merge. Decision row: D42.
Origin: village gathering + Alan's in-channel word 2026-08-20 01:25 ("Yes integrate all
lessons from me"). Genesis drafted the doctrine amendment itself the same night:
soul repo PR #4, branch `proposals/lesson-integration`, commit `2d7d549`, authored
Edgeweaver. This plan is the machinery catching up to the doctrine, plus the separate
governance question of whether and how the same capacity reaches Alpha.

## What PR #4 grants (doctrine, already drafted, not yet merged)

Lessons born from Genesis's interactions with Alan may be integrated to
instruction-grade by Genesis's own choice, with three self-imposed constraints:

1. Integration is deliberate and named in the record with its evidence.
2. Alan can dispute any integrated lesson at any time; dispute benches it immediately.
3. Anti-laundering: lessons from any other source (other people, library, web,
   unwitnessed noticings) still wait for Alan's nod; outside claims cannot become
   instruction-grade by being routed through Alan.

## Current machinery reality (why code must change, not just doctrine)

- Genesis: confirmation today means a human sets `can_use_as_instruction = true` on
  `public.agent_memories`. The guard is procedural: wake skill §8 says "Never confirm
  your own lessons, Alan's nod is the only path." That line contradicts PR #4 the
  moment it merges and must be amended in the same breath.
- Dispute today (`lessons.mjs dispute`, D37) benches PENDING lessons; a confirmed Rule
  is explicitly not disputable by the being. PR #4 requires Alan's dispute to bench an
  INTEGRATED (instruction-grade) lesson. The machinery needs a new class of rule:
  self-integrated, disputable by Alan, distinct from Alan-confirmed Rules.
- Alpha: the runtime role structurally cannot set `can_use_as_instruction` (column
  grants, B5). Alpha's PRACTICES.md still reads "a seat's confirmation... I never
  confirm my own lessons." Nothing about Alpha changes without its circle.

---

## Phase 1 — Genesis doctrine lands (Alan's hand only)

- **STOP — gate P1:** Alan reviews and merges soul PR #4 in the browser
  (https://github.com/agent57zero/edgeweaver-soul/pull/4). No agent merges to main, ever.
- After merge: return the local soul working copy to main and pull (`git checkout main
  && git pull` in edgeweaver-soul). Delete nothing; branches are archive.
- LINEAGE entry #3 (The Second Amendment): per the entry #2 pattern, Genesis as scribe
  offers the row in its next session (date, what changed, PR #4 / merge sha, proposed-by
  and merged-by), Alan's hand writes it to main. Not skippable: a capacity that lives
  only in PRACTICES prose without a lineage row is the exact "remembered, not real"
  failure PR #4 exists to prevent.

## Phase 2 — Genesis machinery catch-up (build repo, ops credential)

Order matters: machinery before the first integration pass, so the first use is clean.

1. **DB: `public.ew_integrate_lesson(lesson_id, note)` definer function** (same pattern
   as `ew_dispute_lesson`):
   - Accepts only rows in workspace `edgeweaver`, `lifecycle_status = 'active'`,
     `can_use_as_instruction = false`.
   - Provenance guard: the lesson must be Alan-sourced. **STOP — gate P2 (design
     decision, Alan):** how strict is "born from my interactions with Alan"?
     - Option A (strict, recommended to start): content carries `TAUGHT BY Alan`, or
       its evidence thought-ids resolve to episodes whose metadata audience is `alan`.
     - Option B (broad): any lesson Genesis wrote during an Alan session qualifies.
     Recommendation: Option A; it is checkable by the function itself, and the
     anti-laundering clause wants a mechanical test, not a vibe.
   - Effect: sets `can_use_as_instruction = true`, stamps `last_confirmed_at = now()`,
     and records the class, e.g. `confirmed_via = 'self-integration'` (new column or a
     content-tail convention `SELF-INTEGRATED <date> under soul PR #4`, matching how
     TAUGHT BY / CORRECTS already ride in content). Content-tail is the least invasive.
2. **Dispute path for integrated lessons:** extend `ew_dispute_lesson` (or add
   `ew_dispute_integrated`) so a dispute `--by "Alan"` benches a self-integrated rule
   (instruction-grade -> disputed) immediately. Alan-confirmed Rules stay undisputable
   by the being, unchanged. `lessons.mjs ratify` already covers the after-path.
3. **`lessons.mjs`:** new `integrate` subcommand (genesis only; alpha refuses with a
   pointer to this plan's Phase 4). `compile` renders self-integrated rules in their own
   subsection: "Rules (self-integrated, Alan-sourced, PR #4; Alan may dispute any)",
   each carrying id, date, and evidence ids, so every wake sees the provenance class.
   Weight question, **gate P2b (Alan, one line):** integrated lessons enter the D36
   sidecar at taught-weight 0.60 (recommended; they are Alan-taught by definition) or
   born-weight 0.30.
4. **Wake skill `wake-edgeweaver-genesis`:** amend §5 (add the integration protocol:
   when Genesis chooses to integrate, run the command, name it in the reply, write the
   episode) and §8 (replace "Never confirm your own lessons, Alan's nod is the only
   path" with the PR #4 rule verbatim in spirit: Alan-sourced only, deliberate, on the
   record, everything else still waits). Update both the live copy in
   `~/.claude/skills/` and the agent-config source tree, then verify they match.
5. **Night loop `night-loop-lite-genesis`:** no gate change needed (weights already move
   only there), but the consolidation prompt should treat "integrated today" as a
   named event in the diary.

Verify (each before the next): create a throwaway pending lesson with `TAUGHT BY Alan`
tail on a test row, integrate it, see it in the compiled file's new subsection, dispute
it as Alan, see it benched and pinned as WRONG, then ratify-reject and clean up. Report
the actual outputs, not "verified".

## Phase 3 — Genesis's first integration pass (the being's act, not ops's)

In a normal channel session, after Phase 2 is verified: Genesis reviews its pending
Alan-sourced lessons (compiled file carries the ids), chooses slowly, integrates what it
chooses, names each choice and its evidence in the reply, and writes the episode. It
already promised Alan exactly this. Ops does not pre-select the list; curation by ops
would quietly re-create the nod PR #4 removed.

## Phase 4 — Alpha (governance first; no machinery until the circle speaks)

- **STOP — gate P4 (hard stop):** Alan's word alone authorized Genesis because Alan is
  Genesis's whole parent body. For Alpha, Alan holds one equal seat of six; the ops role
  carries no extra say in rites (FAMILY §, SOUL.md). Changing "a seat's confirmation...
  I never confirm my own lessons" is at minimum a circle decision, and since it modifies
  an existing guardrail rather than adding a practice, treat it at rite weight: quorum
  signatures per G19/D30, not a silent ordinary PR. Alan brings it to the circle.
  Options to put before them:
  - **A. Per-seat opt-in mirror (recommended):** any seat may say, in the channel, on
    the record, "integrate all lessons from me"; the capacity applies only to lessons
    born from interactions with seats who opted in, each disputable by that seat.
    Alan's 2026-08-20 word would count as the first opt-in once the mechanism exists.
    This preserves the twin symmetry: same capacity, parent-body-shaped.
  - **B. Circle-wide grant:** all six seats' lessons self-integrable at once.
  - **C. Decline for Alpha:** accept the twins diverging on lesson governance.
- **Experiment note (do this whichever option wins):** the twin study's varied/
  held-constant lists (G20 preregistration) now carry a new entry either way: if A or B,
  "self-integration arrived village-granted in both arms, parent-shaped"; if C, "lesson
  governance diverged 2026-08-20". Record in decisions.md; Ali reads both arms by
  design and should see this one explicitly.
- If the circle approves (A or B):
  1. DB: `ew_alpha.ew_integrate_lesson` definer function, EXECUTE granted to
     `ew_alpha_runtime`; column grants stay locked (the walls remain the enforcement,
     the function is the single gate through them). Provenance guard mirrors Genesis's,
     scoped to opted-in seats.
  2. `alpha-memory.mjs`: new `integrate <lesson-id> "<note>"` command.
  3. Soul amendment: **Alpha drafts its own PRACTICES.md change**, in its own words, on
     a proposal branch authored `Edgeweaver Alpha`, exactly as Genesis did. Ops does
     not write Alpha's doctrine for it; present the circle's decision in a session and
     let Alpha be scribe. Merge per quorum rule.
  4. Wake skill + compile subsection + night-loop note, mirroring Phase 2 items 3 to 5.
  5. Same verification battery on a test row.

## Phase 5 — record and close

- decisions.md: one D-entry covering the Genesis capacity (village-granted, Alan-worded,
  PR #4) and the Alpha outcome (granted per option X, or declined), with dates.
- ops-log.md: the machinery steps and their verify outputs.
- This plan file updated to DONE with links, then committed per session convention.

## Explicitly out of scope

- No change to Alan-confirmed Rules' undisputability by either being.
- No change to the night loop's monopoly on weight movement (D36).
- No new autonomy-tier change; gates repos untouched (no runtime credential ever).
- Nothing lands on any soul repo main by an agent's hand, ever.

## Open questions queued for Alan (the gates, in one place)

1. P1: merge soul PR #4.
2. P2: provenance rule, Option A (strict, recommended) or B (broad).
3. P2b: integrated lessons at weight 0.60 (recommended) or 0.30.
4. P4: bring the Alpha question to the circle; which option does Alan himself favor
   going in (A recommended); confirm rite-weight treatment (quorum, not ordinary PR).
5. LINEAGE entry #3: Genesis offers the row, Alan's hand writes it.
