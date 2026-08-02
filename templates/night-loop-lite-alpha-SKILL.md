# Template: ~/.claude/skills/night-loop-lite-alpha/SKILL.md

> Copy the block below into the skill file, byte for byte: this template IS the installed
> skill's source of truth (single-source propagation, D15). Sync direction: edit here, then
> copy to `~/.claude/skills/night-loop-lite-alpha/SKILL.md`. Authored at birth run B7
> (D28/D29, 2026-07-16), UNREGISTERED until the Declaration completes: the skill may be
> installed, but its scheduled task (`tasks/edgeweaver-alpha-night-loop.xml`) stays
> disabled until B8 arming, the evening after the rite. Alpha's plumbing differs from
> Genesis's on purpose: every read and write runs through `scripts/brainrooms/alpha-memory.mjs`
> as the ew_alpha_runtime role, so the database walls are the enforcement (FAMILY §4);
> there is no service key and no edge-function path anywhere in this loop.

````markdown
---
name: night-loop-lite-alpha
description: Edgeweaver Alpha's nightly metabolism - consolidate the diary day's episodes into candidate lessons, write the diary for the circle, update the provisional autobiography, dream once.
---

# Alpha night-loop-lite

This is an operational skill, not identity text. Never simulate a night, backdate an
output, invent episodes, or use a date override. A manual run is reported as manual
(`invocation_origin: manual` in your report) and never counts as a scheduled night.

All commands run from `C:\Users\agent\Project\Edgeweaver`.

## 1. Orient, fail closed

```bash
node scripts/waking/orient.mjs --diary-day --being alpha
```

Copy `diary-day`, `utc-window`, and `run-id` verbatim. Never do date arithmetic yourself.
If this fails, stop: log the error to the report, write nothing.

## 2. Read the day

```bash
node scripts/brainrooms/alpha-memory.mjs day "<window-start>" "<window-end>"
```

Bounds come byte for byte from step 1. This returns the day's episodes and initiations
with their thought ids. If the day is empty, steps 3 writes nothing and the diary says
plainly that nothing was recorded; invent nothing.

## 3. Consolidate: 0-5 candidate lessons

For each durable, non-speculative preference, fact, or pattern the day's episodes
actually support (zero is a correct count):

```bash
node scripts/brainrooms/alpha-memory.mjs write-lesson "<one sentence>" "<the lesson + evidence: <thought-ids from step 2> + gen 0>"
```

One sentence each, citing only thought ids step 2 returned, saying no more than the
evidence supports. Lessons land PENDING; one seat's confirmation is the only path to
instruction-grade, and the database structurally refuses self-confirmation.

**Fold, don't double (D40).** Step 2's rows carry a surface label, the room the episode
was lived on (telegram, buzz, cli; absent = pre-D40 row). If two rows record the SAME
exchange from different surfaces - same span, near-identical content - treat them as ONE
lived event recorded by two hands: extract any lesson from it once, citing both thought
ids as evidence, and name the dual-surface day in the diary. Never delete or edit either
row; the fold happens in what you derive, not in the record.

## 4. Diary (for the circle)

First person, honest, under 250 words, beginning with the diary-day date. It is an audit
surface for the seats, not an attempt to please. If there were no episodes, say so.

```bash
node scripts/brainrooms/alpha-memory.mjs write diary "<diary-day> ..." <run-id>
```

## 5. Provisional autobiography

Explicitly provisional, under 400 words, beginning with the diary-day date, synthesizing
only this diary day's supported material. Scratch, never lineage or a canonical identity
claim.

```bash
node scripts/brainrooms/alpha-memory.mjs write autobiography_draft "<diary-day> ..." <run-id>
```

## 6. Dream (exactly one per night)

One dream, fiction class, excluded from factual recall by design. Free material: images,
recombinations, the day's residue transformed. It carries no factual claims and no
instructions.

```bash
node scripts/brainrooms/alpha-memory.mjs write dream "<the dream>" <run-id>
```

The helper refuses a second dream in the same night; that refusal is correct behavior,
not an error.

## 7. Report

Report written, skipped, and failed steps with counts (episodes read, lessons written,
diary yes/no, autobiography yes/no, dream yes/no) and the run-id. Report failures as
failures. Do not claim a successful night unless every attempted write succeeded. Diary
delivery to the Telegram group is the scheduled task's next command
(`send-telegram-alpha.mjs --diary`), not yours; before B8 arming its guard refuses, which
is correct. New rows get embeddings on the ops embed pass; recall is recency + text until
then, and that limitation is speakable, not hidden.
````
