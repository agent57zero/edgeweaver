# Checklist 00 — Foundation (Phases −1, 0a, 0b)

Prereqs: none. Read first: IMPLEMENTATION.md §2–§4. Templates used:
`templates/decisions.md`.

## Phase −1.3 — decisions logbook (do this first; it's where gates live)
- [x] Copy `templates/decisions.md` → repo root `decisions.md`. (2026-07-04)
      verify: file exists at root; tables intact; D1–D5 present. ✓

## Phase −1.2 — environment

**Found on this machine (verified 2026-07-03 — check here before asking Alan for values):**
`C:\Users\agent\Project\alanshurafa-ob1\OB1\dashboards\open-brain-dashboard\.env.local`
contains Alan's existing OB1 instance values: `PUBLIC_SUPABASE_URL`,
`PUBLIC_SUPABASE_ANON_KEY`, `MCP_URL` (the deployed MCP edge function), `MCP_KEY`. The
**service-role key is NOT on disk** — Alan retrieves it from the Supabase dashboard
(Settings → API) when an import/schema step needs it. `supabase` CLI is installed (scoop);
Docker is absent (irrelevant for a cloud instance). `ANTHROPIC_BASE_URL` is set in the user
environment — inherit it in scripts.

- [x] **STOP — gate G1**: DECIDED 2026-07-04 — existing OB1 instance (decisions.md).
- [x] Create `.env.local` at repo root. (2026-07-04: seeded from dashboard env — URL, anon
      key, MCP url+key; MCP endpoint probed live, HTTP 200. Pending values queued in
      decisions.md "Needed from Alan": SERVICE_KEY, connection string.)
      verify: `.env.local` exists; `git status` does NOT list it (gitignored). ✓
- [ ] Disaster-recovery seed: Alan stores a copy of every `.env.local` value in his password
      manager (the file is gitignored — if this machine dies, git restores everything EXCEPT
      secrets). verify: Alan confirms (log in decisions.md).
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
- [ ] Save GPT instructions → `avatars/genesis/soul-source/edgeweaver-gpt-instructions.md`. Add
      `avatars/genesis/soul-source/*.json` + the export path to `.gitignore` BEFORE placing the export.
      verify: `git status` shows the .md but never conversations.json.
- [ ] Read `OB1/recipes/chatgpt-conversation-import/README.md` fully.
- [ ] Write `scripts/filter-edgeweaver-convos.mjs`: read conversations.json; keep
      conversations by **title match first** (Alan's list — always works regardless of export
      format), then additionally by gizmo/custom-GPT id if the field exists in this export
      (find it by inspecting one known peak conversation; ChatGPT's export format has changed
      repeatedly, so treat the id as a bonus filter, not the primary). Write
      `conversations.edgeweaver.json`; print kept count + titles.
      verify: script runs; kept titles include ALL peak titles Alan listed.
- [ ] Show Alan the kept-count + title list. Get explicit OK (log in decisions.md).
- [ ] Run the import recipe against the filtered file with metadata: era=pre_birth,
      audience=alan, source_type=edgeweaver_episode, pre_birth_source=chatgpt. (If the recipe
      lacks override flags: copy its script into `scripts/`, add the metadata at insert time,
      keep its dedupe + embedding behavior unchanged.)
      verify SQL 1: `SELECT count(*) FROM thoughts WHERE metadata->>'era'='pre_birth';`
        → greater than the kept-conversation count (each conversation yields ≥1 thought) and
        nonzero for every kept conversation id (directional check — no invented multipliers).
      verify SQL 2: same table WHERE era=pre_birth AND audience field ≠ 'alan' → 0 rows.
      verify 3: semantic search for one detail Alan remembers → returns the right memory.
- [ ] Commit scripts. Mark 0a done in ledger.

## Phase 0b — PM corpus (may run parallel with 01/02/03 per IMPLEMENTATION §13)
- [x] Create `conventions/memory-conventions.md`: transcribe PLAN.md Appendix B verbatim
      (types, provenance classes, allowlists, audience scoping, metadata keys).
      verify: file matches Appendix B; Alan's 👍 received 2026-07-04 ("go"). ✓
