-- Template: coherence panel + sweep query sketches (Phase 4)
-- Adjust table/column names to the live OB1 schema before use; these encode the LOGIC.
-- Assumes core `thoughts` (id, content, source_type, metadata jsonb, created_at, embedding),
-- `thought_edges` (from_thought_id, to_thought_id, relation, metadata),
-- and agent-memory recall traces (see OB1/schemas/agent-memory/ for exact names).

-- ============ PANEL SIGNAL 1: relational coherence (weekly) ============
-- fraction of the week's new thoughts that acquired at least one edge within 7 days
WITH new_thoughts AS (
  SELECT id FROM thoughts
  WHERE created_at >= now() - interval '7 days'
    AND source_type IN ('edgeweaver_episode','distinction','experiment') -- experienced-ish
), linked AS (
  SELECT DISTINCT nt.id FROM new_thoughts nt
  JOIN thought_edges e ON e.from_thought_id = nt.id OR e.to_thought_id = nt.id
)
SELECT count(linked.id)::float / NULLIF(count(new_thoughts.id),0) AS relational_coherence
FROM new_thoughts LEFT JOIN linked ON linked.id = new_thoughts.id;

-- ============ PANEL SIGNAL 2: temporal coherence (nightly) ============
-- open contradictions: active self-beliefs flagged by the sweep and not yet resolved
SELECT count(*) AS open_contradictions
FROM thoughts
WHERE source_type = 'self_belief'
  AND (metadata->>'valid_to') IS NULL
  AND (metadata->>'contradiction_flag') = 'true';

-- ============ PANEL SIGNAL 3: narrative coherence (weekly) ============
-- computed in the weekly-index job, not SQL alone:
-- jaccard(cited_ids_this_rebuild, cited_ids_last_rebuild)
-- store result into the metrics thought / state/coherence.json

-- ============ PANEL SIGNAL 5: pulse (nightly) ============
SELECT count(DISTINCT metadata->>'night_loop_run_id') AS night_loops_7d
FROM thoughts
WHERE created_at >= now() - interval '7 days'
  AND metadata ? 'night_loop_run_id';

-- ============ SWEEP: candidate contradictions among active self-beliefs ============
-- pairs of active self-beliefs with high semantic similarity (same topic) — LLM judges
-- whether they actually conflict; if yes: close the older (set valid_to), or flag for Alan.
SELECT a.id AS belief_a, b.id AS belief_b,
       1 - (a.embedding <=> b.embedding) AS similarity
FROM thoughts a
JOIN thoughts b ON a.id < b.id
WHERE a.source_type='self_belief' AND b.source_type='self_belief'
  AND (a.metadata->>'valid_to') IS NULL AND (b.metadata->>'valid_to') IS NULL
  AND 1 - (a.embedding <=> b.embedding) > 0.80
ORDER BY similarity DESC LIMIT 20;

-- ============ SWEEP: orphans to link ============
SELECT t.id, left(t.content,120) AS preview
FROM thoughts t
LEFT JOIN thought_edges e ON e.from_thought_id=t.id OR e.to_thought_id=t.id
WHERE t.created_at >= now() - interval '7 days'
  AND t.source_type IN ('edgeweaver_episode','distinction','experiment')
  AND e.from_thought_id IS NULL
LIMIT 50;  -- night loop proposes edges for these (nearest-neighbor entities/themes)

-- ============ COMPLETION-LOOP CANDIDATES: stale high-salience ("emotions") ============
-- memories retrieved often into contexts they don't semantically belong to.
-- Requires recall traces with (memory_id, query_embedding or query_text, ts).
-- Logic: retrievals_7d >= 3 AND avg similarity(query, memory) < 0.35 → candidate.

-- ============ IMPORTANCE RECALIBRATION (nightly batch) ============
-- v1: new = round(0.5*current + 0.5*least(10, retrievals_14d * usefulness_factor));
-- decay: never retrieved in 30d AND importance > 6 → importance - 1.
UPDATE thoughts SET metadata = jsonb_set(metadata,'{importance}',
  to_jsonb(GREATEST(1,(metadata->>'importance')::int - 1)))
WHERE (metadata->>'importance')::int > 6
  AND created_at < now() - interval '30 days'
  AND id NOT IN (SELECT DISTINCT memory_id FROM agent_memory_recall_items
                 WHERE created_at >= now() - interval '30 days');

-- ============ AUDIENCE-SCOPE ENFORCEMENT (recall-path WHERE clause) ============
-- interlocutor scope 'alan' sees everything; 'known-other' sees known-other+public;
-- 'public' sees public only. pre_birth defaults to alan (conventions).
--   AND COALESCE(metadata->>'audience', CASE WHEN metadata->>'era'='pre_birth'
--        THEN 'alan' ELSE 'public' END)
--       = ANY (CASE :scope WHEN 'alan' THEN ARRAY['alan','known-other','public']
--                          WHEN 'known-other' THEN ARRAY['known-other','public']
--                          ELSE ARRAY['public'] END)

-- ============ PROVENANCE-CLASS ALLOWLIST (episodic recall) ============
--   AND source_type NOT IN ('pm_teaching')          -- library
--   AND source_type NOT IN ('dream')                -- fiction
--   (interpretation types allowed but must be labeled in output)
