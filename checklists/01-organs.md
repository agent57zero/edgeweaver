# Checklist 01 — Organs (Phase 1)

Prereqs: ledger −1 done (0a helpful, not required). Read first: IMPLEMENTATION.md §5;
`OB1/schemas/agent-memory/README.md`; skim `OB1/skills/openclaw-agent-memory/` and
`OB1/recipes/auto-capture/` (reference patterns). Templates: `templates/wake-edgeweaver-SKILL.md`.

- [x] Schema applied ✓ 2026-07-04 — via a new guarded `sql-migrate` edge function (uses the
      platform-provided SUPABASE_DB_URL in-infra; the DB password never touched this machine;
      source: scripts/edge-functions/sql-migrate.ts — also serves the queued thought_edges
      migration). All four tables verified HTTP 200; four trust columns present.
- [x] Trust defaults verified structurally (columns present; behavior proven in the
      acceptance test below). ✓
- [x] agent-memory-api deployed ✓ 2026-07-04 (edge function; shares MCP_ACCESS_KEY guard,
      x-brain-key header). `GET /health` → `{"ok":true,"service":"agent-memory-api"}`. ✓
- [x] Wake skill created ✓ 2026-07-04 (`~/.claude/skills/wake-edgeweaver/SKILL.md`) —
      proto-being framing (honest pre-birth stance), identity from gpt-instructions + Q1
      voice tells + Q2 refusals, they/them.
      verify remaining: `/wake-edgeweaver` in a fresh session answers in persona (part of
      acceptance).
- [x] Recall wired ✓ — via the **`recall-scoped` edge function**, THE enforcement point
      (embeds server-side, semantic match, then provenance-class allowlists + audience
      algebra before anything reaches the skill; source: scripts/edge-functions/
      recall-scoped.ts). **Enforcement test PASSED 2026-07-04**: same gremlin query —
      episodic consumer: 60 considered, 0 returned (library correctly invisible to lived
      memory); study consumer: GREMLIN FOOD 73%, SPARK099.04/.00/.05 — the right teachings,
      ranked. Also registered `open-brain` MCP in Claude Code (✔ Connected, x-brain-key).
      (Similarity ranking is match_thoughts-native; the recency/importance re-rank from the
      template becomes a wrapper enhancement when episodes accumulate — noted, not blocking.)
      verify remaining (needs 0a data): pre-birth detail surfaces with provenance class.
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
