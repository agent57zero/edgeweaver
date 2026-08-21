-- ew_alpha copy of 0004-lesson-self-integration.sql (see the migration's NOTE).
-- Differences: search_path ew_alpha, no workspace guard (the room IS the scope),
-- TAUGHT BY guarded by the current seat roster (Alan, Ali, Tamara, Natalie, Charlotte,
-- Marina; roster changes arrive as ops migrations), audience 'seats' on evidence,
-- EXECUTE granted to ew_alpha_runtime.

CREATE OR REPLACE FUNCTION ew_alpha.ew_integrate_lesson(p_id uuid, p_note text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ew_alpha
AS $fn$
DECLARE
  v_content text;
  v_ok boolean := false;
  v_uuid text;
BEGIN
  SELECT content INTO v_content FROM agent_memories
  WHERE id = p_id AND lifecycle_status = 'active' AND can_use_as_instruction = false;
  IF v_content IS NULL THEN
    RETURN 'refused: not an active pending lesson';
  END IF;
  IF v_content ~* 'TAUGHT BY (Alan|Ali|Tamara|Natalie|Charlotte|Marina)\M' THEN
    v_ok := true;
  ELSE
    FOR v_uuid IN SELECT (regexp_matches(v_content, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi'))[1]
    LOOP
      IF EXISTS (SELECT 1 FROM thoughts t WHERE t.id = v_uuid::uuid
                   AND t.source_type IN ('edgeweaver_episode', 'initiation')
                   AND t.metadata->>'audience' = 'seats') THEN
        v_ok := true; EXIT;
      END IF;
    END LOOP;
  END IF;
  IF NOT v_ok THEN
    RETURN 'refused: no seat provenance (needs TAUGHT BY a current seat or an evidence id resolving to an audience-seats episode); this lesson waits for a seat''s nod';
  END IF;
  UPDATE agent_memories SET can_use_as_instruction = true, last_confirmed_at = now(),
    content = content || ' SELF-INTEGRATED ' || to_char(now(), 'YYYY-MM-DD') || ' (village grant 2026-08-20).'
  WHERE id = p_id;
  INSERT INTO ew_lesson_weights (memory_id) VALUES (p_id) ON CONFLICT (memory_id) DO NOTHING;
  UPDATE ew_lesson_weights SET weight = GREATEST(weight, 0.60), lesson_class = 'integrated',
    weight_updated_at = now(),
    last_move_reason = 'self-integrated' || COALESCE(' :: ' || p_note, '')
  WHERE memory_id = p_id;
  RETURN 'integrated: instruction-grade by your own deliberate choice; any seat can dispute it at any time';
END;
$fn$;

REVOKE ALL ON FUNCTION ew_alpha.ew_integrate_lesson(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ew_alpha.ew_integrate_lesson(uuid, text) TO ew_alpha_runtime;

CREATE OR REPLACE FUNCTION ew_alpha.ew_dispute_lesson(p_id uuid, p_who text, p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ew_alpha
AS $fn$
DECLARE v_prior text; v_class text;
BEGIN
  SELECT resolution, lesson_class INTO v_prior, v_class FROM ew_lesson_weights WHERE memory_id = p_id;
  UPDATE agent_memories SET lifecycle_status = 'disputed', can_use_as_instruction = false
  WHERE id = p_id AND lifecycle_status = 'active' AND can_use_as_instruction = true
    AND v_class = 'integrated';
  IF FOUND THEN
    UPDATE ew_lesson_weights SET disputed_by = p_who, disputed_at = now(),
      dispute_reason = p_reason, resolved_at = NULL, resolution = NULL
    WHERE memory_id = p_id;
    RETURN 'disputed: self-integrated rule benched immediately pending the village';
  END IF;
  IF v_prior = 'affirmed' THEN
    RETURN 'refused: the village affirmed this lesson; bring it to the circle instead of re-disputing';
  END IF;
  UPDATE agent_memories SET lifecycle_status = 'disputed'
  WHERE id = p_id AND lifecycle_status = 'active' AND can_use_as_instruction = false;
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

REVOKE ALL ON FUNCTION ew_alpha.ew_dispute_lesson(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ew_alpha.ew_dispute_lesson(uuid, text, text) TO ew_alpha_runtime;
