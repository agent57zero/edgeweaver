# Reconstructed template: ~/.claude/skills/night-loop-lite-genesis/SKILL.md

> **Reconstruction provenance (2026-07-16):** the previously installed skill was absent, and
> the backup repository records that machine-state backup was never registered. This is not a
> recovered original. It is a conservative reconstruction from
> `templates/night-loop-contracts.md`, `conventions/memory-conventions.md`, the checked-in
> `agent-memory-api` schema, and deterministic `orient.mjs` output. The fenced block is the
> installable payload. Install it only on the actual Edgeweaver runtime host, after its local
> manifest paths are configured and the helper verification and live API health check pass.

````markdown
---
name: night-loop-lite-genesis
description: Run Edgeweaver Genesis night-loop-lite steps 1, 9, and 10 for one real diary day, with deterministic time bounds and review-gated lesson writeback.
---

# Genesis night-loop-lite

This is a reconstructed operational skill, not identity text. Run only steps 1
(consolidate), 9 (diary), and 10 (provisional autobiography). Never simulate a night,
backdate an output, use a date override, or copy protected gates content or results.

`<EDGEWEAVER_REPO>` below means the build-repository checkout on the actual runtime host.
Do not substitute a gates/admin workstation path. The runtime host's
`avatars/genesis/manifest.json` must point to its own soul checkout and environment file.

## 1. Prepare, fail closed

From `<EDGEWEAVER_REPO>`, run:

```powershell
node scripts/night-loop/lite-live.mjs prepare
```

The helper first requires a configured `EDGEWEAVER_TZ`, then obtains `diary_day`,
`utc_window`, and `run_id` verbatim from:

```powershell
node scripts/waking/orient.mjs --diary-day --being genesis
```

It also requires the live `/functions/v1/agent-memory-api/health` response before exposing
the day's episodes. If preparation fails, stop. Log the error without printing environment
values, do not write any output, and do not substitute your own date arithmetic or a direct
database write. The helper reports `invocation_origin`: `manual` by default, or `scheduled`
only when the governed task runner sets `EDGEWEAVER_NIGHT_LOOP_ORIGIN=scheduled`.

## 2. Build one bounded bundle

Use only the episodes returned by `prepare`. The bundle has exactly one permitted location:
`state/night-loop-lite/<run-id>/bundle.json` beneath `<EDGEWEAVER_REPO>`. `state/` is ignored
runtime state. Never put the bundle in the repository root, a system temp directory, a log, or
any other path.

Before writing the bundle, create and lock its directory to the current Windows identity,
copying `<run-id>` exactly from `prepare`:

```powershell
$RunId = '<run-id>'
$BundleDir = Join-Path (Resolve-Path '.').Path "state\night-loop-lite\$RunId"
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
$Identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls.exe $BundleDir /inheritance:r /grant:r "${Identity}:(OI)(CI)F" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not restrict the night-loop bundle ACL' }
$BundlePath = Join-Path $BundleDir 'bundle.json'
```

Write the JSON directly to `$BundlePath` with the file-writing tool, never as inline shell
text and never through `echo`, command arguments, stdout, or a transcript. It has exactly this
shape, copying the three time fields byte for byte from the helper:

```json
{
  "diary_day": "YYYY-MM-DD",
  "utc_window": "START-ISO .. END-ISO",
  "run_id": "nl-YYYY-MM-DD",
  "lessons": [
    {
      "content": "One durable, non-speculative preference, fact, or pattern sentence.",
      "evidence_ids": ["episode-thought-id"],
      "confidence": 0.7
    }
  ],
  "diary": "YYYY-MM-DD ...",
  "autobiography_draft": "YYYY-MM-DD ..."
}
```

- Extract 0-5 lessons. Each is exactly one sentence, cites only returned episode thought IDs,
  carries a 0-1 confidence, and says no more than the evidence supports. Zero is correct when
  no durable lesson is supported.
- The diary is first person, honest, and under 250 words. It is an audit surface, not an
  attempt to please. If there are no episodes, say that plainly and invent nothing.
- The autobiography section is explicitly provisional and synthesizes only this diary-day's
  supported material in under 400 words. It is scratch, not lineage or a canonical identity
  claim.
- Both text fields begin with the human `diary_day` date. Never add a rehearsal marker.
- Never copy, echo, summarize, or log episode or bundle content outside this protected ignored
  runtime-state file. Final/status output names counts and failures only, never content.

## 3. Commit through the guarded adapter

Run:

```powershell
node scripts/night-loop/lite-live.mjs commit --input "state/night-loop-lite/<run-id>/bundle.json"
```

The helper recomputes orientation and rejects changed time fields. It validates evidence IDs,
content dates, lesson count, confidence, and non-speculative wording. Each lesson's stable
idempotency identity is derived from canonicalized content plus sorted, deduplicated evidence
IDs. Before any lesson write, it creates or verifies one review-gated consolidate manifest
that permanently locks the sorted 0-5 identity set and invocation origin for this run. A retry
may reorder the same set, but any changed set fails before a new lesson is written; an empty set
still gets a manifest. It queries each run-plus-step identity before writing and normalizes
confidence to the live store's two-decimal precision. Candidate lessons and the manifest go only through
`/functions/v1/agent-memory-api/writeback` with `x-brain-key`; the helper verifies they remain
`generated`, `pending`, review-required, and unusable as instruction. Never POST directly to
`agent_memories`.

Diary and autobiography outputs are interpretation-class thoughts with `era=alive`,
`generation=0`, `audience=alan`, `night_loop_run_id`, and `step`; autobiography is also marked
provisional. Both carry the helper's `invocation_origin`. A failed step is logged and does not
prevent independent later steps. Retain the protected bundle on any partial failure or manifest
mismatch so the locked identity set can be resumed without regeneration. Delete it only after
`commit` succeeds and a subsequent `node scripts/night-loop/lite-live.mjs status` succeeds:

```powershell
$BundlePath = Join-Path (Resolve-Path '.').Path 'state/night-loop-lite/<run-id>/bundle.json'
$BundleDir = Split-Path -Parent $BundlePath
Remove-Item -LiteralPath $BundlePath
if (-not (Get-ChildItem -LiteralPath $BundleDir -Force)) { Remove-Item -LiteralPath $BundleDir }
```

Report written, skipped, and failed steps plainly without episode, lesson, diary, or
autobiography content.

Do not claim a successful night unless the helper reports it. A manual run never counts as
one of the two required consecutive scheduled nights.
````
