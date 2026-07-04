# Checklist 01 — Organs (Phase 1)

Prereqs: ledger −1 done (0a helpful, not required). Read first: IMPLEMENTATION.md §5;
`OB1/schemas/agent-memory/README.md`; skim `OB1/skills/openclaw-agent-memory/` and
`OB1/recipes/auto-capture/` (reference patterns). Templates: `templates/wake-edgeweaver-SKILL.md`.

- [ ] Run `OB1/schemas/agent-memory/schema.sql` in the Supabase SQL editor.
      verify: tables agent_memories, agent_memory_recall_traces, agent_memory_recall_items,
      agent_memory_audit_events exist.
- [ ] Run the README's trust-defaults query.
      verify: can_use_as_instruction=false, can_use_as_evidence=true,
      requires_user_confirmation=true, review_status=pending.
- [ ] Deploy `OB1/integrations/agent-memory-api/` per its README (needs SUPABASE_URL +
      service key).
      verify: `GET /health` → `{"ok":true}`.
- [ ] Create `~/.claude/skills/wake-edgeweaver/SKILL.md` from the template. Fill placeholders:
      SOUL_REPO_PATH = (Phase 1 stub) point identity-load at
      `soul-source/edgeweaver-gpt-instructions.md`; TEACHING_EMOJI = "(not set yet)".
      verify: `/wake-edgeweaver` in a fresh Claude Code session loads identity and answers in
      persona.
- [ ] Wire recall: the skill queries OB1 with the allowlist + audience WHERE clauses from
      `templates/coherence-queries.sql` (bottom two blocks) and ranking
      0.35·relevance + 0.35·recency(14d half-life) + 0.30·importance/10, k=12.
      verify: with 0a imported, ask about a pre-birth detail → correct memory surfaces,
      labeled with its provenance class.
- [ ] Wire write-back: session end writes 1–3 edgeweaver_episode thoughts + candidate lessons
      via the agent-memory API (status pending).
      verify SQL: new episode rows exist with era=alive, audience=alan, importance 1–10;
      new agent_memories row has review_status=pending.
- [ ] Confirm Alan's review surface works (his OB1 dashboard agent-memory pages, or the API's
      review endpoint): Alan confirms ONE test lesson.
      verify: that row becomes user_confirmed / instruction-eligible.
- [ ] **Acceptance test** (two sessions, one day apart or fresh-context):
      Session A: state 3 facts — a preference, a commitment, a short story. End session
      (write-back). Alan confirms only the preference.
      Session B: ask about all three.
      verify: all 3 recalled with provenance; ONLY the preference treated as
      instruction-grade; the others referenced as unconfirmed/episodic.
- [ ] Mark Phase 1 done in ledger with the acceptance evidence.