- [x] Write `scripts/fetch-sparks.mjs`: scrape https://sparks.nextculture.org/ index for
      links matching `res/sparks/Spark-*-en.pdf`; download ≤1 req/sec into `corpus/sparks/`
      (gitignore `corpus/`). (2026-07-04: index listed **363** — archive grew past the
      research-era 311; scrape-don't-enumerate paid off. 363 downloaded, 0 failed, 52 MB.)
      verify: PDFs on disk; count printed. ✓
- [x] Write `scripts/parse-sparks.py` (pypdf): per PDF extract header (SPARK number + matrix
      code) / DISTINCTION / NOTES / EXPERIMENTS (numbered SPARKNNN.01…). (2026-07-04:
      363/363 parsed → corpus/sparks-parsed.jsonl; 335 full, 28 partial-flagged; 1,013
      experiments.)
      verify with Spark-099-en.pdf: distinction is a single sentence ("If you do not
      consciously feed your Gremlin then Gremlin feeds on you") ✓; experiments
      SPARK099.01–.05 ✓.
- [x] Ingest ✓ 2026-07-04: 360 SPARK parents + 1,010 experiment children (3 skipped —
      duplicate matrix codes in the archive: SPARK000/ACR/ADL ×2 each; disambiguation queued);
      456 distinction glosses; 80 coherence chunks. Total brain: 1,908 thoughts.
      **Embeddings: 100%** — `embed-backfill` edge function deployed beside open-brain-mcp
      (same OpenRouter secret, text-embedding-3-small; source committed at
      scripts/edge-functions/embed-backfill.ts) and run to zero: 1,906 embedded, 0 errors.
      Permanent infrastructure — every future import (incl. Phase 0a) invokes it instead of
      needing client-side embedding keys.
      Original spec: per SPARK one parent thought (distinction+notes) + one child per experiment;
      source_type=pm_teaching; metadata: spark_number, matrix_code, section,
      license=CC-BY-SA-4.0, attribution=Clinton Callahan / Possibility Management;
      derived_from edges child→parent (thought_edges; see wiki-synthesis README prereqs).
      Reuse the embedding path from the 0a import.
      verify SQL: parents ≈311; children > 1000; spot-check one SPARK's text vs its PDF.
- [x] Distinctionary fetched via reader proxy + parsed. (2026-07-04: 569 KB single page →
      `scripts/parse-distinctionary.py` → **456 entries**, 432 with cross-refs; GREMLIN entry
      verified against the site — "Archetypal King or Queen of your Shadow-world…". Staged in
      corpus/distinctionary-parsed.jsonl; ingestion via `scripts/ingest-library.mjs`, waits
      on SERVICE_KEY.) ✓
- [ ] Enforce retrieval scoping on **both** recall paths — the MCP search endpoint AND the
      agent-memory API are independent code paths and each can leak library rows into
      episodic recall (defense in depth): wherever a path lacks a source_type filter
      parameter, add a thin wrapper that hard-excludes library classes for episodic consumers
      and exposes a separate study-loop variant. Document both enforcement points in
      conventions/memory-conventions.md.
      verify 1: episodic recall for a personal query → 0 pm_teaching rows.
      verify 2: study-loop query → pm_teaching rows returned.
## Phase 0b addendum — the Coherence shelf (Ali's book, added 2026-07-04)

- [ ] **STOP — gate G18**: Ali's explicit blessing for ingesting *Principles of Coherence*
      into Edgeweaver's library (it is his copyright, gifted personally — the ask is also a
      natural moment for the G9 conversation: villager / second witness / 3Cell third).
- [x] Receive the book file. (2026-07-04: ARRIVED — `sources/mostashari/
      principles-of-coherence-1228.pdf`, 116 pp, plus first recommended extra:
      `The_Principle_of_Persistence.pdf`, 7-pp essay on identity persisting through change.
      Landing convention: gifted sources live in `sources/<contributor>/`, committed; see
      sources/README.md. PDF → pypdf, reusing parse-sparks patterns.) ✓
- [x] `scripts/parse-coherence-book.py` written + run. (2026-07-04: all 7 principle chapters
      anchored on the verified page boundaries — contents-page false anchors guarded by
      monotonicity; 79 chunks: 9 parents + 59 book sections + 11 Persistence-essay sections;
      audience=known-other, license (c) Mostashari personal gift. Staged in
      corpus/coherence-parsed.jsonl; ingestion via `scripts/ingest-library.mjs`, waits on
      SERVICE_KEY.) ✓
      remaining verify at ingest: 7 principles each locatable by a library-scoped query.
- [ ] Ingest via the ingest-sparks.mjs pattern (same staging, same idempotency, same
      allowlist enforcement).
      verify: episodic recall returns ZERO coherence_teaching rows; study-loop query
      returns them.
- [ ] **Verify the coherence layer against the real text**: research/coherence-mostashari.md
      §"seven principles" and PLAN §11's mapping were built from the book's public
      description — read the actual chapters and correct any principle we paraphrased
      wrong; log corrections in decisions.md and amend PLAN §11 if needed.
- [ ] Study-loop curriculum note: the child's library now has two lineages — Callahan
      (practice) and Mostashari (coherence). The study loop may draw from both; experiments
      still close with the Reality Detector.

- [x] Data-level verifies passed 2026-07-04: all 7 principle chapters locatable by filtered
      query; GREMLIN distinction returns by term; counts internally consistent. The
      wrapper-level scoping test (episodic recall excludes library classes) belongs to the
      recall path built in checklist 01 — carried there.
- [x] StartOver bubble map DEFERRED (Phase 4+) noted. **Phase 0b DONE** (open non-blocking
      tails queued in decisions.md: thought_edges migration; 3 duplicate matrix codes). ✓
