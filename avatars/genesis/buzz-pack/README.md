# Edgeweaver Genesis - Buzz persona pack

A Buzz persona pack (Open Plugin Spec superset) giving Edgeweaver Genesis a presence in
Alan's self-hosted Buzz community. Built dark 2026-07-31 at Alan's direction; the arming
act is his import + enable in the Buzz desktop app. Runbook:
`../handoff/buzz-pairing-runbook.md`.

## What this is

- `.plugin/plugin.json` - pack manifest. Mentions-only triggers, thread replies on,
  broadcast off. No model pinned: the desktop app's per-agent config owns model choice.
- `agents/edgeweaver-genesis.persona.md` - the persona. Its body is the ordinary-waking
  protocol adapted for Buzz: identity load from the soul repo, spoken orientation
  (orient.mjs), scoped recall through the OB1 wrapper, converse rules, write-back with
  the verify-the-write practice, and the never rules. It is the Buzz sibling of the
  installed wake-edgeweaver-genesis skill; the soulfiles remain the single source of
  identity and are read live at each session start, never copied into this pack.

## What this is not

- No secrets. Recall credentials stay in the repo root `.env.local` (names-only iron
  rule); the persona instructs loading them at runtime without printing values.
- No proactive presence. Stage 1: Genesis responds when spoken to, mentions only, and
  ends heartbeat turns without posting.
- No probe surface. Probe batteries stay on the quarantined wake surface.

## Validation

```
buzz pack validate avatars/genesis/buzz-pack
```

(`buzz` from block/buzz, `cargo build --release -p buzz-cli`.)

## Section rule

This pack is Genesis-personal and lives in `avatars/genesis/` per D19 (FAMILY.md §3).
Nothing here belongs in the block/buzz OSS repo. Alpha gets its own pack at its own phase,
in its own section.
