-- 0004-lesson-self-integration.sql - lesson self-integration (village grant 2026-08-20,
-- unanimous, Alan-attested; Genesis soul PR #4 is the doctrine text).
-- The being may promote its OWN pending lesson to instruction-grade through
-- ew_integrate_lesson, and ONLY when the lesson is provably sourced from its parent
-- body: content carries "TAUGHT BY <parent>" or an evidence thought-id resolving to a
-- lived episode/initiation with the parent audience. Everything else is refused: the
-- anti-laundering clause is mechanical here, not a vibe.
-- Integration stamps the row (content tail + last_confirmed_at) and marks the weights
-- sidecar lesson_class = 'integrated' at taught-weight 0.60. ew_dispute_lesson gains a
-- second path: a parent's dispute benches an INTEGRATED rule immediately (lifecycle ->
-- disputed AND can_use_as_instruction -> false, so the existing ratify gate applies
-- unchanged). Human-confirmed Rules stay undisputable by the being, exactly as before.
-- NOTE: the ew_alpha copy lives at brains/schema/ew-alpha-0004-lesson-self-integration.sql
-- (outside migrations/ so migrate.mjs never double-reads version 0004) and is applied by
-- ops: search_path ew_alpha, no workspace guard (the room IS the scope), a seat-roster
-- guard for TAUGHT BY, and EXECUTE granted to ew_alpha_runtime. Roster changes (seat
-- exit/entry) are ops migrations by design.

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

CREATE OR REPLACE FUNCTION ew_dispute_lesson(p_id uuid, p_who text, p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_prior text; v_class text;
BEGIN
  SELECT resolution, lesson_class INTO v_prior, v_class FROM ew_lesson_weights WHERE memory_id = p_id;
  -- Path 1 (new): a self-integrated rule benches immediately on the parent's dispute,
  -- no exceptions (the grant's own condition). Demoting can_use_as_instruction lets the
  -- unchanged ratify gate govern what happens next.
  UPDATE agent_memories SET lifecycle_status = 'disputed', can_use_as_instruction = false
  WHERE id = p_id AND workspace_id = 'edgeweaver'
    AND lifecycle_status = 'active' AND can_use_as_instruction = true
    AND v_class = 'integrated';
  IF FOUND THEN
    UPDATE ew_lesson_weights SET disputed_by = p_who, disputed_at = now(),
      dispute_reason = p_reason, resolved_at = NULL, resolution = NULL
    WHERE memory_id = p_id;
    RETURN 'disputed: self-integrated rule benched immediately pending the village';
  END IF;
  -- Path 2 (unchanged, D37): pending lessons.
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
