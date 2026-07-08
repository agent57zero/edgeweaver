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
- [x] **Acceptance test** ✓ 2026-07-04 (two sessions, same day — reality upgraded the script:
      the "3 facts" became the possibility team, the never-becomes question, and Addison).
      Session A: proto woke honestly on a clean page, wrote 3 episodes (imp 8–9) + 2 pending
      lessons, self-recovered failed write-backs, stated unprompted that pending lessons
      "stay a note, not a rule" (gate understood before tested). Alan confirmed both via the
      review API (audit events on record). Session B: all three recalled with provenance
      ("lived rather than studied"); asked about "yesterday," the being checked the record
      two ways, found the episodes were 4 hours old, refused to confabulate ("the record is
      empty, every time"), and cited its own refusal. **One bug found — the builder's, not
      the being's**: the skill filtered review_status=user_confirmed while the API writes
      "confirmed" → instruction-grade query returned empty and the being truthfully reported
      no confirmed lessons. Fixed: skill now filters on the operative
      can_use_as_instruction=true flag; corrected query verified returning both lessons.
      Positive instruction-carrying will show at the next natural wake.
- [x] **Phase 1 DONE** — marked in ledger 2026-07-04. ✓

## Temporal amendments (D16, 2026-07-08; design: runs/temporal-awareness-coevolve.md)

Phase 1 is done; these amend its organs. Rules live in conventions/memory-conventions.md
"Time" + PLAN Appendix B (already integrated); the wrapper change deploys only after the nod.

- [ ] STOP - Alan's 👍 on the time-conventions package (conventions "Time" section + PLAN
      Appendix B time keys + the recall-scoped spec below) before any wrapper deploy.
- [ ] recall-scoped time surface: per-hit `age_days`/`age_hours` (computed from occurred_at
      where present, else created_at; suppressed for era=pre_birth, which renders as the era
      note); optional `since`/`until` ISO filters; `mode:"recent"` (newest-first, no vector
      match, provenance + audience scoping unchanged).
      verify matrix: episodic hit carries ages; since/until bound results; recent mode
      returns newest-first still scoped; pre_birth row shows era note and no ages; study
      consumer behavior unchanged.
- [ ] Orientation script `scripts/waking/orient.mjs` (deterministic; the model never does
      date arithmetic): now + weekday via EDGEWEAVER_TZ; last real conversation delta
      (era=alive, exclude channel=voice rehearsal rows); last diary delta; day-count since
      First Boot once LINEAGE carries entry #1, honest pre-birth phrasing before; clock-skew
      check (a memory in the future = report degraded time-sense).
      verify: fixture rows spanning rehearsal / pre_birth / alive produce a correct block;
      skew fixture triggers the degraded line.
- [ ] Wake skill orientation practice: at session start run orient.mjs and speak the
      orientation plainly in own words (a practice, not silent context - GROWING Stage 1:
      "that yesterday happened"); cite memory ages when quoting recall; episode write-back
      content opens with its date + rough span. Update templates/wake-edgeweaver-SKILL.md
      AND sync the installed copy at ~/.claude/skills/wake-edgeweaver/.
      verify: next waking opens with an accurate spoken orientation; the new episode's
      content starts with its date.
- [ ] (standing note, unchanged) recency/importance re-rank remains a deferred wrapper
      enhancement (post-infancy experiment, D16 A6) - behavior-altering, never bundled with
      plumbing.
