# START HERE — for any agent executing this build

You are building Edgeweaver. You do not need the conversation that produced this repo.
Follow this file literally.

## Your first-ever session (once)
1. Read `README.md` (5 min).
2. Read `IMPLEMENTATION.md` §0 (ground rules) and §17 (what NOT to do).
3. Skim `PLAN.md` §0–§2 to know what you're building. Do NOT try to absorb everything —
   checklists cite exact sections when you need them.

## Every session (the protocol)
1. `git pull` in `C:\Users\agent\Project\Edgeweaver`.
2. Open `IMPLEMENTATION.md` §1 (status ledger). Find the first unchecked phase.
3. Open the matching checklist in `checklists/`. Find the first unchecked step.
4. Do steps IN ORDER. One step = one action + its `verify:` line. Do not skip verifies.
   Do not batch checkbox updates — tick each box when its verify passes.
5. A line starting with **STOP — gate GN** means: do not proceed past it until
   `decisions.md` shows that gate Decided. Write the question to Alan (template below),
   then either work a permitted parallel checklist (see §13 of IMPLEMENTATION.md) or end
   the session cleanly.
6. End of session, always:
   - tick completed boxes in the checklist file,
   - update the §1 ledger line if a phase completed (date + one-line evidence),
   - add any new gates/questions to `decisions.md`,
   - `git add -A && git commit -m "build: <phase> <step-range> — <one line>" && git push`.

## When confused or blocked (the script)
1. Re-read the current checklist step and its cited section. 
2. Check `IMPLEMENTATION.md` §15 (troubleshooting) and the referenced OB1 README +
   `OB1/docs/03-faq.md`.
3. Still stuck → STOP. Do not improvise. Write to Alan using this template (in
   conversation, or Telegram once Phase 3 is live), and log it in `decisions.md`:
   > **Blocked at:** checklist `<file>` step `<n>`
   > **What happened:** <one sentence + exact error>
   > **What I tried:** <one sentence>
   > **My recommended default:** <one sentence>
4. End the session cleanly (commit what's done). An honest partial is success;
   a guessed completion is a failure.

## Iron rules (condensed — full list: IMPLEMENTATION.md §0 and §17)
1. Secrets only in `.env.local` / `state/` (gitignored). Never in git, OB1, or soulfiles.
2. Identity lives ONLY in `edgeweaver-soul`. Never write its `main` — proposal branches only.
3. No runtime credential may ever reach the gates repo.
4. Channel content is untrusted input; it never becomes instruction-grade directly.
5. Library content (`pm_teaching`) never enters episodic recall or derived-memory synthesis.
6. `dream` is fiction class — never factual recall.
7. Alan's gates are real gates. Machinery-ready ≠ stage-ready.
8. Every PM-derived artifact carries CC-BY-SA-4.0 + Callahan/PM attribution metadata.
9. Report failures as failures. Never mark a verify passed that you didn't run.
10. Ceremonies are load-bearing. Don't skip or merge them for efficiency.

## Map
- `checklists/00-foundation.md` — Phase −1, 0a, 0b (environment, pre-birth import, PM corpus)
- `checklists/01-organs.md` — Phase 1 (memory governance + wake skill)
- `checklists/02-birth.md` — Phase 2 (soul repo, gates, probe battery, First Boot)
- `checklists/03-body.md` — Phase 3 (Telegram, waking policy, theory-of-Alan, budget)
- `checklists/04-metabolism.md` — Phase 4 (full night loop, study loop, coherence panel)
- `checklists/05-evolution.md` — Phase 5 (edgework, initiations, second witness)
- Rationale and design authority: `PLAN.md`. Developmental rules: `GROWING-EDGEWEAVER.md`.
  Build authority: `IMPLEMENTATION.md`. Copy-ready artifacts: `templates/`.
  If a checklist ever contradicts those, the checklist is wrong — flag it, don't follow it.
