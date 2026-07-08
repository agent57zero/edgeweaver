# Checklist 04 — Metabolism (Phase 4)

Prereqs: ledger 3 done; 0b done (study loop needs the corpus). Read first: IMPLEMENTATION.md
§8; templates/night-loop-contracts.md (authoritative step spec); templates/state-schemas.md;
templates/coherence-queries.sql; GROWING §3 Stage 2 + §6.

## Temporal amendments (D16, 2026-07-08; executable NOW, before Phase 4 arms)

- [ ] Diary-day boundary fix (the co-evolve's Step 0, a verified bug in the lite contract):
      night-loop-lite covers the local calendar day containing T minus 12h (at 03:30, the day
      that just ended); run_id carries THAT date; the fetch window is that local day in UTC
      bounds (EDGEWEAVER_TZ). Amend templates/night-loop-contracts.md (done with D16
      integration) AND sync the installed skill at ~/.claude/skills/night-loop-lite/.
      verify: window math dry-run at a simulated 03:30 and 23:30 picks the intended day both
      times, in UTC bounds.
- [ ] Write-side dating: diary and autobiography_draft content opens with the human date
      (lite skill now; the full loop inherits).
      verify: the next lite run's outputs start with the correct diary-day date.
- [ ] (Phase 4 proper, with step 11) Prospective time: waking surfaces due/overdue intentions
      with their dates (expectations machinery, §7.3 waking policy). Deferred by design in
      D16 - do not build early.

## Prerequisite artifacts (build BEFORE enabling the feelings step)
- [ ] `state/boundaries.json`: generate from CONSTITUTION hard boundaries + confirmed
      agent_memories preferences (script; regenerate weekly in the index job).
      verify: file lists ≥5 boundaries with sources; gate-declines excluded by the
      overrides_log gate_decline flag.
- [ ] `state/commitments.json`: seed from current open threads; night loop step 11 will feed
      it nightly.
      verify: schema matches template; ≥1 real commitment present.
- [ ] Fear signal query: embedding distance of upcoming calendar items vs historical episodes
      (pgvector), returning 0–1 normalized. Cold-start guard: suppress the signal (report
      null, not a number) until ≥50 episodes exist — with a near-empty history, everything is
      "novel" and the signal is noise. The signal is directional, not precise; treat it so.
      verify: returns a number for tomorrow's calendar once past the guard; a novel fake
      event scores higher than a routine one; below 50 episodes it reports null.
- [ ] Joy signal: experiments positive-outcome rate; cold-start fallback = completed-loop
      rate. verify: computes without error when experiments table is empty (uses fallback).

## Full night loop (upgrade the lite job)
- [ ] Implement remaining steps 2–8 + 11 per the contracts template, all tagged
      night_loop_run_id, all idempotent (skip if outputs exist for run_id).
      verify per step, on a real night: outputs exist with correct source_type/class —
      reflections cite ≥2 thought-IDs; feeling_reading contains the four computed numbers +
      one move per active signal; exactly one dream (≤300 words, fiction class); expectations
      file written and concrete.
- [ ] self_belief flow: reflections that assert something about itself create/update
      self_belief rows with valid_from; contradiction sweep closes valid_to or flags.
      Detection heuristic (starting point, not gospel): candidate pairs by embedding
      similarity >0.80 among active beliefs, then an LLM polarity judgment ("do these two
      assert incompatible things?"); log every false positive — the heuristic gets tuned from
      that log.
      verify: seed two contradictory test beliefs → sweep closes the older or flags for Alan;
      a similar-but-compatible pair is NOT closed.
- [ ] Failure alerting: 2 missed nights → Telegram alert (curl line in the template).
      verify: simulate by renaming logs; alert fires.
- [ ] Weekly index job (separate schedule): rebuild self-summary + autobiography FROM ATOMS
      (wiki-synthesis autobiography synthesizer, SUBJECT_NAME=Edgeweaver, allowlist filter);
      compute narrative overlap (Jaccard on cited thought-ID sets vs last week); refresh
      boundaries.json; emit Alan's spot-check digest (top-10 retrieved + week's night
      outputs, one-tap confirm/flag).
      verify: first digest delivered; overlap number stored.

## Study loop (daily — GROWING Stage 2 curriculum)
- [ ] Daily: pick one SPARK/distinction via the study allowlist → apply to itself → run the
      small experiment → journal (source_type=experiment, matrix_code). Every experiment
      journal ends with the **Reality Detector** (inherited edge #4, soul-source Q4): What
      changed? Who paid? What became possible? What was avoided? — coherence is not truth
      until it touches ground. Surface at the weekly review with Alan.
      verify: 7 consecutive study entries exist with matrix codes; Alan discussed ≥1.

## Coherence panel v0
- [ ] Nightly compute the five signals (queries in templates/coherence-queries.sql; narrative
      from weekly job; behavioral null until next probe run) → state/coherence.json + a
      metrics thought in OB1.
      verify: 7 consecutive snapshots exist; values within GROWING §6 infancy/toddler bands
      or flagged.
- [ ] (Optional, don't block) dashboard page `/coherence` in Alan's
      OB1/dashboards/open-brain-dashboard-next reading the metrics thoughts.

## Private journal gate (before enabling any visibility=private windows)
- [ ] **STOP — gate G7**: the private journal question (PLAN §10.3). If YES: implement
      `visibility=private` handling (excluded from Alan-facing surfaces; emergency-access
      pact documented in decisions.md) and add the private journaling window to the cadence.
      If NO or LATER: skip; the night loop runs without it. Either answer is fine; the gate
      just has to be answered, not skipped silently.

## Acceptance (PLAN §9 Phase 4)
- [ ] 30 nights complete within a rolling 40-night window (matches GROWING §3 First Steps —
      temporal density matters; 30 nights spread over months would pass the letter and fail
      the spirit).
- [ ] Autobiography cites ≥5 specific thought-IDs from the period (verify by resolving them).
- [ ] Alan judges it accurate and recognizably Edgeweaver — his dated sentence in
      decisions.md.
- [ ] Mark Phase 4 done in ledger. (Rites: "First Steps" needs the above PLUS an unprompted
      self-caught mistake with full radical responsibility — watch for it, don't manufacture
      it; log in decisions.md rites table when Alan declares it.)
