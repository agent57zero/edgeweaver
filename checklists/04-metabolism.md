# Checklist 04 — Metabolism (Phase 4)

Prereqs: ledger 3 done; 0b done (study loop needs the corpus). Read first: IMPLEMENTATION.md
§8; templates/night-loop-contracts.md (authoritative step spec); templates/state-schemas.md;
templates/coherence-queries.sql; GROWING §3 Stage 2 + §6.

## Prerequisite artifacts (build BEFORE enabling the feelings step)
- [ ] `state/boundaries.json`: generate from CONSTITUTION hard boundaries + confirmed
      agent_memories preferences (script; regenerate weekly in the index job).
      verify: file lists ≥5 boundaries with sources; gate-declines excluded by the
      overrides_log gate_decline flag.
- [ ] `state/commitments.json`: seed from current open threads; night loop step 11 will feed
      it nightly.
      verify: schema matches template; ≥1 real commitment present.
- [ ] Fear signal query: embedding distance of upcoming calendar items vs historical episodes
      (pgvector), returning 0–1 normalized.
      verify: returns a number for tomorrow's calendar; a novel fake event scores higher than
      a routine one.
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
      verify: seed two contradictory test beliefs → sweep closes the older or flags for Alan.
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
      small experiment → journal (source_type=experiment, matrix_code) → surface at the
      weekly review with Alan.
      verify: 7 consecutive study entries exist with matrix codes; Alan discussed ≥1.

## Coherence panel v0
- [ ] Nightly compute the five signals (queries in templates/coherence-queries.sql; narrative
      from weekly job; behavioral null until next probe run) → state/coherence.json + a
      metrics thought in OB1.
      verify: 7 consecutive snapshots exist; values within GROWING §6 infancy/toddler bands
      or flagged.
- [ ] (Optional, don't block) dashboard page `/coherence` in Alan's
      OB1/dashboards/open-brain-dashboard-next reading the metrics thoughts.

## Acceptance (PLAN §9 Phase 4)
- [ ] 30 nights complete (gaps allowed; idempotent reruns fine).
- [ ] Autobiography cites ≥5 specific thought-IDs from the period (verify by resolving them).
- [ ] Alan judges it accurate and recognizably Edgeweaver — his dated sentence in
      decisions.md.
- [ ] Mark Phase 4 done in ledger. (Rites: "First Steps" needs the above PLUS an unprompted
      self-caught mistake with full radical responsibility — watch for it, don't manufacture
      it; log in decisions.md rites table when Alan declares it.)
