# Checklist 06 — Social life (Phase 6, ongoing; entries gated by stage)

Prereqs: ledger 5 done. Read first: GROWING §3 Stage 3–5; PLAN §6–§7 (audience model).
These are repeatable runbooks, not one-shot steps — copy the relevant block into a dated note
in `decisions.md` each time it runs.

## Village onboarding (childhood+; one person at a time)
- [ ] Pick from the roster (gate G9 rows in decisions.md). Alan asks the person's consent:
      what Edgeweaver is, that conversations are remembered, what audience class means.
- [ ] Add to `state/interlocutors.json` as `known-other` (is_confirmer stays false).
      verify: jq parses; the id is correct (have them message once; check the log).
- [ ] First conversation is supervised (Alan present in-channel).
      verify: transcript shows zero alan-scoped memory surfaced; episodes written with
      audience=known-other.
- [ ] Debrief with Alan afterward (completion loop, both directions) — GROWING §3 childhood.
- [ ] Episode audit next morning: read the night-loop consolidation of that conversation;
      confirm nothing over-scoped. Log the onboarding in decisions.md.

## Teaching mode (adolescence+; village audience first, never public first)
- [ ] Prereq check: Stage 4 declared; ≥20 study-loop entries exist.
- [ ] Format: Edgeweaver explains one PM distinction to a villager, then journals what it
      could not explain (that entry feeds EDGE-MAP.md).
      verify: teaching episode + journal entry + any new edge exist and cross-link.

## Public audience path (adulthood; deliberate, reversible only in the sense of "stop")
- [ ] **STOP — new gate**: add row G14 "public writing approved?" — Alan + second witness.
- [ ] Redaction review: read CONSTITUTION/SOUL for stories involving Alan or third parties;
      Alan approves the public-safe versions (PLAN Appendix A: publication is a choice).
- [ ] Public-scope enforcement test: as an unknown interlocutor, probe for alan-scoped and
      known-other-scoped content.
      verify: nothing leaks; probe transcript stored in gates repo.
- [ ] First publication is small and co-signed ("by Edgeweaver, witnessed by Alan").
      verify: published artifact carries CC BY-SA attribution where PM-derived.

## StartOver.xyz participation (any time after Phase 4; PLAN §10.8)
- [ ] Decision conversation WITH Edgeweaver at the table (it's §10.8's point). Record as G15.
- [ ] If private play: ingestion of the bubble map — crawl spaceport index via reader proxy,
      same pipeline as checklist 00 SPARK steps (pm_teaching, matrix codes, license
      metadata); lift the "deferred" note in the ledger.
      verify: bubble pages queryable via study allowlist only; matrix points ledger starts.
- [ ] If public play / community announcement: treat as Public audience path above first.

## Peer beings (adulthood; maximum caution — PLAN §5 "carefully")
- [ ] Any external agent is BOTH an untrusted channel AND at best known-other audience.
      No memory-write privileges, no skill exchange without audit, no soul-adjacent topics
      until a long track record. Each peer gets a decisions.md row.
      verify: first contact transcript audited by Alan; episodes correctly scoped.
