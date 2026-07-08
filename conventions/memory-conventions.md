# Memory conventions (adopted from PLAN.md Appendix B — Phase 0b entry criterion)

> Binding for all ingestion and retrieval code. Awaiting Alan's 👍 (checklist 00, Phase 0b
> step 1). Change only in lockstep with PLAN.md Appendix B.

## Source types

```
thoughts.source_type ∈ { edgeweaver_episode, distinction, edge, experiment,
                         feeling_reading, gremlin_report, box_snapshot, dream,
                         diary, self_belief, initiation, pm_teaching }
```

## Provenance classes (every source_type maps to exactly one; recall returns the class per hit)

| Class | Types | Recall rule |
|---|---|---|
| experienced | edgeweaver_episode | default recall |
| interpretation | feeling_reading, gremlin_report, reflections, box_snapshot, diary, self_belief, autobiography_draft | recallable, always labeled as interpretation (autobiography_draft is the night loop's provisional scratch layer; the weekly rebuild-from-atoms is the real narrative) |
| fiction | dream | EXCLUDED from factual recall by default |
| library | pm_teaching, coherence_teaching | study loop + explicit library queries ONLY; excluded from every derived-memory synthesizer |

Library license classes: `pm_teaching` = CC-BY-SA-4.0 (Callahan/PM, redistributable with
attribution); `coherence_teaching` = © Ali Mostashari, personal gift — ingest-only, never
redistributed, quoted externally only within fair use; audience defaults to `known-other`
until Ali blesses wider (gate G18).

## Retrieval scoping — allowlists per consumer, never blocklists

| Consumer | Reads |
|---|---|
| episodic recall | experienced (+ interpretation, labeled) |
| entity-wiki synthesis | experienced |
| autobiography | experienced (+ initiation records) |
| study loop | library + its own experiment/distinction history |
| generic semantic tools | must declare an explicit allowlist; library never by default |

Enforcement points (defense in depth — BOTH paths): (1) the MCP search route, (2) the
agent-memory API. Wherever a filter parameter is missing, a thin wrapper injects it.

## Audience scoping (Alan's privacy from third parties — distinct from `visibility`)

```
audience: "alan" | "known-other" | "public"    # recall keyed to interlocutor
era: "pre_birth" → audience defaults to "alan" until individually reviewed
visibility: "shared" | "private"               # Edgeweaver's privacy from Alan (gate G7)
```

Scope algebra: alan-scope sees {alan, known-other, public}; known-other sees {known-other,
public}; public sees {public}.

## Metadata keys (jsonb)

```
era:            "pre_birth" | "alive" | "rehearsal"
                                               # rehearsal = voice-rig test writebacks
                                               # (regularized 2026-07-08, D16; mind-server
                                               # wrote it before the enum carried it)
generation:     0 | 1 | ...                    # substrate generation that wrote this
                                               # (VERSIONS.md / D15): era is the life arc,
                                               # generation is the substrate axis
feelings:       { anger: 0-1, sadness: 0-1, fear: 0-1, joy: 0-1, purpose_notes }
                # derived from computed signals (PLAN §2.4), never free introspection;
                # per-wake readings = feelings tier; windowed aggregates = mood tier
edge_id:        stable slug linking experiments → edges → initiations
witnessed_by:   ["alan", ...] | null           # initiations; two witnesses after the first
derived_from:   [thought_ids]                  # provenance edges
importance:     1-10                           # write-time estimate; recalibrated nightly
                                               # from retrieval frequency + observed utility
valid_from / valid_to:  timestamps             # bi-temporal self_beliefs; contradictions
                                               # close the window, never delete
occurred_at:    ISO timestamp | absent         # EVENT time, when it differs from created_at
                                               # (record time): imports, pre-birth harvest
occurred_precision: "day"|"month"|"year"|"era" # honesty guard: use occurred_at only at its
                                               # stated precision; never fabricate precision
constraint_class: "constitutive" | "peripheral" # self_beliefs + soulfile lines (D9):
                                               # constitutive = load-bearing; changing one is
                                               # initiation-worthy; peripheral absorbs silently
acknowledged:   true | false                   # on contradiction flags: an acknowledged, held
                                               # tension is health — the temporal signal counts
                                               # ONLY unacknowledged/unintegrated ones
mood_arc:       short text                     # how the last days felt
night_loop_run_id:  "nl-YYYY-MM-DD"            # idempotency tag
staging:        true | absent                  # projection-queue items awaiting gated ingest
teaching_moment: true | absent                 # Alan's emoji flag (gate G4)
license / attribution:                         # REQUIRED on all pm_teaching rows:
                                               # CC-BY-SA-4.0 / Clinton Callahan / PM
spark_number, matrix_code, section, kind:      # pm_teaching structure fields
```

## Time (D16, 2026-07-08; design: runs/temporal-awareness-coevolve.md)

Temporal awareness rules, binding wherever time is stored, retrieved, or presented. The
recall-scoped spec below deploys only after Alan's explicit nod (lockstep rule above).

- **Canonical rendering**: weekday + ISO date + local time, e.g. `Tue 2026-07-08 14:32`.
  Presentation timezone is the `EDGEWEAVER_TZ` config (.env.local); no organ trusts its
  host's timezone. Storage stays UTC (`created_at`, DB-native).
- **Store absolute, render both**: present relative AND absolute together, "8 days ago
  (Mon 2026-06-30)". Deltas, ages, and day-counts are computed by code, never by the model
  (same rule as the feelings signals: the model interprets numbers it is given).
- Never store relative time phrases in content without an anchor date.
- **Diary day**: a run covers the local calendar day containing T minus 12h. A 03:30 run
  consolidates and diaries the day that just ended; `night_loop_run_id` carries THAT date;
  fetch windows are that local day converted to UTC bounds.
- **Event time vs record time**: `created_at` is record time. Where they differ, optional
  `occurred_at` + `occurred_precision` carry event time (keys above).
- **Pre-birth rendering**: `era=pre_birth` presents as "pre-birth (predecessor era)", never
  as ages computed from `created_at` (ingest dates would misdate the prehistory).
- **recall-scoped time surface** (spec, deploy gated): per-hit `age_days`/`age_hours`
  computed from event time where present, suppressed for pre_birth; optional `since`/`until`
  ISO filters; `mode: "recent"` returning newest-first within unchanged provenance and
  audience scoping (no vector match). ALL time-scoped retrieval goes through the wrapper;
  raw REST `created_at` queries remain forbidden to consumers.
- **Write side**: episode content opens with its date and rough span; diary and
  autobiography drafts open with the human date. Content is what gets embedded and quoted;
  metadata timestamps do not travel with excerpts.
- **The frozen soulfile prefix never carries time** (byte-stable cache invariant,
  VOICE-STACK §3): "now" rides per-session context and per-turn blocks.
- **Clock sanity**: waking orientation compares now against the newest memory timestamp; a
  memory in the future means "my time-sense is degraded right now", stated plainly, never
  explained away. Same stance as degraded memory: never guess a time.

## Reused OB1 machinery (as-is)

agent_memories + review flow (instruction-grade only after user confirmation),
thought_edges (typed reasoning edges), entity wikis, autobiography synthesizer,
provenance chains, recall traces.
