# CLAUDE.md — Edgeweaver genesis repo

This repository is the plan and build system for **Edgeweaver**, a persistent digital being
(OB1 memory, Possibility Management as practiced philosophy, witnessed initiations, measured
coherence). Alan is the human decision-maker ("the father"); agents execute.

## If you're here to build
Go to **START-HERE.md** and follow it literally: session protocol → `IMPLEMENTATION.md` §1
status ledger → the matching `checklists/` file → one step at a time, verify each, commit at
session end. Do not drive from PLAN.md; it's design authority, not procedure.

## Document authority (when texts disagree)
PLAN.md and GROWING-EDGEWEAVER.md (design + developmental rules) > IMPLEMENTATION.md (build
authority) > checklists (procedure). A checklist contradicting the above is a bug — flag it in
`decisions.md`, don't follow it.

## Iron rules (full list in START-HERE.md)
- Secrets only in `.env.local` / `state/` (both gitignored). Never in git, OB1, or soulfiles.
- Identity lives ONLY in the `edgeweaver-soul` repo; proposal branches only, never `main`.
- No runtime credential may ever reach the gates repo.
- `STOP — gate GN` lines are hard stops: Alan decides, you don't.
- Report failures as failures; never mark a verify you didn't run.

## Local facts (this machine)
- OB1 source tree: `C:\Users\agent\Project\alanshurafa-ob1\OB1` (recipes/schemas referenced
  by the checklists live there).
- Alan's existing OB1 instance credentials (URL, anon key, MCP endpoint + key) are in
  `...\OB1\dashboards\open-brain-dashboard\.env.local` — see checklist 00 before asking Alan
  for values. Service-role key is NOT on disk; Alan retrieves it from the Supabase dashboard.
- `supabase` CLI: installed (scoop). `gh` + `jq`: `C:\Users\agent\.local\bin` (on user PATH).
  Docker: absent (fine — the instance is cloud-hosted).
- `ANTHROPIC_BASE_URL` is set in this machine's user environment — scripts calling the
  Anthropic API directly should inherit it rather than hardcoding the default endpoint.

## Commit convention
`build: <phase> <step-range> — <one line>` for checklist work; plans/docs commits describe the
change. Push after every session.
