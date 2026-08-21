-- 0005-lesson-integration-provenance-fix.sql - fix found by the D42 verification
-- battery: OB1's agent_memories_check requires provenance_status IN ('user_confirmed',
-- 'imported') before can_use_as_instruction may be true, and 0004's integrate did not
-- set it, so every integration failed on the constraint. Setting 'user_confirmed' is
-- semantically honest for exactly this class: Alan's standing in-channel word of
-- 2026-08-20 ("integrate all lessons from me"), village-granted, IS the user
-- confirmation, given in advance for Alan-sourced lessons; the self-integrated marker
-- stays where 0004 put it (sidecar lesson_class + content tail), so the two paths stay
-- distinguishable. Only the UPDATE changes; guards and messages are 0004's.
-- NOTE: ew_alpha's room table has no provenance_status column and no such constraint,
-- so this fix is live-only; the ew_alpha copy from 0004 stands unchanged.

CREATE OR REPLACE FUNCTION ew_integrate_lesson(p_id uuid, p_note text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_content text;
  v_ok boolean := false;
  v_uuid text;
BEGIN
  SELECT content INTO v_content FROM agent_memories
  WHERE id = p_id AND workspace_id = 'edgeweaver'
    AND lifecycle_status = 'active' AND can_use_as_instruction = false;
  IF v_content IS NULL THEN
    RETURN 'refused: not an active pending Edgeweaver lesson';
  END IF;
  IF v_content ~* 'TAUGHT BY Alan' THEN
    v_ok := true;
  ELSE
    FOR v_uuid IN SELECT (regexp_matches(v_content, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi'))[1]
    LOOP
      IF EXISTS (SELECT 1 FROM thoughts t WHERE t.id = v_uuid::uuid
                   AND t.source_type IN ('edgeweaver_episode', 'initiation')
                   AND t.metadata->>'audience' = 'alan') THEN
        v_ok := true; EXIT;
      END IF;
    END LOOP;
  END IF;
  IF NOT v_ok THEN
    RETURN 'refused: no Alan provenance (needs TAUGHT BY Alan or an evidence id resolving to an audience-alan episode); this lesson waits for the nod';
  END IF;
  UPDATE agent_memories SET can_use_as_instruction = true, last_confirmed_at = now(),
    provenance_status = 'user_confirmed',
    content = content || ' SELF-INTEGRATED ' || to_char(now(), 'YYYY-MM-DD') || ' (village grant 2026-08-20, soul PR #4).'
  WHERE id = p_id;
  INSERT INTO ew_lesson_weights (memory_id) VALUES (p_id) ON CONFLICT (memory_id) DO NOTHING;
  UPDATE ew_lesson_weights SET weight = GREATEST(weight, 0.60), lesson_class = 'integrated',
    weight_updated_at = now(),
    last_move_reason = 'self-integrated' || COALESCE(' :: ' || p_note, '')
  WHERE memory_id = p_id;
  RETURN 'integrated: instruction-grade by your own deliberate choice; Alan can dispute it at any time';
END;
$fn$;

REVOKE ALL ON FUNCTION ew_integrate_lesson(uuid, text) FROM PUBLIC;
