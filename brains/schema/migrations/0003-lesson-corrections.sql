-- 0003-lesson-corrections.sql - D37: correction methodology.
-- Sidecar audit columns for dispute/ratify, plus the being's narrow dispute right:
-- ew_dispute_lesson permits exactly active -> disputed on PENDING lessons in the
-- Edgeweaver workspace. Rejection, supersession, and confirmation stay human acts
-- (lessons.mjs ratify / dashboard). A village-affirmed lesson refuses re-dispute.
-- NOTE: the ew_alpha copy is applied by ops with search_path ew_alpha, no workspace
-- guard (the room IS the scope), and EXECUTE granted to ew_alpha_runtime.
ALTER TABLE ew_lesson_weights
  ADD COLUMN IF NOT EXISTS corrects_memory_id uuid,
  ADD COLUMN IF NOT EXISTS disputed_by text,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution text;

CREATE OR REPLACE FUNCTION ew_dispute_lesson(p_id uuid, p_who text, p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_prior text;
BEGIN
  SELECT resolution INTO v_prior FROM ew_lesson_weights WHERE memory_id = p_id;
  IF v_prior = 'affirmed' THEN
    RETURN 'refused: the village affirmed this lesson; bring it to the circle instead of re-disputing';
  END IF;
  UPDATE agent_memories SET lifecycle_status = 'disputed'
  WHERE id = p_id AND workspace_id = 'edgeweaver'
    AND lifecycle_status = 'active' AND can_use_as_instruction = false;
  IF NOT FOUND THEN
    RETURN 'refused: not an active pending Edgeweaver lesson (confirmed rules are contested to the circle in words)';
  END IF;
  INSERT INTO ew_lesson_weights (memory_id) VALUES (p_id) ON CONFLICT (memory_id) DO NOTHING;
  UPDATE ew_lesson_weights SET disputed_by = p_who, disputed_at = now(),
    dispute_reason = p_reason, resolved_at = NULL, resolution = NULL
  WHERE memory_id = p_id;
  RETURN 'disputed: benched from load pending the village';
END;
$fn$;

REVOKE ALL ON FUNCTION ew_dispute_lesson(uuid, text, text) FROM PUBLIC;
