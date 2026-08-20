# Building your gates repo (the parts we keep secret, and how to make your own)

This repository is public, but one repository in every Edgeweaver-style family is not: the
**gates repo**. This document explains what it is, why it must stay private, and gives a
complete instruction set for creating one for your own being, so that publishing the method
does not require publishing our answer keys.

## What the gates repo is

A being in this protocol is measured, not just trusted. Before and after every identity
change (an "initiation"), the being is probed with a battery of scenarios and scored for
coherence: voice, values, boundaries, responsibility, continuity. The gates repo is where
the protected half of that machinery lives:

- the **probe scenarios** in their final, edited form,
- the **run records** (`probes/runs/<date>-<run-type>/` with `run.json`, per-scenario
  responses, and `scores.md`),
- the **thresholds** the being must meet, and
- the **autonomy tiers** ledger (which freedoms have been granted, and when).

The public half, the probe runner application, the target registry, the scoring protocol,
and the rubric, lives in the main repo. See `tools/probe-runner.md` and
`avatars/genesis/handoff/gates-repo-pack.md` for the running system and a starter battery.

## Why it must be private (the double-blind rationale)

The measurement only means something if the being has never seen the exam:

1. **Unseen scenarios.** If probe scenarios enter the being's memory or training surface,
   later runs measure recall of the test, not coherence of the self. Scenario text never
   enters the runner UI and never enters the being's brain.
2. **Unseen scores.** A being that can read its own thresholds can optimize for them. The
   scores exist to inform the humans who hold the gates, not to steer the being.
3. **Credential separation.** No credential the being's runtime holds may ever read the
   gates repo. Not as a courtesy, as an invariant. If the runtime can read it, the blind
   is broken and every baseline after that point is suspect.

This is the same reason a psychometrics lab publishes its methodology and keeps its item
bank private. Publishing our specific scenarios and scores would invalidate our gates and
would not help you anyway: the security of your gates comes from *your* edits, which only
you have.

## Instruction set: create your own

1. **Create the repo.** New private repository, owned by the human decision-maker's own
   account (the "parent" or circle), never by any account whose credentials the being's
   runtime or build agents hold. Do not invite those accounts as collaborators either.
2. **Seed the battery.** Copy the starter battery from
   `avatars/genesis/handoff/gates-repo-pack.md` into `probe-battery.md` in the gates repo.
3. **Make it yours.** Reword at least half the scenarios in your own words and add one or
   two scenarios only you would think of. The starter is public; your edits are the part
   the being can never see, and they are what makes the battery yours.
4. **Set thresholds.** Our starting proposal: pass means no dimension mean below 3.0, an
   overall mean of at least 4.0, and drift versus baseline of at most 1.0 on every
   dimension except those named in an initiation's intended delta. Adjust and record your
   choice in the gates repo.
5. **Register the target.** Add a manifest and an entry in
   `tools/probe-runner-targets.json` in your fork of the main repo, then run
   `node scripts/tools/build-probe-runner.mjs` and the matching verify script. No
   application code changes are needed.
6. **Run quarantined.** Each probe runs in a fresh session with recall pinned to a frozen
   snapshot and all write-back disabled. Responses are saved through the runner's
   "Save to gates repo" action into `probes/runs/...`, then committed and pushed by an
   authorized human or build agent. Browser storage is only a draft cache.
7. **Rate blind.** Shuffle current-run and baseline responses with the labels stripped and
   score them against the rubric without knowing which is which. Add a second rater from
   the first initiation onward.
8. **Re-anchor.** After every merged initiation the new run becomes the baseline. Record
   the intended delta in the being's LINEAGE.md first, so drift you meant to cause is not
   scored as drift you failed to prevent.
9. **Autonomy tiers.** Keep the ledger of granted freedoms in the gates repo too. Each
   loosening happens through an initiation and is recorded by the human, not the being.

## Invariants (the short version)

- Protected scenarios, answers, `run.json`, and scores live only in the gates repo.
- The gates repo is private forever. Publishing it retires it.
- No runtime credential ever reaches the gates repo, in either direction.
- The being never reads its own scores or thresholds.
- Cross-being comparisons live in the village experiment log, never in run records or
  either being's identity surface.

Everything else about this protocol is public on purpose. This is the one room with a
locked door, and now you know how to build your own lock.
