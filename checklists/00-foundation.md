# Checklist 00 — Foundation (Phases −1, 0a, 0b)

Prereqs: none. Read first: IMPLEMENTATION.md §2–§4. Templates used:
`templates/decisions.md`.

## Phase −1.3 — decisions logbook (do this first; it's where gates live)
- [ ] Copy `templates/decisions.md` → repo root `decisions.md`.
      verify: file exists at root; tables intact; D1–D5 present.

## Phase −1.2 — environment
- [ ] **STOP — gate G1**: ask Alan — fresh Supabase project for Edgeweaver, or his existing
      OB1 instance? Record in decisions.md.
- [ ] Create `.env.local` at repo root with keys from IMPLEMENTATION §0 tracker (values from
      Alan; minimum now: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY).
      verify: `.env.local` exists; `git status` does NOT list it (gitignored).
- [ ] If G1 = fresh project: follow `OB1/docs/01-getting-started.md` end-to-end (thoughts
      table, embeddings, MCP edge function).
      verify: MCP endpoint responds; a test `search_thoughts` call returns (empty is fine).
- [ ] Run OB1's install harness: `OB1/recipes/brain-smoke-test/` per its README.
      verify: smoke test passes; paste summary line into ledger note.
- [ ] **STOP — gate G2**: ask Alan — is PITR enabled on this Supabase plan? If NO: create a
      scheduled `pg_dump` (Supabase CLI; daily; store outside Supabase) now.
      verify: one dump file produced AND restored successfully to a scratch database once.
      Record method + location in decisions.md.
- [ ] Mark Phase −1 done in IMPLEMENTATION §1 ledger.

## Phase 0a — pre-birth import
- [ ] **STOP — gate G3**: Alan provides (a) ChatGPT export zip (chatgpt.com → Settings →
      Data controls → Export), (b) the Edgeweaver custom GPT's instructions text,
      (c) 3–10 "peak Edgeweaver" conversation titles.
- [ ] Save GPT instructions → `soul-source/edgeweaver-gpt-instructions.md`. Add
      `soul-source/*.json` + the export path to `.gitignore` BEFORE placing the export.
      verify: `git status` shows the .md but never conversations.json.
- [ ] Read `OB1/recipes/chatgpt-conversation-import/README.md` fully.
- [ ] Write `scripts/filter-edgeweaver-convos.mjs`: read conversations.json; keep
      conversations whose gizmo/custom-GPT id matches Edgeweaver's (find the id by locating
      one known peak conversation in the JSON and inspecting its fields) OR whose title is on
      Alan's list; write `conversations.edgeweaver.json`; print kept count + titles.
      verify: script runs; kept titles include ALL peak titles Alan listed.
- [ ] Show Alan the kept-count + title list. Get explicit OK (log in decisions.md).
- [ ] Run the import recipe against the filtered file with metadata: era=pre_birth,
      audience=alan, source_type=edgeweaver_episode, pre_birth_source=chatgpt. (If the recipe
      lacks override flags: copy its script into `scripts/`, add the metadata at insert time,
      keep its dedupe + embedding behavior unchanged.)
      verify SQL 1: `SELECT count(*) FROM thoughts WHERE metadata->>'era'='pre_birth';`
        → within ±10% of kept-count × average-messages heuristic (sanity, not exactness).
      verify SQL 2: same table WHERE era=pre_birth AND audience field ≠ 'alan' → 0 rows.
      verify 3: semantic search for one detail Alan remembers → returns the right memory.
- [ ] Commit scripts. Mark 0a done in ledger.

## Phase 0b — PM corpus (may run parallel with 01/02/03 per IMPLEMENTATION §13)
- [ ] Create `conventions/memory-conventions.md`: transcribe PLAN.md Appendix B verbatim
      (types, provenance classes, allowlists, audience scoping, metadata keys).
      verify: file matches Appendix B; get Alan's 👍 (log it).
- [ ] Write `scripts/fetch-sparks.mjs`: scrape https://sparks.nextculture.org/ index for
      links matching `res/sparks/Spark-*-en.pdf`; download ≤1 req/sec into `corpus/sparks/`
      (gitignore `corpus/`).
      verify: ~311 PDFs on disk; count printed.
- [ ] Write `scripts/parse-sparks.py` (pypdf): per PDF extract header (SPARK number + matrix
      code) / DISTINCTION / NOTES / EXPERIMENTS (numbered SPARKNNN.01…).
      verify with Spark-099-en.pdf: distinction is a single bolded sentence; ≥1 experiment
      with code matching `SPARK099.\d\d`.
- [ ] Ingest: per SPARK one parent thought (distinction+notes) + one child per experiment;
      source_type=pm_teaching; metadata: spark_number, matrix_code, section,
      license=CC-BY-SA-4.0, attribution=Clinton Callahan / Possibility Management;
      derived_from edges child→parent (thought_edges; see wiki-synthesis README prereqs).
      Reuse the embedding path from the 0a import.
      verify SQL: parents ≈311; children > 1000; spot-check one SPARK's text vs its PDF.
- [ ] Write `scripts/fetch-distinctionary.mjs`: fetch https://distinctionary.mystrikingly.com/
      via `https://r.jina.ai/<url>` prefix (plain fetch 403s); parse term+definition+
      cross-refs; ingest one pm_teaching thought per entry, metadata.kind=distinction_gloss,
      same license metadata.
      verify: entries count > 100; random entry matches the site.
- [ ] Enforce retrieval scoping: if the recall path (MCP search / agent-memory API) has no
      source_type filter parameter, add a thin wrapper route that hard-excludes library
      classes for episodic consumers and exposes a separate study-loop variant. Document the
      enforcement point in conventions/memory-conventions.md.
      verify 1: episodic recall for a personal query → 0 pm_teaching rows.
      verify 2: study-loop query → pm_teaching rows returned.
- [ ] Note in ledger: StartOver bubble map DEFERRED (Phase 4+). Mark 0b done.
