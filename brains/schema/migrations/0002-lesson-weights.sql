-- 0002-lesson-weights.sql - D36: sidecar weight table for weighted lesson loading.
-- Additive only; never touches OB1's shared agent_memories. One row per lesson,
-- created lazily at born weight by scripts/lessons/lessons.mjs (sync). Weights move
-- only on the night-loop pass from application evidence (D36), never in-session.
CREATE TABLE IF NOT EXISTS ew_lesson_weights (
  memory_id uuid PRIMARY KEY,
  weight real NOT NULL DEFAULT 0.30,
  weight_updated_at timestamptz NOT NULL DEFAULT now(),
  last_applied_at timestamptz,
  applied_count integer NOT NULL DEFAULT 0,
  misfire_count integer NOT NULL DEFAULT 0,
  lesson_class text NOT NULL DEFAULT 'general',
  excluded_from_load boolean NOT NULL DEFAULT false,
  flagged_for_review boolean NOT NULL DEFAULT false,
  last_move_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
