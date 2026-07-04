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
| interpretation | feeling_reading, gremlin_report, reflections, box_snapshot, diary, self_belief | recallable, always labeled as interpretation |
| fiction | dream | EXCLUDED from factual recall by default |
| library | pm_teaching | study loop + explicit PM queries ONLY; excluded from every derived-memory synthesizer |

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
era:            "pre_birth" | "alive"
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
mood_arc:       short text                     # how the last days felt
night_loop_run_id:  "nl-YYYY-MM-DD"            # idempotency tag
staging:        true | absent                  # projection-queue items awaiting gated ingest
teaching_moment: true | absent                 # Alan's emoji flag (gate G4)
license / attribution:                         # REQUIRED on all pm_teaching rows:
                                               # CC-BY-SA-4.0 / Clinton Callahan / PM
spark_number, matrix_code, section, kind:      # pm_teaching structure fields
```

## Reused OB1 machinery (as-is)

agent_memories + review flow (instruction-grade only after user confirmation),
thought_edges (typed reasoning edges), entity wikis, autobiography synthesizer,
provenance chains, recall traces.
