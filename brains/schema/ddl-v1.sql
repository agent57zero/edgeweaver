--
-- PostgreSQL database dump
--

\restrict d6RgYDr1aabpXFS3VjyBNgcQJGbAYrywWmFPyHRvdpNGiCxvtfYedq4NvJWe8SQ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: agent_memories_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.agent_memories_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: agent_memory_hash_text(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.agent_memory_hash_text(p_content text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN encode(sha256(convert_to(lower(trim(regexp_replace(coalesce(p_content, ''), '\s+', ' ', 'g'))), 'UTF8')), 'hex');
END;
$$;


--
-- Name: backfill_thought_types(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.backfill_thought_types(p_allowed_types text[] DEFAULT ARRAY['idea'::text, 'task'::text, 'person_note'::text, 'reference'::text, 'decision'::text, 'lesson'::text, 'meeting'::text, 'journal'::text]) RETURNS bigint
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_updated BIGINT;
BEGIN
  UPDATE public.thoughts
  SET type = metadata->>'type'
  WHERE type IS NULL
    AND metadata->>'type' IS NOT NULL
    AND (p_allowed_types IS NULL OR metadata->>'type' = ANY(p_allowed_types));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


--
-- Name: brain_stats_aggregate(integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.brain_stats_aggregate(p_since_days integer DEFAULT 30, p_exclude_restricted boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total BIGINT;
  v_types JSONB;
  v_topics JSONB;
  v_since TIMESTAMPTZ;
BEGIN
  -- p_since_days = 0 means all-time (no time filter)
  IF p_since_days > 0 THEN
    v_since := now() - (p_since_days || ' days')::interval;
  ELSE
    v_since := '-infinity'::timestamptz;
  END IF;

  -- Total thoughts (all-time)
  SELECT count(*) INTO v_total
  FROM public.thoughts
  WHERE (NOT p_exclude_restricted OR sensitivity_tier IS DISTINCT FROM 'restricted');

  -- Top types within time window
  SELECT coalesce(jsonb_agg(jsonb_build_object('type', t.type, 'count', t.cnt)), '[]'::jsonb)
  INTO v_types FROM (
    SELECT type, count(*) AS cnt FROM public.thoughts
    WHERE created_at >= v_since
      AND (NOT p_exclude_restricted OR sensitivity_tier IS DISTINCT FROM 'restricted')
    GROUP BY type ORDER BY cnt DESC LIMIT 20
  ) t;

  -- Top topics within time window
  SELECT coalesce(jsonb_agg(jsonb_build_object('topic', t.topic, 'count', t.cnt)), '[]'::jsonb)
  INTO v_topics FROM (
    SELECT topic.value AS topic, count(*) AS cnt
    FROM public.thoughts,
         jsonb_array_elements_text(coalesce(metadata->'topics', '[]'::jsonb)) AS topic(value)
    WHERE created_at >= v_since
      AND (NOT p_exclude_restricted OR sensitivity_tier IS DISTINCT FROM 'restricted')
    GROUP BY topic.value ORDER BY cnt DESC LIMIT 20
  ) t;

  RETURN jsonb_build_object('total', v_total, 'top_types', v_types, 'top_topics', v_topics);
END;
$$;


--
-- Name: crm_add_contact_method(uuid, text, text, text, boolean, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_add_contact_method(p_contact_id uuid, p_method_type text, p_value text, p_label text DEFAULT NULL::text, p_is_primary boolean DEFAULT false, p_actor text DEFAULT 'service'::text, p_source text DEFAULT 'manual'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor       TEXT := COALESCE(NULLIF(trim(p_actor), ''), 'service');
  v_method_type TEXT := NULLIF(trim(COALESCE(p_method_type, '')), '');
  v_value       TEXT := NULLIF(trim(COALESCE(p_value, '')), '');
  v_source      TEXT := COALESCE(NULLIF(trim(COALESCE(p_source, '')), ''), 'manual');
  v_method_id   UUID;
BEGIN
  IF v_method_type IS NULL OR v_method_type NOT IN ('email', 'phone', 'url', 'social', 'address', 'other') THEN
    RAISE EXCEPTION 'invalid contact method type: %', p_method_type;
  END IF;
  IF v_value IS NULL THEN
    RAISE EXCEPTION 'contact method value is required';
  END IF;

  PERFORM 1 FROM public.crm_contacts WHERE id = p_contact_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM contact not found: %', p_contact_id;
  END IF;

  IF COALESCE(p_is_primary, false) THEN
    UPDATE public.crm_contact_methods
    SET is_primary = false, updated_at = timezone('utc', now()), updated_by = v_actor
    WHERE contact_id = p_contact_id
      AND method_type = v_method_type
      AND deleted_at IS NULL
      AND status = 'current';
  END IF;

  SELECT m.id INTO v_method_id
  FROM public.crm_contact_methods m
  WHERE m.contact_id = p_contact_id
    AND m.method_type = v_method_type
    AND lower(m.value) = lower(v_value)
    AND m.deleted_at IS NULL
    AND m.status = 'current'
  LIMIT 1;

  IF v_method_id IS NULL THEN
    INSERT INTO public.crm_contact_methods (
      contact_id, method_type, value, label, is_primary, source, confidence, created_by, updated_by
    )
    VALUES (
      p_contact_id, v_method_type, v_value,
      NULLIF(trim(COALESCE(p_label, '')), ''),
      COALESCE(p_is_primary, false), v_source, 1.0, v_actor, v_actor
    )
    RETURNING id INTO v_method_id;
  ELSE
    UPDATE public.crm_contact_methods
    SET label = NULLIF(trim(COALESCE(p_label, '')), ''),
        is_primary = COALESCE(p_is_primary, is_primary),
        updated_at = timezone('utc', now()),
        updated_by = v_actor
    WHERE id = v_method_id;
  END IF;

  -- The value is REDACTED in the audit log: the change log never stores a raw
  -- email/phone string.
  INSERT INTO public.crm_contact_change_log (contact_id, method_id, action, actor_label, changed_fields)
  VALUES (
    p_contact_id, v_method_id, 'method.upsert', v_actor,
    jsonb_build_object('method_type', v_method_type, 'value', '[redacted]', 'is_primary', COALESCE(p_is_primary, false))
  );

  RETURN (SELECT to_jsonb(m.*) FROM public.crm_contact_methods m WHERE m.id = v_method_id);
END;
$$;


--
-- Name: crm_add_field_evidence(uuid, text, uuid, text, text, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_add_field_evidence(p_contact_id uuid, p_field_key text, p_thought_id uuid, p_role text DEFAULT 'supports'::text, p_target_kind text DEFAULT 'contact_field'::text, p_target_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_actor text DEFAULT 'service'::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(trim(p_actor), ''), 'service');
  v_id    UUID;
BEGIN
  IF p_role NOT IN ('supports', 'contradicts', 'source', 'correction') THEN
    RAISE EXCEPTION 'invalid evidence role: %', p_role;
  END IF;
  IF p_target_kind NOT IN ('contact_field', 'contact_method', 'alias', 'proposal') THEN
    RAISE EXCEPTION 'invalid evidence target_kind: %', p_target_kind;
  END IF;

  INSERT INTO public.crm_field_evidence (
    contact_id, target_kind, target_id, field_key, thought_id, role, note, created_by
  )
  VALUES (
    p_contact_id, p_target_kind, p_target_id,
    NULLIF(trim(COALESCE(p_field_key, '')), ''),
    p_thought_id, p_role, NULLIF(trim(COALESCE(p_note, '')), ''), v_actor
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


--
-- Name: crm_contact_field_evidence(uuid, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_contact_field_evidence(p_contact_id uuid, p_field_key text DEFAULT NULL::text, p_exclude_restricted boolean DEFAULT true, p_limit integer DEFAULT 100) RETURNS TABLE(evidence_id uuid, target_kind text, target_id uuid, field_key text, role text, note text, thought_id uuid, thought_snippet text, thought_created_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT
    e.id,
    e.target_kind,
    e.target_id,
    e.field_key,
    e.role,
    e.note,
    e.thought_id,
    left(t.content, 400),
    t.created_at,
    e.created_at
  FROM public.crm_field_evidence e
  JOIN public.crm_contacts c ON c.id = e.contact_id
  JOIN public.thoughts t ON t.id = e.thought_id
  WHERE e.contact_id = p_contact_id
    AND (p_field_key IS NULL OR e.field_key = p_field_key)
    AND (NOT p_exclude_restricted OR c.privacy_tier IS DISTINCT FROM 'restricted')
  ORDER BY e.created_at DESC
  LIMIT greatest(1, least(COALESCE(p_limit, 100), 500));
$$;


--
-- Name: crm_create_contact(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_create_contact(p_display_name text, p_canonical_email text DEFAULT NULL::text, p_organization_name text DEFAULT NULL::text, p_job_title text DEFAULT NULL::text, p_actor text DEFAULT 'service'::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(trim(p_actor), ''), 'service');
  v_name  TEXT := NULLIF(trim(COALESCE(p_display_name, '')), '');
  v_id    UUID;
  v_now   TIMESTAMPTZ := timezone('utc', now());
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'display_name is required';
  END IF;

  INSERT INTO public.crm_contacts (
    display_name, canonical_email, organization_name, job_title,
    field_provenance, created_by, updated_by
  )
  VALUES (
    v_name,
    NULLIF(trim(COALESCE(p_canonical_email, '')), ''),
    NULLIF(trim(COALESCE(p_organization_name, '')), ''),
    NULLIF(trim(COALESCE(p_job_title, '')), ''),
    jsonb_build_object('display_name', jsonb_build_object(
      'origin', 'manual', 'actor', v_actor, 'at', v_now, 'locked', false)),
    v_actor, v_actor
  )
  RETURNING id INTO v_id;

  INSERT INTO public.crm_contact_change_log (contact_id, action, actor_label, changed_fields)
  VALUES (v_id, 'contact.create', v_actor,
          jsonb_strip_nulls(jsonb_build_object(
            'display_name', v_name,
            'organization_name', p_organization_name,
            'job_title', p_job_title)));

  RETURN v_id;
END;
$$;


--
-- Name: crm_get_contact(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_get_contact(p_contact_id uuid) RETURNS TABLE(record jsonb, methods jsonb, aliases jsonb)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH contact_record AS (
    SELECT c.*
    FROM public.crm_contacts c
    WHERE c.id = p_contact_id
    LIMIT 1
  )
  SELECT
    to_jsonb(c.*) AS record,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(m.*) ORDER BY m.is_primary DESC, m.method_type ASC, m.value ASC)
      FROM public.crm_contact_methods m
      WHERE m.contact_id = c.id
        AND m.deleted_at IS NULL
        AND m.status = 'current'
    ), '[]'::jsonb) AS methods,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(a.*) ORDER BY a.source ASC, a.alias ASC)
      FROM public.crm_contact_aliases a
      WHERE a.contact_id = c.id
        AND a.status = 'current'
    ), '[]'::jsonb) AS aliases
  FROM contact_record c;
$$;


--
-- Name: crm_patch_contact_record(uuid, jsonb, text, text, text, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_patch_contact_record(p_contact_id uuid, p_patch jsonb, p_actor text DEFAULT 'service'::text, p_origin text DEFAULT 'manual'::text, p_run_id text DEFAULT NULL::text, p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_resolved_proposal_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(trim(p_actor), ''), 'service');
  v_row   public.crm_contacts%ROWTYPE;
  v_key   TEXT;
  v_new   TEXT;
  v_cur   TEXT;
  v_prov  JSONB;
  v_locked BOOLEAN;
  v_prev_origin TEXT;
  v_entry JSONB;
  v_applied TEXT[] := ARRAY[]::TEXT[];
  v_conflicts TEXT[] := ARRAY[]::TEXT[];
  v_proposed JSONB := '[]'::jsonb;
  v_applied_patch JSONB := '{}'::jsonb;
  v_prov_patch JSONB := '{}'::jsonb;
  v_proposal JSONB;
  v_resolved_proposal public.crm_field_proposals%ROWTYPE;
  v_bypass_this_key BOOLEAN;
  v_now TIMESTAMPTZ := timezone('utc', now());
  c_known_keys CONSTANT TEXT[] := ARRAY[
    'display_name', 'preferred_name', 'given_name', 'family_name', 'pronouns',
    'job_title', 'organization_name', 'location', 'relationship_note',
    'lifecycle_status', 'privacy_tier', 'owner_label'
  ];
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'p_patch must be a JSON object';
  END IF;
  -- 'generated' is only valid as the origin of an accepted proposal: the human
  -- accept (which sets p_resolved_proposal_id) is the authorization. A direct
  -- machine write may not claim 'generated'. Without this, a generated-origin
  -- proposal could never be accepted - the accept path re-enters here passing
  -- the proposal's origin, and the value would stay forever open.
  IF p_origin NOT IN ('manual', 'import', 'extraction', 'projection')
     AND NOT (p_origin = 'generated' AND p_resolved_proposal_id IS NOT NULL) THEN
    RAISE EXCEPTION 'invalid patch origin: %', p_origin;
  END IF;

  SELECT c.* INTO v_row
  FROM public.crm_contacts c
  WHERE c.id = p_contact_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'CRM contact not found: %', p_contact_id;
  END IF;

  IF p_expected_updated_at IS NOT NULL AND v_row.updated_at > p_expected_updated_at THEN
    RAISE EXCEPTION 'crm_contact_stale_write: contact % was modified at % (expected unchanged since %); re-fetch and retry', v_row.id, v_row.updated_at, p_expected_updated_at;
  END IF;

  -- p_resolved_proposal_id is the "manual authority" bypass: it skips
  -- auto-protection so an accepted proposal can apply. Guard it so the bypass
  -- can only be triggered by a real, still-open contact_field proposal on THIS
  -- contact - a forged, stale, or cross-contact id cannot be used to overwrite
  -- a protected field. Load the proposal here; the bypass is then narrowed to
  -- ONLY the exact field_key/value the proposal proposes (see v_bypass_this_key
  -- in the per-key loop), so accepting a proposal for field A can never loosen
  -- protection on field B in the same patch. The canonical accept path
  -- (crm_resolve_field_proposal) always passes a verified open proposal id.
  IF p_resolved_proposal_id IS NOT NULL THEN
    SELECT * INTO v_resolved_proposal
    FROM public.crm_field_proposals p
    WHERE p.id = p_resolved_proposal_id
      AND p.contact_id = v_row.id
      AND p.status = 'open'
      AND p.target_kind = 'contact_field';
    IF v_resolved_proposal.id IS NULL THEN
      RAISE EXCEPTION 'crm_invalid_proposal_bypass: % is not an open contact_field proposal for contact %', p_resolved_proposal_id, v_row.id;
    END IF;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_patch)
  LOOP
    IF NOT (v_key = ANY(c_known_keys)) THEN
      RAISE EXCEPTION 'unknown contact field: %', v_key;
    END IF;

    v_new := NULLIF(trim(COALESCE(p_patch->>v_key, '')), '');

    -- Enum / required validation at the boundary.
    IF v_key = 'lifecycle_status' AND (v_new IS NULL OR v_new NOT IN ('active', 'archived')) THEN
      RAISE EXCEPTION 'invalid lifecycle status: %', p_patch->>v_key;
    END IF;
    IF v_key = 'privacy_tier' AND (v_new IS NULL OR v_new NOT IN ('standard', 'sensitive', 'restricted')) THEN
      RAISE EXCEPTION 'invalid privacy tier: %', p_patch->>v_key;
    END IF;
    IF v_key = 'display_name' AND v_new IS NULL THEN
      RAISE EXCEPTION 'display_name cannot be cleared';
    END IF;
    IF v_key = 'owner_label' AND v_new IS NULL THEN
      RAISE EXCEPTION 'owner_label cannot be cleared';
    END IF;

    v_cur := CASE v_key
      WHEN 'display_name' THEN v_row.display_name
      WHEN 'preferred_name' THEN v_row.preferred_name
      WHEN 'given_name' THEN v_row.given_name
      WHEN 'family_name' THEN v_row.family_name
      WHEN 'pronouns' THEN v_row.pronouns
      WHEN 'job_title' THEN v_row.job_title
      WHEN 'organization_name' THEN v_row.organization_name
      WHEN 'location' THEN v_row.location
      WHEN 'relationship_note' THEN v_row.relationship_note
      WHEN 'lifecycle_status' THEN v_row.lifecycle_status
      WHEN 'privacy_tier' THEN v_row.privacy_tier
      WHEN 'owner_label' THEN v_row.owner_label
    END;

    -- No-op writes neither claim provenance nor churn updated_at.
    IF v_new IS NOT DISTINCT FROM v_cur THEN
      CONTINUE;
    END IF;

    v_prov := COALESCE(v_row.field_provenance->v_key, '{}'::jsonb);
    v_locked := COALESCE((v_prov->>'locked')::boolean, false);
    -- A value with no recorded provenance predates the truth layer; treat it as
    -- manual (conservative: machines must propose, humans may edit).
    v_prev_origin := COALESCE(NULLIF(v_prov->>'origin', ''),
                              CASE WHEN v_cur IS NULL THEN NULL ELSE 'manual' END);

    -- The proposal bypass loosens lock / manual-origin protection for ONLY the
    -- exact field the proposal is about, and ONLY when the patched value equals
    -- the proposal's proposed value. Any other key in the same patch is treated
    -- as a normal (unprivileged) write, so a stale or same-contact proposal for
    -- field A cannot smuggle an unprotected overwrite of field B (or a different
    -- value for field A) past auto-protection.
    v_bypass_this_key := (
      p_resolved_proposal_id IS NOT NULL
      AND v_key = v_resolved_proposal.field_key
      AND v_new IS NOT DISTINCT FROM NULLIF(trim(COALESCE(v_resolved_proposal.proposed_value, '')), '')
    );

    IF NOT v_bypass_this_key AND v_locked THEN
      -- Locked blocks everyone, including manual bulk edits: unlock first.
      v_conflicts := v_conflicts || v_key;
      CONTINUE;
    END IF;

    IF NOT v_bypass_this_key
       AND p_origin <> 'manual'
       AND v_prev_origin = 'manual' THEN
      -- Auto-protection: a machine writer never overwrites a human value; it
      -- proposes instead. The canonical field is left untouched.
      v_proposal := public.crm_propose_field(
        v_row.id,
        'contact_field',
        v_key,
        p_patch->>v_key,
        p_origin,
        jsonb_strip_nulls(jsonb_build_object('run_id', p_run_id)),
        NULL,
        v_cur,
        NULL,
        NULL
      );
      v_proposed := v_proposed || jsonb_build_object(
        'field', v_key,
        'proposal_id', v_proposal->>'proposal_id',
        'proposal_status', v_proposal->>'status'
      );
      CONTINUE;
    END IF;

    v_applied := v_applied || v_key;
    v_applied_patch := v_applied_patch || jsonb_build_object(v_key, p_patch->v_key);
    -- When this write is a human ACCEPTING a proposal, the human's decision
    -- makes the value authoritative: stamp origin='manual' so a later machine
    -- write cannot overwrite the now-human-blessed value directly (it would have
    -- to propose again). The machine origin that supplied the value is preserved
    -- under 'accepted_origin' for audit. A direct manual edit keeps p_origin.
    v_entry := jsonb_strip_nulls(jsonb_build_object(
      'origin', CASE WHEN v_bypass_this_key THEN 'manual' ELSE p_origin END,
      'accepted_origin', CASE WHEN v_bypass_this_key THEN p_origin ELSE NULL END,
      'actor', v_actor,
      'run_id', p_run_id,
      'at', v_now,
      'locked', v_locked,
      'via_proposal', CASE WHEN v_bypass_this_key THEN p_resolved_proposal_id ELSE NULL END
    ));
    v_prov_patch := v_prov_patch || jsonb_build_object(v_key, v_entry);
  END LOOP;

  IF array_length(v_applied, 1) IS NOT NULL THEN
    UPDATE public.crm_contacts c
    SET display_name = CASE WHEN v_applied_patch ? 'display_name' THEN NULLIF(trim(COALESCE(v_applied_patch->>'display_name', '')), '') ELSE c.display_name END,
        preferred_name = CASE WHEN v_applied_patch ? 'preferred_name' THEN NULLIF(trim(COALESCE(v_applied_patch->>'preferred_name', '')), '') ELSE c.preferred_name END,
        given_name = CASE WHEN v_applied_patch ? 'given_name' THEN NULLIF(trim(COALESCE(v_applied_patch->>'given_name', '')), '') ELSE c.given_name END,
        family_name = CASE WHEN v_applied_patch ? 'family_name' THEN NULLIF(trim(COALESCE(v_applied_patch->>'family_name', '')), '') ELSE c.family_name END,
        pronouns = CASE WHEN v_applied_patch ? 'pronouns' THEN NULLIF(trim(COALESCE(v_applied_patch->>'pronouns', '')), '') ELSE c.pronouns END,
        job_title = CASE WHEN v_applied_patch ? 'job_title' THEN NULLIF(trim(COALESCE(v_applied_patch->>'job_title', '')), '') ELSE c.job_title END,
        organization_name = CASE WHEN v_applied_patch ? 'organization_name' THEN NULLIF(trim(COALESCE(v_applied_patch->>'organization_name', '')), '') ELSE c.organization_name END,
        location = CASE WHEN v_applied_patch ? 'location' THEN NULLIF(trim(COALESCE(v_applied_patch->>'location', '')), '') ELSE c.location END,
        relationship_note = CASE WHEN v_applied_patch ? 'relationship_note' THEN NULLIF(trim(COALESCE(v_applied_patch->>'relationship_note', '')), '') ELSE c.relationship_note END,
        lifecycle_status = CASE WHEN v_applied_patch ? 'lifecycle_status' THEN NULLIF(trim(COALESCE(v_applied_patch->>'lifecycle_status', '')), '') ELSE c.lifecycle_status END,
        privacy_tier = CASE WHEN v_applied_patch ? 'privacy_tier' THEN NULLIF(trim(COALESCE(v_applied_patch->>'privacy_tier', '')), '') ELSE c.privacy_tier END,
        owner_label = CASE WHEN v_applied_patch ? 'owner_label' THEN NULLIF(trim(COALESCE(v_applied_patch->>'owner_label', '')), '') ELSE c.owner_label END,
        field_provenance = c.field_provenance || v_prov_patch,
        updated_at = v_now,
        updated_by = v_actor
    WHERE c.id = v_row.id;

    INSERT INTO public.crm_contact_change_log (contact_id, action, actor_label, changed_fields)
    VALUES (
      v_row.id,
      'contact.update',
      v_actor,
      jsonb_strip_nulls(jsonb_build_object(
        'patched_fields', to_jsonb(v_applied),
        'origin', p_origin,
        'run_id', p_run_id,
        'via_proposal', p_resolved_proposal_id
      ))
    );
  END IF;

  RETURN jsonb_build_object(
    'contact_id', v_row.id,
    'applied', to_jsonb(v_applied),
    'proposed', v_proposed,
    'conflicts', to_jsonb(v_conflicts),
    'record', (SELECT r.record FROM public.crm_get_contact(v_row.id) r)
  );
END;
$$;


--
-- Name: crm_propose_field(uuid, text, text, text, text, jsonb, numeric, text, uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_propose_field(p_contact_id uuid, p_target_kind text, p_field_key text, p_proposed_value text, p_origin text, p_origin_ref jsonb DEFAULT '{}'::jsonb, p_confidence numeric DEFAULT NULL::numeric, p_current_value text DEFAULT NULL::text, p_evidence_thought_ids uuid[] DEFAULT NULL::uuid[], p_normalized_value text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_field_key  TEXT := NULLIF(trim(COALESCE(p_field_key, '')), '');
  v_normalized TEXT := COALESCE(
    NULLIF(trim(COALESCE(p_normalized_value, '')), ''),
    lower(trim(COALESCE(p_proposed_value, '')))
  );
  v_key     TEXT;
  v_id      UUID;
  v_status  TEXT;
  v_created BOOLEAN := false;
BEGIN
  IF p_contact_id IS NULL THEN
    RAISE EXCEPTION 'contact_id is required';
  END IF;
  IF v_field_key IS NULL THEN
    RAISE EXCEPTION 'field_key is required';
  END IF;
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'a proposal needs a value';
  END IF;
  -- Manual edits never propose - they apply directly with auto-protection.
  IF p_origin NOT IN ('import', 'extraction', 'projection', 'generated') THEN
    RAISE EXCEPTION 'invalid proposal origin: %', p_origin;
  END IF;

  v_key := encode(sha256(convert_to(
    p_contact_id::text || '|' || p_target_kind || '|' || v_field_key || '|' || v_normalized || '|' || p_origin,
    'UTF8'
  )), 'hex');

  INSERT INTO public.crm_field_proposals (
    contact_id, target_kind, field_key, proposed_value, normalized_value,
    current_value, origin, origin_ref, confidence, proposal_key,
    evidence_thought_ids
  )
  VALUES (
    p_contact_id, p_target_kind, v_field_key, p_proposed_value, v_normalized,
    p_current_value, p_origin, COALESCE(p_origin_ref, '{}'::jsonb), p_confidence, v_key,
    COALESCE(p_evidence_thought_ids, ARRAY[]::UUID[])
  )
  ON CONFLICT (proposal_key) DO UPDATE
    SET seen_count   = crm_field_proposals.seen_count + 1,
        last_seen_at = timezone('utc', now()),
        -- Accumulate evidence across sightings; status is never touched, so a
        -- rejected proposal stays rejected no matter how often it re-appears.
        evidence_thought_ids = (
          SELECT COALESCE(array_agg(DISTINCT t), ARRAY[]::UUID[])
          FROM unnest(crm_field_proposals.evidence_thought_ids || COALESCE(EXCLUDED.evidence_thought_ids, ARRAY[]::UUID[])) t
        )
  RETURNING id, status, (xmax::text = '0') INTO v_id, v_status, v_created;

  RETURN jsonb_build_object('proposal_id', v_id, 'status', v_status, 'created', v_created);
END;
$$;


--
-- Name: crm_resolve_field_proposal(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_resolve_field_proposal(p_proposal_id uuid, p_decision text, p_actor text DEFAULT 'service'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(trim(p_actor), ''), 'service');
  v_p     public.crm_field_proposals%ROWTYPE;
  v_apply JSONB;
BEGIN
  IF p_decision NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'decision must be accept or reject';
  END IF;

  SELECT * INTO v_p
  FROM public.crm_field_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_p.id IS NULL THEN
    RAISE EXCEPTION 'proposal not found: %', p_proposal_id;
  END IF;
  IF v_p.status <> 'open' THEN
    -- Already decided: idempotent no-op, the canonical field is untouched.
    RETURN jsonb_build_object('proposal_id', v_p.id, 'status', v_p.status, 'changed', false);
  END IF;

  IF p_decision = 'accept' THEN
    IF v_p.target_kind = 'contact_field' THEN
      -- A human-locked field blocks acceptance too: the lock is a deliberate
      -- "do not change this" statement, stronger than auto-protection. Accepting
      -- a proposal passes p_resolved_proposal_id, which bypasses the lock inside
      -- the patch, so we must check the lock HERE, before applying, and refuse.
      IF COALESCE((
        SELECT (c.field_provenance->v_p.field_key->>'locked')::boolean
        FROM public.crm_contacts c WHERE c.id = v_p.contact_id
      ), false) THEN
        RAISE EXCEPTION 'field % is locked; unlock it before accepting this proposal', v_p.field_key;
      END IF;
      v_apply := public.crm_patch_contact_record(
        v_p.contact_id,
        jsonb_build_object(v_p.field_key, v_p.proposed_value),
        v_actor,
        v_p.origin,
        v_p.origin_ref->>'run_id',
        NULL,
        v_p.id
      );
    ELSIF v_p.target_kind = 'contact_method' THEN
      v_apply := public.crm_add_contact_method(
        v_p.contact_id, v_p.field_key, v_p.proposed_value, NULL, false, v_actor, v_p.origin
      );
    ELSE
      RAISE EXCEPTION 'accepting % proposals is not supported yet', v_p.target_kind;
    END IF;
  END IF;

  UPDATE public.crm_field_proposals
  SET status     = CASE WHEN p_decision = 'accept' THEN 'accepted' ELSE 'rejected' END,
      decided_at = timezone('utc', now()),
      decided_by = v_actor
  WHERE id = v_p.id;

  -- Either decision is itself evidence about the field. Evidence insertion is
  -- best-effort: a proposal whose evidence_thought_ids contains a deleted or
  -- mistyped UUID must not abort the decision. Filter to ids that actually exist
  -- in thoughts so the crm_field_evidence FK can never fire - the decision is
  -- recorded and the valid evidence still lands.
  INSERT INTO public.crm_field_evidence (contact_id, target_kind, target_id, field_key, thought_id, role, note, created_by)
  SELECT v_p.contact_id, 'proposal', v_p.id, v_p.field_key, t.id, 'correction',
         'proposal ' || p_decision || 'ed', v_actor
  FROM unnest(COALESCE(v_p.evidence_thought_ids, ARRAY[]::UUID[])) AS ev(thought_id)
  JOIN public.thoughts t ON t.id = ev.thought_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.crm_contact_change_log (contact_id, action, actor_label, changed_fields)
  VALUES (v_p.contact_id, 'proposal.' || p_decision, v_actor,
          jsonb_build_object('proposal_id', v_p.id, 'field_key', v_p.field_key, 'target_kind', v_p.target_kind));

  RETURN jsonb_build_object(
    'proposal_id', v_p.id,
    'status', CASE WHEN p_decision = 'accept' THEN 'accepted' ELSE 'rejected' END,
    'changed', true,
    'apply_result', v_apply
  );
END;
$$;


--
-- Name: crm_resolve_field_proposals_by_run(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_resolve_field_proposals_by_run(p_run_id text, p_decision text, p_actor text DEFAULT 'service'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id       UUID;
  v_resolved INTEGER := 0;
  v_failed   INTEGER := 0;
  v_failures JSONB := '[]'::jsonb;
BEGIN
  IF NULLIF(trim(COALESCE(p_run_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'run_id is required';
  END IF;

  FOR v_id IN
    SELECT id FROM public.crm_field_proposals
    WHERE status = 'open' AND origin_ref->>'run_id' = p_run_id
    ORDER BY created_at
  LOOP
    BEGIN
      PERFORM public.crm_resolve_field_proposal(v_id, p_decision, p_actor);
      v_resolved := v_resolved + 1;
    EXCEPTION WHEN others THEN
      v_failed := v_failed + 1;
      v_failures := v_failures || jsonb_build_object('proposal_id', v_id, 'error', sqlerrm);
    END;
  END LOOP;

  RETURN jsonb_build_object('resolved', v_resolved, 'failed', v_failed, 'failures', v_failures);
END;
$$;


--
-- Name: crm_set_field_lock(uuid, text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crm_set_field_lock(p_contact_id uuid, p_field_key text, p_locked boolean, p_actor text DEFAULT 'service'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(trim(p_actor), ''), 'service');
  v_contact_id UUID;
  v_entry JSONB;
BEGIN
  IF p_field_key IS NULL OR p_field_key NOT IN (
    'display_name', 'preferred_name', 'given_name', 'family_name', 'pronouns',
    'job_title', 'organization_name', 'location', 'relationship_note',
    'lifecycle_status', 'privacy_tier', 'owner_label'
  ) THEN
    RAISE EXCEPTION 'unknown contact field: %', p_field_key;
  END IF;

  SELECT c.id INTO v_contact_id
  FROM public.crm_contacts c
  WHERE c.id = p_contact_id
  FOR UPDATE;

  IF v_contact_id IS NULL THEN
    RAISE EXCEPTION 'CRM contact not found: %', p_contact_id;
  END IF;

  UPDATE public.crm_contacts c
  SET field_provenance = c.field_provenance || jsonb_build_object(
        p_field_key,
        COALESCE(c.field_provenance->p_field_key, jsonb_build_object('origin', 'manual'))
          || jsonb_build_object('locked', COALESCE(p_locked, false), 'actor', v_actor, 'at', timezone('utc', now()))
      ),
      updated_at = timezone('utc', now()),
      updated_by = v_actor
  WHERE c.id = v_contact_id
  RETURNING c.field_provenance->p_field_key INTO v_entry;

  INSERT INTO public.crm_contact_change_log (contact_id, action, actor_label, changed_fields)
  VALUES (v_contact_id, 'contact.update', v_actor,
          jsonb_build_object('field_lock', p_field_key, 'locked', COALESCE(p_locked, false)));

  RETURN jsonb_build_object('field', p_field_key, 'provenance', v_entry);
END;
$$;


--
-- Name: get_thought_connections(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_thought_connections(p_thought_id uuid, p_limit integer DEFAULT 20, p_exclude_restricted boolean DEFAULT true) RETURNS TABLE(id uuid, type text, importance smallint, preview text, created_at timestamp with time zone, shared_topics text[], shared_people text[], overlap_count integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  source_topics TEXT[];
  source_people TEXT[];
BEGIN
  -- Get the source thought's topics and people arrays from metadata
  SELECT
    coalesce(
      (SELECT array_agg(val) FROM jsonb_array_elements_text(t.metadata->'topics') val),
      '{}'::text[]
    ),
    coalesce(
      (SELECT array_agg(val) FROM jsonb_array_elements_text(t.metadata->'people') val),
      '{}'::text[]
    )
  INTO source_topics, source_people
  FROM thoughts t
  WHERE t.id = p_thought_id;

  -- If no topics or people, return empty set
  IF source_topics = '{}'::text[] AND source_people = '{}'::text[] THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      bt.id,
      bt.type,
      bt.importance,
      left(bt.content, 200) AS preview,
      bt.created_at,
      coalesce(
        (SELECT array_agg(val) FROM jsonb_array_elements_text(bt.metadata->'topics') val
         WHERE val = ANY(source_topics)),
        '{}'::text[]
      ) AS shared_topics,
      coalesce(
        (SELECT array_agg(val) FROM jsonb_array_elements_text(bt.metadata->'people') val
         WHERE val = ANY(source_people)),
        '{}'::text[]
      ) AS shared_people
    FROM thoughts bt
    WHERE bt.id != p_thought_id
      AND (NOT p_exclude_restricted OR bt.sensitivity_tier IS DISTINCT FROM 'restricted')
      AND (
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(bt.metadata->'topics') val
          WHERE val = ANY(source_topics)
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(bt.metadata->'people') val
          WHERE val = ANY(source_people)
        )
      )
  )
  SELECT
    c.id, c.type, c.importance, c.preview, c.created_at,
    c.shared_topics, c.shared_people,
    (coalesce(array_length(c.shared_topics, 1), 0) + coalesce(array_length(c.shared_people, 1), 0))::int AS overlap_count
  FROM candidates c
  ORDER BY overlap_count DESC, c.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: match_thoughts(public.vector, double precision, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_thoughts(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
declare
  v_exclude_restricted boolean := coalesce((filter->>'exclude_restricted')::boolean, false);
  v_start_date timestamptz := case when nullif(filter->>'start_date','') is not null
    then (filter->>'start_date')::timestamptz else null end;
  v_end_date timestamptz := case when nullif(filter->>'end_date','') is not null
    then (filter->>'end_date')::timestamptz else null end;
  v_meta_filter jsonb := coalesce(filter,'{}'::jsonb) - 'start_date' - 'end_date' - 'exclude_restricted';
begin
  return query
  select t.id, t.content, t.metadata,
    1 - (t.embedding <=> query_embedding) as similarity, t.created_at
  from thoughts t
  where t.embedding is not null
    and 1 - (t.embedding <=> query_embedding) > match_threshold
    and (v_meta_filter = '{}'::jsonb or t.metadata @> v_meta_filter)
    and (not v_exclude_restricted
         or (coalesce(t.sensitivity_tier, 'standard') <> 'restricted'
             and coalesce(t.metadata->>'sensitivity_tier', 'standard') <> 'restricted'))
    and (v_start_date is null or t.created_at >= v_start_date)
    and (v_end_date is null or t.created_at <= v_end_date)
  order by t.embedding <=> query_embedding
  limit match_count;
end; $$;


--
-- Name: search_thoughts_text(text, integer, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_thoughts_text(p_query text, p_limit integer DEFAULT 25, p_filter jsonb DEFAULT '{}'::jsonb, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, content text, type text, source_type text, importance smallint, quality_score numeric, sensitivity_tier text, metadata jsonb, created_at timestamp with time zone, rank real, total_count bigint)
    LANGUAGE plpgsql STABLE
    SET statement_timeout TO '25s'
    AS $$
DECLARE
  -- Reserved control keys, peeled off p_filter so they are not treated
  -- as metadata containment requirements.
  v_exclude_restricted BOOLEAN :=
    coalesce((p_filter->>'exclude_restricted')::boolean, false);
  v_start_date TIMESTAMPTZ :=
    CASE WHEN nullif(p_filter->>'start_date', '') IS NOT NULL
      THEN (p_filter->>'start_date')::timestamptz ELSE NULL END;
  v_end_date TIMESTAMPTZ :=
    CASE WHEN nullif(p_filter->>'end_date', '') IS NOT NULL
      THEN (p_filter->>'end_date')::timestamptz ELSE NULL END;
  -- Containment filter with the reserved keys removed.
  v_meta_filter JSONB :=
    coalesce(p_filter, '{}'::jsonb)
      - 'start_date' - 'end_date' - 'exclude_restricted';
BEGIN
  RETURN QUERY
  WITH query_input AS (
    SELECT
      trim(coalesce(p_query, '')) AS raw_query,
      websearch_to_tsquery('simple', trim(coalesce(p_query, ''))) AS ts_query
  ),
  -- Phase 1: GIN-indexed tsvector search (fast, uses index)
  tsvector_hits AS (
    SELECT t.id AS hit_id
    FROM public.thoughts t
    CROSS JOIN query_input q
    WHERE q.raw_query <> ''
      AND to_tsvector('simple', coalesce(t.content, '')) @@ q.ts_query
      AND t.metadata @> v_meta_filter
      AND (NOT v_exclude_restricted
           OR (coalesce(t.sensitivity_tier, 'standard') <> 'restricted'
               AND coalesce(t.metadata->>'sensitivity_tier', 'standard') <> 'restricted'))
      AND (v_start_date IS NULL OR t.created_at >= v_start_date)
      AND (v_end_date IS NULL OR t.created_at <= v_end_date)
    LIMIT 2000
  ),
  -- Phase 2: ILIKE fallback when tsvector finds fewer than needed
  ilike_hits AS (
    SELECT t.id AS hit_id
    FROM public.thoughts t
    CROSS JOIN query_input q
    WHERE q.raw_query <> ''
      AND (SELECT count(*) FROM tsvector_hits) < (p_limit + p_offset)
      AND t.content ILIKE '%' || q.raw_query || '%'
      AND t.metadata @> v_meta_filter
      AND (NOT v_exclude_restricted
           OR (coalesce(t.sensitivity_tier, 'standard') <> 'restricted'
               AND coalesce(t.metadata->>'sensitivity_tier', 'standard') <> 'restricted'))
      AND (v_start_date IS NULL OR t.created_at >= v_start_date)
      AND (v_end_date IS NULL OR t.created_at <= v_end_date)
      AND NOT EXISTS (SELECT 1 FROM tsvector_hits th WHERE th.hit_id = t.id)
    LIMIT 500
  ),
  all_hits AS (
    SELECT hit_id FROM tsvector_hits
    UNION
    SELECT hit_id FROM ilike_hits
  ),
  hit_count AS (
    SELECT count(*) AS cnt FROM all_hits
  ),
  ranked AS (
    SELECT
      t.id,
      t.content,
      t.type,
      t.source_type,
      t.importance,
      t.quality_score,
      t.sensitivity_tier,
      t.metadata,
      t.created_at,
      (
        greatest(
          ts_rank_cd(
            to_tsvector('simple', coalesce(t.content, '')),
            q.ts_query
          ),
          CASE
            WHEN q.raw_query <> '' AND t.content ILIKE '%' || q.raw_query || '%'
              THEN 0.35
            ELSE 0
          END
        )
        -- importance is 1..5; max bonus 5/20 = 0.25
        + (coalesce(t.importance, 3) / 20.0)::real
        -- quality_score is 0..100; max bonus 100/500 = 0.20
        + (coalesce(t.quality_score, 50) / 500.0)::real
      )::real AS rank
    FROM public.thoughts t
    CROSS JOIN query_input q
    WHERE t.id IN (SELECT ah.hit_id FROM all_hits ah)
    ORDER BY rank DESC, t.created_at DESC
  )
  SELECT
    r.id, r.content, r.type, r.source_type, r.importance,
    r.quality_score, r.sensitivity_tier, r.metadata, r.created_at,
    r.rank,
    hc.cnt AS total_count
  FROM ranked r
  CROSS JOIN hit_count hc
  OFFSET greatest(0, coalesce(p_offset, 0))
  LIMIT greatest(1, least(coalesce(p_limit, 25), 100));
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end; $$;


--
-- Name: upsert_thought(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_thought(p_content text, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_fingerprint TEXT;
  v_result JSONB;
  v_id UUID;
  v_metadata JSONB;
  -- "explicit_*" vars are NULL when the payload OMITS the field, and the
  -- caller-supplied value when it is present. They drive the merge path so an
  -- omitted field PRESERVES the existing column instead of resetting it to a
  -- hardcoded default (the v1.1 silent-overwrite / privacy-downgrade bug).
  v_explicit_type TEXT;
  v_explicit_source_type TEXT;
  v_explicit_importance SMALLINT;
  v_explicit_quality_score NUMERIC(5,2);
  v_explicit_sensitivity_tier TEXT;
  -- "insert_*" vars fold the INSERT-only defaults in. Used only on the INSERT
  -- (new-row) path, never to overwrite an existing column on merge.
  v_insert_type TEXT;
  v_insert_source_type TEXT;
  v_insert_importance SMALLINT;
  v_insert_quality_score NUMERIC(5,2);
  v_insert_sensitivity_tier TEXT;
  v_type TEXT;
  v_status TEXT;
  v_status_explicit BOOLEAN := false;
  v_existing_metadata JSONB;
  v_user_edits JSONB := '{}'::jsonb;
  v_protected_keys TEXT[] := ARRAY[]::text[];
  v_inserted BOOLEAN := false;
  -- How the row was resolved, surfaced in the return payload so callers that
  -- recompute an embedding/content from p_content can tell when they are
  -- looking at a CORRECTED row reached via the original-fingerprint fallback
  -- (p_content is the OLD, pre-correction text) and skip overwriting the
  -- corrected row's embedding/content with stale values. Values:
  --   'inserted'             — brand-new row (p_content is authoritative)
  --   'fingerprint'          — exact content_fingerprint dedup hit
  --   'original_fingerprint' — landed on a corrected row via the
  --                            metadata.original_fingerprints[] fallback;
  --                            p_content is STALE, do not overwrite content/embedding
  v_matched_via TEXT := 'inserted';
BEGIN
  v_metadata := COALESCE(p_payload->'metadata', '{}'::jsonb);

  -- Explicit-incoming values: NULL when the key is absent/blank/unparseable,
  -- so the merge path can distinguish "omitted" from "explicitly provided".
  v_explicit_type := NULLIF(v_metadata->>'type', '');
  v_explicit_source_type := COALESCE(
    NULLIF(v_metadata->>'source_type', ''),
    NULLIF(v_metadata->>'source', '')
  );
  v_explicit_importance := CASE
    WHEN COALESCE(v_metadata->>'importance', '') ~ '^[0-9]+(\.[0-9]+)?$'
      THEN LEAST(100, GREATEST(0, ROUND((v_metadata->>'importance')::numeric)))::smallint
    ELSE NULL
  END;
  v_explicit_quality_score := CASE
    WHEN COALESCE(v_metadata->>'quality_score', '') ~ '^[0-9]+(\.[0-9]+)?$'
      THEN LEAST(100, GREATEST(0, (v_metadata->>'quality_score')::numeric))
    ELSE NULL
  END;
  v_explicit_sensitivity_tier := NULLIF(v_metadata->>'sensitivity_tier', '');

  -- INSERT-path values: apply the v1.1 hardcoded defaults for brand-new rows.
  v_insert_type := COALESCE(v_explicit_type, 'observation');
  v_insert_source_type := COALESCE(v_explicit_source_type, 'unknown');
  v_insert_importance := COALESCE(v_explicit_importance, 50);
  v_insert_quality_score := COALESCE(v_explicit_quality_score, 70);
  v_insert_sensitivity_tier := COALESCE(v_explicit_sensitivity_tier, 'standard');

  -- v_type drives status seeding below; on insert it is the resolved type.
  v_type := v_insert_type;
  v_status := COALESCE(NULLIF(p_payload->>'status', ''), NULLIF(v_metadata->>'status', ''));
  v_status_explicit := v_status IS NOT NULL;
  -- INSERT-path auto-seed: task/idea get status 'new'. On the merge path this
  -- is re-derived from the EFFECTIVE (post-user-edit-guard) type so a guard-
  -- rejected incoming type cannot seed a 'new' status it never gets to set.
  IF v_status IS NULL AND v_type IN ('task', 'idea') THEN
    v_status := 'new';
  END IF;

  v_fingerprint := encode(sha256(convert_to(
    lower(trim(regexp_replace(p_content, '\s+', ' ', 'g'))),
    'UTF8'
  )), 'hex');

  -- (a) Exact-fingerprint lookup first (the v1 ON CONFLICT key).
  SELECT t.id, t.metadata
    INTO v_id, v_existing_metadata
  FROM public.thoughts t
  WHERE t.content_fingerprint = v_fingerprint
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    v_matched_via := 'fingerprint';
  END IF;

  -- (a) Original-fingerprint fallback: land on the corrected row instead
  -- of inserting a stale sibling that outvotes the correction. p_content
  -- here is the OLD pre-correction text, so this is a PURE dedup hit: the
  -- row's content/embedding belong to the correction and must not be
  -- overwritten with the stale incoming text. The merge below never touches
  -- content, and the 'original_fingerprint' signal in the return payload
  -- tells the caller to skip recomputing the embedding from p_content.
  IF v_id IS NULL THEN
    SELECT t.id, t.metadata
      INTO v_id, v_existing_metadata
    FROM public.thoughts t
    WHERE jsonb_typeof(t.metadata->'original_fingerprints') = 'array'
      AND t.metadata->'original_fingerprints' ? v_fingerprint
    ORDER BY t.created_at ASC, t.id ASC
    LIMIT 1
    FOR UPDATE;
    IF v_id IS NOT NULL THEN
      v_matched_via := 'original_fingerprint';
    END IF;
  END IF;

  IF v_id IS NULL THEN
    -- INSERT path. Imports cannot mint malformed protections: drop
    -- user_edits / original_fingerprints from the inserted metadata
    -- unless they are well-formed (a round-tripped export keeps valid
    -- stamps).
    IF v_metadata ? 'user_edits'
       AND jsonb_typeof(v_metadata->'user_edits') <> 'object' THEN
      v_metadata := v_metadata - 'user_edits';
    END IF;
    IF v_metadata ? 'original_fingerprints'
       AND jsonb_typeof(v_metadata->'original_fingerprints') <> 'array' THEN
      v_metadata := v_metadata - 'original_fingerprints';
    END IF;

    -- Race guard: the explicit lookup above is not atomic with this INSERT,
    -- so a concurrent call with the same content_fingerprint can slip in
    -- between. v1 got this for free from ON CONFLICT; here we catch the
    -- unique_violation, re-read the row the other txn inserted, and fall
    -- through to the UPDATE/merge path so the contract (always return an
    -- existing-or-new {id, fingerprint}) holds.
    BEGIN
      INSERT INTO public.thoughts (
        content,
        content_fingerprint,
        metadata,
        type,
        source_type,
        importance,
        quality_score,
        sensitivity_tier,
        status,
        status_updated_at
      )
      VALUES (
        p_content,
        v_fingerprint,
        v_metadata,
        v_insert_type,
        v_insert_source_type,
        v_insert_importance,
        v_insert_quality_score,
        v_insert_sensitivity_tier,
        v_status,
        CASE WHEN v_status IS NULL THEN NULL ELSE now() END
      )
      RETURNING id INTO v_id;
      v_inserted := true;
    EXCEPTION WHEN unique_violation THEN
      -- Another transaction inserted this fingerprint first. Adopt its row
      -- and continue into the merge branch below. This is an exact-fingerprint
      -- dedup hit (same content), so the caller may still write content/embedding.
      v_matched_via := 'fingerprint';
      SELECT t.id, t.metadata
        INTO v_id, v_existing_metadata
      FROM public.thoughts t
      WHERE t.content_fingerprint = v_fingerprint
      FOR UPDATE;
      -- Restore the caller's incoming metadata for the merge step (the
      -- INSERT-path malformed-protection stripping above does not apply on
      -- the merge path, which has its own user-edit guard).
      v_metadata := COALESCE(p_payload->'metadata', '{}'::jsonb);
    END;
  END IF;

  IF NOT v_inserted THEN
    -- (b) User-edit guard: strip human-owned keys (and the system-managed
    -- user_edits / original_fingerprints maps) from the incoming patch so
    -- the merge can never resurrect stale values over a correction.
    v_user_edits := COALESCE(v_existing_metadata->'user_edits', '{}'::jsonb);
    IF jsonb_typeof(v_user_edits) <> 'object' THEN
      v_user_edits := '{}'::jsonb;
    END IF;
    IF v_user_edits <> '{}'::jsonb THEN
      SELECT COALESCE(array_agg(k), ARRAY[]::text[])
        INTO v_protected_keys
        FROM jsonb_object_keys(v_user_edits) k;
      v_metadata := v_metadata - v_protected_keys;

      -- Keep the promoted scalar column in sync with the metadata guard: if a
      -- field is marked human-owned, drop the incoming scalar too so the
      -- existing column is preserved (column and metadata stay in agreement
      -- instead of the column overwriting while metadata.<key> is kept).
      IF v_user_edits ? 'type' THEN
        v_explicit_type := NULL;
      END IF;
      IF v_user_edits ? 'source_type' OR v_user_edits ? 'source' THEN
        v_explicit_source_type := NULL;
        -- source / source_type are aliases for one scalar column. If either
        -- is human-owned, strip BOTH metadata keys so the unprotected alias
        -- can't merge in and diverge from the preserved column.
        v_metadata := v_metadata - 'source_type' - 'source';
      END IF;
      IF v_user_edits ? 'importance' THEN
        v_explicit_importance := NULL;
      END IF;
      IF v_user_edits ? 'quality_score' THEN
        v_explicit_quality_score := NULL;
      END IF;
      IF v_user_edits ? 'sensitivity_tier' THEN
        v_explicit_sensitivity_tier := NULL;
      END IF;
    END IF;
    v_metadata := v_metadata - 'user_edits';
    v_metadata := v_metadata - 'original_fingerprints';

    -- Re-derive the auto-seeded status from the EFFECTIVE type (the value the
    -- merge will actually write: explicit-if-provided-and-not-guarded, else the
    -- existing column). Without this, an incoming type that the user-edit guard
    -- rejects could still leave v_status='new' seeded from it. An explicitly
    -- supplied status is never overridden.
    IF NOT v_status_explicit THEN
      SELECT COALESCE(v_explicit_type, t.type)
        INTO v_type
      FROM public.thoughts t
      WHERE t.id = v_id;
      IF v_type IN ('task', 'idea') THEN
        v_status := 'new';
      ELSE
        v_status := NULL;
      END IF;
    END IF;

    -- Merge path: an OMITTED scalar field PRESERVES the existing column
    -- (v_explicit_* is NULL when the payload did not provide it); an explicit
    -- value still updates. Insert-only defaults never apply here.
    UPDATE public.thoughts SET
      updated_at = now(),
      metadata = public.thoughts.metadata || v_metadata,
      type = COALESCE(v_explicit_type, public.thoughts.type),
      source_type = COALESCE(v_explicit_source_type, public.thoughts.source_type),
      importance = COALESCE(v_explicit_importance, public.thoughts.importance),
      quality_score = COALESCE(v_explicit_quality_score, public.thoughts.quality_score),
      sensitivity_tier = COALESCE(v_explicit_sensitivity_tier, public.thoughts.sensitivity_tier),
      status = COALESCE(v_status, public.thoughts.status),
      status_updated_at = CASE
        WHEN COALESCE(v_status, public.thoughts.status)
             IS DISTINCT FROM public.thoughts.status THEN now()
        ELSE public.thoughts.status_updated_at
      END
    WHERE public.thoughts.id = v_id;
  END IF;

  -- {id, fingerprint} is the unchanged v1 contract; matched_via is additive
  -- (existing callers that read only id/fingerprint are unaffected) and lets a
  -- caller skip overwriting a corrected row's content/embedding with stale text
  -- when the match came via the original-fingerprint fallback.
  v_result := jsonb_build_object(
    'id', v_id,
    'fingerprint', v_fingerprint,
    'matched_via', v_matched_via
  );
  RETURN v_result;
END;
$_$;


--
-- Name: wiki_accept_pending(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wiki_accept_pending(p_section_id uuid, p_actor text DEFAULT 'system'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := coalesce(nullif(trim(p_actor), ''), 'system');
  v_row   public.wiki_sections%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.wiki_sections WHERE id = p_section_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'section not found: %', p_section_id; END IF;
  IF v_row.pending_generated_md IS NULL THEN
    RETURN jsonb_build_object('section_id', v_row.id, 'action', 'no_pending');
  END IF;

  -- Accepting keeps the section human-owned ('manual'): the machine still
  -- proposes next time (its writes keep parking as pending). Releasing the
  -- section back to auto-generated is a separate, explicit choice - set origin
  -- back to 'generated' directly.
  UPDATE public.wiki_sections
  SET body_md              = v_row.pending_generated_md,
      origin               = 'manual',
      pending_generated_md = NULL,
      pending_generated_at = NULL,
      updated_at           = timezone('utc', now()),
      updated_by           = v_actor
  WHERE id = v_row.id;

  INSERT INTO public.wiki_section_revisions (section_id, body_md, origin, actor)
  VALUES (v_row.id, v_row.pending_generated_md, 'generated', v_actor);

  RETURN jsonb_build_object('section_id', v_row.id, 'action', 'accepted');
END;
$$;


--
-- Name: FUNCTION wiki_accept_pending(p_section_id uuid, p_actor text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wiki_accept_pending(p_section_id uuid, p_actor text) IS 'Promote a parked pending draft to the live section body, snapshot a revision, and keep the section human-owned. No-op when there is no pending draft.';


--
-- Name: wiki_reject_pending(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wiki_reject_pending(p_section_id uuid, p_actor text DEFAULT 'unknown'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor TEXT := coalesce(nullif(trim(p_actor), ''), 'unknown');
  v_row   public.wiki_sections%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.wiki_sections WHERE id = p_section_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'section not found: %', p_section_id; END IF;
  IF v_row.pending_generated_md IS NULL THEN
    RETURN jsonb_build_object('section_id', v_row.id, 'action', 'no_pending');
  END IF;

  -- Discard the parked draft. body_md, origin, locked, and heading are left
  -- exactly as they were - reject only clears the pending buffer, it never
  -- mutates the live section content or its ownership.
  UPDATE public.wiki_sections
  SET pending_generated_md = NULL,
      pending_generated_at = NULL,
      updated_at           = timezone('utc', now()),
      updated_by           = v_actor
  WHERE id = v_row.id;

  RETURN jsonb_build_object('section_id', v_row.id, 'action', 'rejected');
END;
$$;


--
-- Name: FUNCTION wiki_reject_pending(p_section_id uuid, p_actor text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wiki_reject_pending(p_section_id uuid, p_actor text) IS 'Discard a parked pending draft, leaving body_md, origin, locked, and heading untouched. No revision is written (body_md does not change). No-op when there is no pending draft.';


--
-- Name: wiki_upsert_page(text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wiki_upsert_page(p_slug text, p_title text, p_page_kind text DEFAULT 'topic'::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_actor text DEFAULT 'system'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_slug    TEXT := nullif(trim(coalesce(p_slug, '')), '');
  v_title   TEXT := nullif(trim(coalesce(p_title, '')), '');
  v_actor   TEXT := coalesce(nullif(trim(p_actor), ''), 'system');
  v_id      UUID;
  v_created BOOLEAN := false;
BEGIN
  IF v_slug IS NULL THEN RAISE EXCEPTION 'slug is required'; END IF;
  IF v_title IS NULL THEN RAISE EXCEPTION 'title is required'; END IF;

  INSERT INTO public.wiki_pages (slug, title, page_kind, metadata, created_by, updated_by)
  VALUES (
    v_slug, v_title,
    coalesce(nullif(trim(p_page_kind), ''), 'topic'),
    coalesce(p_metadata, '{}'::jsonb),
    v_actor, v_actor
  )
  ON CONFLICT (slug) DO UPDATE
    SET title      = EXCLUDED.title,
        metadata   = public.wiki_pages.metadata || EXCLUDED.metadata,
        updated_at = timezone('utc', now()),
        updated_by = v_actor
  RETURNING id, (xmax = 0) INTO v_id, v_created;

  RETURN jsonb_build_object('page_id', v_id, 'created', v_created);
END;
$$;


--
-- Name: FUNCTION wiki_upsert_page(p_slug text, p_title text, p_page_kind text, p_metadata jsonb, p_actor text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wiki_upsert_page(p_slug text, p_title text, p_page_kind text, p_metadata jsonb, p_actor text) IS 'Create or update a wiki page by slug. Returns {page_id, created}. Shared by generators and REST callers.';


--
-- Name: wiki_write_section(uuid, text, text, text, text, jsonb, uuid[], integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wiki_write_section(p_page_id uuid, p_section_key text, p_body_md text, p_origin text DEFAULT 'generated'::text, p_heading text DEFAULT NULL::text, p_generation_source jsonb DEFAULT '{}'::jsonb, p_evidence_thought_ids uuid[] DEFAULT NULL::uuid[], p_display_order integer DEFAULT NULL::integer, p_actor text DEFAULT 'system'::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_key   TEXT := nullif(trim(coalesce(p_section_key, '')), '');
  v_actor TEXT := coalesce(nullif(trim(p_actor), ''), 'system');
  v_row   public.wiki_sections%ROWTYPE;
  v_now   TIMESTAMPTZ := timezone('utc', now());
BEGIN
  IF v_key IS NULL THEN RAISE EXCEPTION 'section_key is required'; END IF;
  IF p_origin NOT IN ('manual', 'generated') THEN
    RAISE EXCEPTION 'invalid section origin: %', p_origin;
  END IF;

  -- New section: insert race-safely. Two concurrent first writes to the same
  -- (page_id, section_key) both reach this INSERT; the unique constraint
  -- serializes them, so ON CONFLICT DO NOTHING lets the loser fall through to
  -- the existing-section path instead of raising a unique violation. The winner
  -- gets a row back here and snapshots the first revision.
  INSERT INTO public.wiki_sections (
    page_id, section_key, heading, display_order, origin, body_md,
    generation_source, evidence_thought_ids, created_by, updated_by
  )
  VALUES (
    p_page_id, v_key, nullif(trim(coalesce(p_heading, '')), ''),
    coalesce(p_display_order, 100), p_origin, coalesce(p_body_md, ''),
    coalesce(p_generation_source, '{}'::jsonb),
    coalesce(p_evidence_thought_ids, ARRAY[]::UUID[]),
    v_actor, v_actor
  )
  ON CONFLICT (page_id, section_key) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NOT NULL THEN
    INSERT INTO public.wiki_section_revisions (section_id, body_md, origin, actor)
    VALUES (v_row.id, v_row.body_md, p_origin, v_actor);

    RETURN jsonb_build_object('section_id', v_row.id, 'action', 'created');
  END IF;

  -- The section already existed (ON CONFLICT fired). Lock the existing row for
  -- the duration of the transaction so concurrent writers cannot race the
  -- ownership check below.
  SELECT * INTO v_row
  FROM public.wiki_sections
  WHERE page_id = p_page_id AND section_key = v_key
  FOR UPDATE;

  -- THE REGEN RULE: a machine ('generated') may never overwrite a section a
  -- human owns ('manual' or locked). The new draft parks in the pending buffer
  -- for diff/accept; the live body is left untouched.
  IF p_origin = 'generated' AND (v_row.origin = 'manual' OR v_row.locked) THEN
    UPDATE public.wiki_sections
    SET pending_generated_md = coalesce(p_body_md, ''),
        pending_generated_at = v_now,
        generation_source    = coalesce(p_generation_source, generation_source),
        updated_at           = v_now,
        updated_by           = v_actor
    WHERE id = v_row.id;
    RETURN jsonb_build_object('section_id', v_row.id, 'action', 'pending');
  END IF;

  -- Otherwise update in place. A 'manual' write takes ownership of the section;
  -- a 'generated' write to a still-machine-owned section refreshes it. Either
  -- way the pending buffer is cleared and a revision is snapshotted on a real
  -- body change.
  UPDATE public.wiki_sections
  SET body_md              = coalesce(p_body_md, ''),
      heading              = coalesce(nullif(trim(coalesce(p_heading, '')), ''), heading),
      origin               = CASE WHEN p_origin = 'manual' THEN 'manual' ELSE origin END,
      display_order        = coalesce(p_display_order, display_order),
      generation_source    = CASE WHEN p_origin = 'generated' THEN coalesce(p_generation_source, generation_source) ELSE generation_source END,
      evidence_thought_ids = coalesce(p_evidence_thought_ids, evidence_thought_ids),
      pending_generated_md = NULL,
      pending_generated_at = NULL,
      deleted_at           = NULL,
      updated_at           = v_now,
      updated_by           = v_actor
  WHERE id = v_row.id;

  IF coalesce(p_body_md, '') IS DISTINCT FROM v_row.body_md THEN
    INSERT INTO public.wiki_section_revisions (section_id, body_md, origin, actor)
    VALUES (v_row.id, coalesce(p_body_md, ''), p_origin, v_actor);
  END IF;

  RETURN jsonb_build_object('section_id', v_row.id, 'action', 'updated');
END;
$$;


--
-- Name: FUNCTION wiki_write_section(p_page_id uuid, p_section_key text, p_body_md text, p_origin text, p_heading text, p_generation_source jsonb, p_evidence_thought_ids uuid[], p_display_order integer, p_actor text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wiki_write_section(p_page_id uuid, p_section_key text, p_body_md text, p_origin text, p_heading text, p_generation_source jsonb, p_evidence_thought_ids uuid[], p_display_order integer, p_actor text) IS 'The single write guard for section content. A generated write to a human-owned (manual/locked) section parks a pending draft instead of overwriting; all other writes update in place and snapshot a revision. Returns {section_id, action} where action is created|pending|updated.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thought_id uuid,
    workspace_id text NOT NULL,
    project_id text,
    channel_kind text,
    channel_id text,
    channel_thread_id text,
    visibility text DEFAULT 'project'::text NOT NULL,
    memory_type text NOT NULL,
    summary text NOT NULL,
    content text NOT NULL,
    lifecycle_status text DEFAULT 'active'::text NOT NULL,
    provenance_status text DEFAULT 'generated'::text NOT NULL,
    confidence numeric(3,2) DEFAULT 0.50 NOT NULL,
    created_by text DEFAULT 'agent'::text NOT NULL,
    runtime_name text,
    runtime_version text,
    provider text,
    model text,
    task_id text,
    flow_id text,
    can_use_as_instruction boolean DEFAULT false NOT NULL,
    can_use_as_evidence boolean DEFAULT true NOT NULL,
    requires_user_confirmation boolean DEFAULT true NOT NULL,
    review_status text DEFAULT 'pending'::text NOT NULL,
    last_confirmed_at timestamp with time zone,
    stale_after timestamp with time zone,
    idempotency_key text,
    content_hash text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_memories_check CHECK (((can_use_as_instruction = false) OR (provenance_status = ANY (ARRAY['user_confirmed'::text, 'imported'::text])))),
    CONSTRAINT agent_memories_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT agent_memories_created_by_check CHECK ((created_by = ANY (ARRAY['user'::text, 'agent'::text, 'system'::text, 'import'::text]))),
    CONSTRAINT agent_memories_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['active'::text, 'stale'::text, 'superseded'::text, 'disputed'::text, 'rejected'::text]))),
    CONSTRAINT agent_memories_memory_type_check CHECK ((memory_type = ANY (ARRAY['decision'::text, 'output'::text, 'lesson'::text, 'constraint'::text, 'open_question'::text, 'failure'::text, 'artifact_reference'::text, 'work_log'::text]))),
    CONSTRAINT agent_memories_provenance_status_check CHECK ((provenance_status = ANY (ARRAY['observed'::text, 'inferred'::text, 'user_confirmed'::text, 'imported'::text, 'generated'::text, 'superseded'::text, 'disputed'::text]))),
    CONSTRAINT agent_memories_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'evidence_only'::text, 'restricted'::text, 'rejected'::text, 'stale'::text, 'merged'::text]))),
    CONSTRAINT agent_memories_visibility_check CHECK ((visibility = ANY (ARRAY['personal'::text, 'channel'::text, 'project'::text, 'workspace'::text, 'organization'::text])))
);


--
-- Name: agent_memory_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memory_id uuid NOT NULL,
    artifact_kind text NOT NULL,
    uri text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_memory_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    workspace_id text,
    project_id text,
    memory_id uuid,
    trace_id uuid,
    actor_kind text DEFAULT 'system'::text NOT NULL,
    actor_label text,
    runtime_name text,
    task_id text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_memory_audit_events_actor_kind_check CHECK ((actor_kind = ANY (ARRAY['user'::text, 'agent'::text, 'system'::text, 'import'::text]))),
    CONSTRAINT agent_memory_audit_events_event_type_check CHECK ((event_type = ANY (ARRAY['recall_requested'::text, 'memory_returned'::text, 'memory_used'::text, 'memory_ignored'::text, 'memory_written'::text, 'memory_confirmed'::text, 'memory_edited'::text, 'memory_rejected'::text, 'memory_superseded'::text, 'memory_disputed'::text])))
);


--
-- Name: agent_memory_recall_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_recall_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trace_id uuid NOT NULL,
    memory_id uuid NOT NULL,
    rank integer NOT NULL,
    similarity numeric(5,4),
    ranking_score numeric(7,4),
    returned boolean DEFAULT true NOT NULL,
    used boolean,
    ignored_reason text,
    use_policy_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_memory_recall_traces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_recall_traces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id text NOT NULL,
    project_id text,
    runtime_name text,
    runtime_version text,
    task_id text,
    flow_id text,
    channel_kind text,
    channel_id text,
    query text NOT NULL,
    schema_version text NOT NULL,
    request_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_memory_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_memory_id uuid NOT NULL,
    to_memory_id uuid NOT NULL,
    relation text NOT NULL,
    confidence numeric(3,2) DEFAULT 0.50,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_memory_relations_check CHECK ((from_memory_id <> to_memory_id)),
    CONSTRAINT agent_memory_relations_confidence_check CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT agent_memory_relations_relation_check CHECK ((relation = ANY (ARRAY['related_to'::text, 'supersedes'::text, 'superseded_by'::text, 'conflicts_with'::text, 'merged_into'::text])))
);


--
-- Name: agent_memory_review_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_review_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memory_id uuid NOT NULL,
    action text NOT NULL,
    actor_id text,
    actor_label text,
    notes text,
    before jsonb,
    after jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_memory_review_actions_action_check CHECK ((action = ANY (ARRAY['confirm'::text, 'edit'::text, 'evidence_only'::text, 'restrict_scope'::text, 'mark_stale'::text, 'merge'::text, 'reject'::text, 'dispute'::text, 'supersede'::text])))
);


--
-- Name: agent_memory_source_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_source_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memory_id uuid NOT NULL,
    source_kind text NOT NULL,
    uri text,
    title text,
    source_timestamp timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crm_contact_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_contact_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    alias text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    confidence numeric(4,3) DEFAULT 1.0 NOT NULL,
    status text DEFAULT 'current'::text NOT NULL,
    superseded_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by text DEFAULT 'system'::text NOT NULL,
    CONSTRAINT crm_contact_aliases_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT crm_contact_aliases_status_check CHECK ((status = ANY (ARRAY['current'::text, 'superseded'::text, 'rejected'::text])))
);


--
-- Name: TABLE crm_contact_aliases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_contact_aliases IS 'Alternate names for a contact, used for duplicate-safe future merge/link workflows.';


--
-- Name: crm_contact_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_contact_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid,
    method_id uuid,
    alias_id uuid,
    action text NOT NULL,
    actor_label text DEFAULT 'service'::text NOT NULL,
    changed_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE crm_contact_change_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_contact_change_log IS 'Append-only CRM edit audit. Contact-method values are redacted ([redacted]) in changed_fields; raw email/phone strings are never stored here.';


--
-- Name: crm_contact_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_contact_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    method_type text NOT NULL,
    value text NOT NULL,
    label text,
    is_primary boolean DEFAULT false NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    confidence numeric(4,3) DEFAULT 1.0 NOT NULL,
    status text DEFAULT 'current'::text NOT NULL,
    superseded_by uuid,
    source_run_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by text DEFAULT 'system'::text NOT NULL,
    updated_by text DEFAULT 'system'::text NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT crm_contact_methods_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT crm_contact_methods_method_type_check CHECK ((method_type = ANY (ARRAY['email'::text, 'phone'::text, 'url'::text, 'social'::text, 'address'::text, 'other'::text]))),
    CONSTRAINT crm_contact_methods_status_check CHECK ((status = ANY (ARRAY['current'::text, 'superseded'::text, 'rejected'::text])))
);


--
-- Name: TABLE crm_contact_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_contact_methods IS 'Editable contact methods (email/phone/url/social/address). Values are contact data; they are redacted in the change log.';


--
-- Name: crm_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_kind text DEFAULT 'manual'::text NOT NULL,
    display_name text NOT NULL,
    canonical_name text,
    canonical_email text,
    preferred_name text,
    given_name text,
    family_name text,
    pronouns text,
    job_title text,
    organization_name text,
    location text,
    relationship_note text,
    lifecycle_status text DEFAULT 'active'::text NOT NULL,
    privacy_tier text DEFAULT 'standard'::text NOT NULL,
    owner_label text DEFAULT 'personal'::text NOT NULL,
    source_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    editable_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    field_provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by text DEFAULT 'system'::text NOT NULL,
    updated_by text DEFAULT 'system'::text NOT NULL,
    card_thought_id uuid,
    CONSTRAINT crm_contacts_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['active'::text, 'archived'::text]))),
    CONSTRAINT crm_contacts_privacy_tier_check CHECK ((privacy_tier = ANY (ARRAY['standard'::text, 'sensitive'::text, 'restricted'::text])))
);


--
-- Name: TABLE crm_contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_contacts IS 'Editable CRM contact records. The canonical, human-owned record; machine writers must go through crm_propose_field, never write here directly.';


--
-- Name: COLUMN crm_contacts.relationship_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_contacts.relationship_note IS 'Free-text note about the relationship. This is NOT a relationship tier; the tier system is a separate schema (crm-person-tiers).';


--
-- Name: COLUMN crm_contacts.field_provenance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_contacts.field_provenance IS 'Per editable field: {origin: manual|import|extraction|projection|generated, actor, run_id, at, locked}. Manual origin out-ranks machine writers (auto-protection); locked additionally blocks manual bulk overwrites.';


--
-- Name: COLUMN crm_contacts.card_thought_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_contacts.card_thought_id IS 'Live, searchable card thought for this contact (source_type crm_contact_card): a summary re-embedded on every accepted change. Written by the REST write-back layer, not by this schema; carries metadata.generated_by=''crm-write-back'' so entity extraction skips it. ON DELETE SET NULL so removing the card thought never removes the contact.';


--
-- Name: crm_field_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_field_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    target_kind text NOT NULL,
    target_id uuid,
    field_key text NOT NULL,
    thought_id uuid NOT NULL,
    role text NOT NULL,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT crm_field_evidence_role_check CHECK ((role = ANY (ARRAY['supports'::text, 'contradicts'::text, 'source'::text, 'correction'::text]))),
    CONSTRAINT crm_field_evidence_target_kind_check CHECK ((target_kind = ANY (ARRAY['contact_field'::text, 'contact_method'::text, 'alias'::text, 'proposal'::text])))
);


--
-- Name: TABLE crm_field_evidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_field_evidence IS 'Links CRM truth (a field / method / proposal) to the thoughts (UUID) that support or contradict it.';


--
-- Name: crm_field_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_field_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    target_kind text NOT NULL,
    field_key text NOT NULL,
    proposed_value text,
    normalized_value text NOT NULL,
    current_value text,
    origin text NOT NULL,
    origin_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence numeric(4,3),
    proposal_key text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    evidence_thought_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    seen_count integer DEFAULT 1 NOT NULL,
    last_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    decided_at timestamp with time zone,
    decided_by text,
    CONSTRAINT crm_field_proposals_origin_check CHECK ((origin = ANY (ARRAY['import'::text, 'extraction'::text, 'projection'::text, 'generated'::text]))),
    CONSTRAINT crm_field_proposals_status_check CHECK ((status = ANY (ARRAY['open'::text, 'accepted'::text, 'rejected'::text, 'stale'::text]))),
    CONSTRAINT crm_field_proposals_target_kind_check CHECK ((target_kind = ANY (ARRAY['contact_field'::text, 'contact_method'::text, 'alias'::text])))
);


--
-- Name: TABLE crm_field_proposals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_field_proposals IS 'Inbox for machine writers: imports / extraction / projection PROPOSE changes to user-controlled CRM truth instead of applying them. proposal_key uniqueness is unconditional so a rejected value can never be re-proposed.';


--
-- Name: thoughts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thoughts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    content_fingerprint text,
    type text,
    sensitivity_tier text DEFAULT 'standard'::text,
    importance smallint DEFAULT 3,
    quality_score numeric(5,2) DEFAULT 50,
    source_type text,
    enriched boolean DEFAULT false,
    status text,
    status_updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: wiki_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wiki_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    page_kind text DEFAULT 'topic'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by text DEFAULT 'system'::text NOT NULL,
    updated_by text DEFAULT 'system'::text NOT NULL,
    CONSTRAINT wiki_pages_page_kind_check CHECK ((page_kind = ANY (ARRAY['topic'::text, 'entity'::text, 'autobiography'::text, 'custom'::text]))),
    CONSTRAINT wiki_pages_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);


--
-- Name: TABLE wiki_pages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wiki_pages IS 'Persistent wiki pages. One row per page, keyed by slug. No thought/entity FK - a page is identified by its slug.';


--
-- Name: wiki_section_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wiki_section_revisions (
    id bigint NOT NULL,
    section_id uuid NOT NULL,
    body_md text NOT NULL,
    origin text NOT NULL,
    actor text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE wiki_section_revisions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wiki_section_revisions IS 'Append-only revision history for section bodies. One row per body change. id is an internal sequence, never a thought id.';


--
-- Name: wiki_section_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.wiki_section_revisions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.wiki_section_revisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wiki_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wiki_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    section_key text NOT NULL,
    heading text,
    display_order integer DEFAULT 100 NOT NULL,
    origin text DEFAULT 'generated'::text NOT NULL,
    body_md text DEFAULT ''::text NOT NULL,
    pending_generated_md text,
    pending_generated_at timestamp with time zone,
    generation_source jsonb DEFAULT '{}'::jsonb NOT NULL,
    evidence_thought_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by text DEFAULT 'system'::text NOT NULL,
    updated_by text DEFAULT 'system'::text NOT NULL,
    CONSTRAINT wiki_sections_origin_check CHECK ((origin = ANY (ARRAY['manual'::text, 'generated'::text])))
);


--
-- Name: TABLE wiki_sections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wiki_sections IS 'Chapters within a wiki page with per-section ownership. origin=generated is machine-owned; origin=manual (or locked) is human-owned and only receives pending drafts from generated writes.';


--
-- Name: COLUMN wiki_sections.pending_generated_md; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wiki_sections.pending_generated_md IS 'A machine draft parked for human review because the section is human-owned. Promoted by wiki_accept_pending.';


--
-- Name: COLUMN wiki_sections.evidence_thought_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wiki_sections.evidence_thought_ids IS 'UUID[] of public.thoughts(id) that support this section. Plain array, not a per-element FK.';


--
-- Name: agent_memories agent_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT agent_memories_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_artifacts agent_memory_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_artifacts
    ADD CONSTRAINT agent_memory_artifacts_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_audit_events agent_memory_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_audit_events
    ADD CONSTRAINT agent_memory_audit_events_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_recall_items agent_memory_recall_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_recall_items
    ADD CONSTRAINT agent_memory_recall_items_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_recall_items agent_memory_recall_items_trace_id_memory_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_recall_items
    ADD CONSTRAINT agent_memory_recall_items_trace_id_memory_id_key UNIQUE (trace_id, memory_id);


--
-- Name: agent_memory_recall_traces agent_memory_recall_traces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_recall_traces
    ADD CONSTRAINT agent_memory_recall_traces_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_recall_traces agent_memory_recall_traces_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_recall_traces
    ADD CONSTRAINT agent_memory_recall_traces_request_id_key UNIQUE (request_id);


--
-- Name: agent_memory_relations agent_memory_relations_from_memory_id_to_memory_id_relation_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_relations
    ADD CONSTRAINT agent_memory_relations_from_memory_id_to_memory_id_relation_key UNIQUE (from_memory_id, to_memory_id, relation);


--
-- Name: agent_memory_relations agent_memory_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_relations
    ADD CONSTRAINT agent_memory_relations_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_review_actions agent_memory_review_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_review_actions
    ADD CONSTRAINT agent_memory_review_actions_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_source_refs agent_memory_source_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_source_refs
    ADD CONSTRAINT agent_memory_source_refs_pkey PRIMARY KEY (id);


--
-- Name: crm_contact_aliases crm_contact_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_aliases
    ADD CONSTRAINT crm_contact_aliases_pkey PRIMARY KEY (id);


--
-- Name: crm_contact_change_log crm_contact_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_change_log
    ADD CONSTRAINT crm_contact_change_log_pkey PRIMARY KEY (id);


--
-- Name: crm_contact_methods crm_contact_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_methods
    ADD CONSTRAINT crm_contact_methods_pkey PRIMARY KEY (id);


--
-- Name: crm_contacts crm_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contacts
    ADD CONSTRAINT crm_contacts_pkey PRIMARY KEY (id);


--
-- Name: crm_field_evidence crm_field_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_field_evidence
    ADD CONSTRAINT crm_field_evidence_pkey PRIMARY KEY (id);


--
-- Name: crm_field_proposals crm_field_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_field_proposals
    ADD CONSTRAINT crm_field_proposals_pkey PRIMARY KEY (id);


--
-- Name: thoughts thoughts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thoughts
    ADD CONSTRAINT thoughts_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (id);


--
-- Name: wiki_section_revisions wiki_section_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_section_revisions
    ADD CONSTRAINT wiki_section_revisions_pkey PRIMARY KEY (id);


--
-- Name: wiki_sections wiki_sections_page_id_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_page_id_section_key_key UNIQUE (page_id, section_key);


--
-- Name: wiki_sections wiki_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_pkey PRIMARY KEY (id);


--
-- Name: idx_agent_memories_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memories_content_hash ON public.agent_memories USING btree (workspace_id, content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_agent_memories_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_agent_memories_idempotency_key ON public.agent_memories USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_agent_memories_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memories_review ON public.agent_memories USING btree (review_status, lifecycle_status, created_at DESC);


--
-- Name: idx_agent_memories_runtime_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memories_runtime_task ON public.agent_memories USING btree (runtime_name, task_id, flow_id);


--
-- Name: idx_agent_memories_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memories_scope ON public.agent_memories USING btree (workspace_id, project_id, visibility);


--
-- Name: idx_agent_memory_artifacts_memory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_artifacts_memory ON public.agent_memory_artifacts USING btree (memory_id);


--
-- Name: idx_agent_memory_audit_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_audit_scope ON public.agent_memory_audit_events USING btree (workspace_id, project_id, created_at DESC);


--
-- Name: idx_agent_memory_recall_items_trace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_recall_items_trace ON public.agent_memory_recall_items USING btree (trace_id, rank);


--
-- Name: idx_agent_memory_recall_traces_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_recall_traces_scope ON public.agent_memory_recall_traces USING btree (workspace_id, project_id, created_at DESC);


--
-- Name: idx_agent_memory_review_actions_memory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_review_actions_memory ON public.agent_memory_review_actions USING btree (memory_id, created_at DESC);


--
-- Name: idx_agent_memory_source_refs_memory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_source_refs_memory ON public.agent_memory_source_refs USING btree (memory_id);


--
-- Name: idx_crm_contact_aliases_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contact_aliases_contact ON public.crm_contact_aliases USING btree (contact_id);


--
-- Name: idx_crm_contact_aliases_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_crm_contact_aliases_dedupe ON public.crm_contact_aliases USING btree (contact_id, lower(alias)) WHERE (status = 'current'::text);


--
-- Name: idx_crm_contact_change_log_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contact_change_log_contact ON public.crm_contact_change_log USING btree (contact_id, created_at DESC);


--
-- Name: idx_crm_contact_methods_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contact_methods_contact ON public.crm_contact_methods USING btree (contact_id, deleted_at);


--
-- Name: idx_crm_contact_methods_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_crm_contact_methods_dedupe ON public.crm_contact_methods USING btree (contact_id, method_type, lower(value)) WHERE ((deleted_at IS NULL) AND (status = 'current'::text));


--
-- Name: idx_crm_contact_methods_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contact_methods_run ON public.crm_contact_methods USING btree (source_run_id) WHERE (source_run_id IS NOT NULL);


--
-- Name: idx_crm_contacts_display_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contacts_display_name ON public.crm_contacts USING btree (display_name);


--
-- Name: idx_crm_contacts_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contacts_lifecycle ON public.crm_contacts USING btree (lifecycle_status);


--
-- Name: idx_crm_contacts_privacy_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contacts_privacy_tier ON public.crm_contacts USING btree (privacy_tier);


--
-- Name: idx_crm_field_evidence_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_crm_field_evidence_dedupe ON public.crm_field_evidence USING btree (contact_id, target_kind, COALESCE(target_id, '00000000-0000-0000-0000-000000000000'::uuid), field_key, thought_id, role);


--
-- Name: idx_crm_field_evidence_thought; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_field_evidence_thought ON public.crm_field_evidence USING btree (thought_id);


--
-- Name: idx_crm_field_proposals_contact_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_field_proposals_contact_status ON public.crm_field_proposals USING btree (contact_id, status);


--
-- Name: idx_crm_field_proposals_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_crm_field_proposals_key ON public.crm_field_proposals USING btree (proposal_key);


--
-- Name: idx_crm_field_proposals_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_field_proposals_run ON public.crm_field_proposals USING btree (((origin_ref ->> 'run_id'::text))) WHERE (origin_ref ? 'run_id'::text);


--
-- Name: idx_thoughts_content_tsvector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thoughts_content_tsvector ON public.thoughts USING gin (to_tsvector('simple'::regconfig, COALESCE(content, ''::text)));


--
-- Name: idx_thoughts_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_thoughts_fingerprint ON public.thoughts USING btree (content_fingerprint) WHERE (content_fingerprint IS NOT NULL);


--
-- Name: idx_thoughts_importance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thoughts_importance ON public.thoughts USING btree (importance DESC);


--
-- Name: idx_thoughts_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thoughts_source_type ON public.thoughts USING btree (source_type);


--
-- Name: idx_thoughts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thoughts_status ON public.thoughts USING btree (status) WHERE (status IS NOT NULL);


--
-- Name: idx_thoughts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thoughts_type ON public.thoughts USING btree (type);


--
-- Name: idx_wiki_pages_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wiki_pages_kind ON public.wiki_pages USING btree (page_kind, status);


--
-- Name: idx_wiki_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wiki_pages_slug ON public.wiki_pages USING btree (slug);


--
-- Name: idx_wiki_section_revisions_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wiki_section_revisions_section ON public.wiki_section_revisions USING btree (section_id, created_at DESC);


--
-- Name: idx_wiki_sections_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wiki_sections_page ON public.wiki_sections USING btree (page_id, display_order);


--
-- Name: thoughts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thoughts_created_at_idx ON public.thoughts USING btree (created_at DESC);


--
-- Name: thoughts_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thoughts_embedding_idx ON public.thoughts USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: thoughts_metadata_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thoughts_metadata_idx ON public.thoughts USING gin (metadata);


--
-- Name: thoughts thoughts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER thoughts_updated_at BEFORE UPDATE ON public.thoughts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: agent_memories trg_agent_memories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_agent_memories_updated_at BEFORE UPDATE ON public.agent_memories FOR EACH ROW EXECUTE FUNCTION public.agent_memories_set_updated_at();


--
-- Name: agent_memories agent_memories_thought_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT agent_memories_thought_id_fkey FOREIGN KEY (thought_id) REFERENCES public.thoughts(id) ON DELETE SET NULL;


--
-- Name: agent_memory_artifacts agent_memory_artifacts_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_artifacts
    ADD CONSTRAINT agent_memory_artifacts_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.agent_memories(id) ON DELETE CASCADE;


--
-- Name: agent_memory_audit_events agent_memory_audit_events_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_audit_events
    ADD CONSTRAINT agent_memory_audit_events_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.agent_memories(id) ON DELETE SET NULL;


--
-- Name: agent_memory_audit_events agent_memory_audit_events_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_audit_events
    ADD CONSTRAINT agent_memory_audit_events_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.agent_memory_recall_traces(id) ON DELETE SET NULL;


--
-- Name: agent_memory_recall_items agent_memory_recall_items_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_recall_items
    ADD CONSTRAINT agent_memory_recall_items_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.agent_memories(id) ON DELETE CASCADE;


--
-- Name: agent_memory_recall_items agent_memory_recall_items_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_recall_items
    ADD CONSTRAINT agent_memory_recall_items_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.agent_memory_recall_traces(id) ON DELETE CASCADE;


--
-- Name: agent_memory_relations agent_memory_relations_from_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_relations
    ADD CONSTRAINT agent_memory_relations_from_memory_id_fkey FOREIGN KEY (from_memory_id) REFERENCES public.agent_memories(id) ON DELETE CASCADE;


--
-- Name: agent_memory_relations agent_memory_relations_to_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_relations
    ADD CONSTRAINT agent_memory_relations_to_memory_id_fkey FOREIGN KEY (to_memory_id) REFERENCES public.agent_memories(id) ON DELETE CASCADE;


--
-- Name: agent_memory_review_actions agent_memory_review_actions_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_review_actions
    ADD CONSTRAINT agent_memory_review_actions_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.agent_memories(id) ON DELETE CASCADE;


--
-- Name: agent_memory_source_refs agent_memory_source_refs_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_source_refs
    ADD CONSTRAINT agent_memory_source_refs_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.agent_memories(id) ON DELETE CASCADE;


--
-- Name: crm_contact_aliases crm_contact_aliases_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_aliases
    ADD CONSTRAINT crm_contact_aliases_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_contact_aliases crm_contact_aliases_superseded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_aliases
    ADD CONSTRAINT crm_contact_aliases_superseded_by_fkey FOREIGN KEY (superseded_by) REFERENCES public.crm_contact_aliases(id) ON DELETE SET NULL;


--
-- Name: crm_contact_change_log crm_contact_change_log_alias_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_change_log
    ADD CONSTRAINT crm_contact_change_log_alias_id_fkey FOREIGN KEY (alias_id) REFERENCES public.crm_contact_aliases(id) ON DELETE SET NULL;


--
-- Name: crm_contact_change_log crm_contact_change_log_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_change_log
    ADD CONSTRAINT crm_contact_change_log_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL;


--
-- Name: crm_contact_change_log crm_contact_change_log_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_change_log
    ADD CONSTRAINT crm_contact_change_log_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.crm_contact_methods(id) ON DELETE SET NULL;


--
-- Name: crm_contact_methods crm_contact_methods_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_methods
    ADD CONSTRAINT crm_contact_methods_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_contact_methods crm_contact_methods_superseded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contact_methods
    ADD CONSTRAINT crm_contact_methods_superseded_by_fkey FOREIGN KEY (superseded_by) REFERENCES public.crm_contact_methods(id) ON DELETE SET NULL;


--
-- Name: crm_contacts crm_contacts_card_thought_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contacts
    ADD CONSTRAINT crm_contacts_card_thought_id_fkey FOREIGN KEY (card_thought_id) REFERENCES public.thoughts(id) ON DELETE SET NULL;


--
-- Name: crm_field_evidence crm_field_evidence_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_field_evidence
    ADD CONSTRAINT crm_field_evidence_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_field_evidence crm_field_evidence_thought_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_field_evidence
    ADD CONSTRAINT crm_field_evidence_thought_id_fkey FOREIGN KEY (thought_id) REFERENCES public.thoughts(id) ON DELETE CASCADE;


--
-- Name: crm_field_proposals crm_field_proposals_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_field_proposals
    ADD CONSTRAINT crm_field_proposals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE;


--
-- Name: wiki_section_revisions wiki_section_revisions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_section_revisions
    ADD CONSTRAINT wiki_section_revisions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.wiki_sections(id) ON DELETE CASCADE;


--
-- Name: wiki_sections wiki_sections_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id) ON DELETE CASCADE;


--
-- Name: thoughts Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.thoughts USING ((auth.role() = 'service_role'::text));


--
-- Name: agent_memories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memories agent_memories_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memories_service_role_all ON public.agent_memories TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_artifacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_artifacts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_artifacts agent_memory_artifacts_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_artifacts_service_role_all ON public.agent_memory_artifacts TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_audit_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_audit_events agent_memory_audit_events_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_audit_events_service_role_all ON public.agent_memory_audit_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_recall_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_recall_items ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_recall_items agent_memory_recall_items_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_recall_items_service_role_all ON public.agent_memory_recall_items TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_recall_traces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_recall_traces ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_recall_traces agent_memory_recall_traces_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_recall_traces_service_role_all ON public.agent_memory_recall_traces TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_relations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_relations ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_relations agent_memory_relations_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_relations_service_role_all ON public.agent_memory_relations TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_review_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_review_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_review_actions agent_memory_review_actions_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_review_actions_service_role_all ON public.agent_memory_review_actions TO service_role USING (true) WITH CHECK (true);


--
-- Name: agent_memory_source_refs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_source_refs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_source_refs agent_memory_source_refs_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_source_refs_service_role_all ON public.agent_memory_source_refs TO service_role USING (true) WITH CHECK (true);


--
-- Name: crm_contact_aliases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_contact_aliases ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_contact_change_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_contact_change_log ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_contact_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_contact_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_field_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_field_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_field_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_field_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: thoughts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

--
-- Name: wiki_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: wiki_section_revisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_section_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: wiki_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_sections ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict d6RgYDr1aabpXFS3VjyBNgcQJGbAYrywWmFPyHRvdpNGiCxvtfYedq4NvJWe8SQ

