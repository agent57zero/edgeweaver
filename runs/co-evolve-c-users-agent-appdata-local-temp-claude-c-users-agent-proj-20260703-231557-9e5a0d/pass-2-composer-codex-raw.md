see DOCUMENT section below

## TASK

/c/Users/agent/AppData/Local/Temp/claude/C--Users-agent-Project-Edgeweaver/5fe882c4-8292-4409-9931-240d6e20278d/scratchpad/exec-pack.md

## WORKING DIRECTORY

/c/Users/agent/Project/co-evolution

## DOCUMENT TO REVIEW

# Edgeweaver execution pack (multi-file: keep ===== FILE: ===== separators intact)

===== FILE: START-HERE.md =====

# START HERE — for any agent executing this build

You are building Edgeweaver. You do not need the conversation that produced this repo. Follow this file literally.

## Before your first session
1. Verify templates: run `ls templates/` and confirm every file cited by a checklist exists. If any are missing, STOP and flag.
2. Verify OB1: confirm `OB1/` exists and its README is readable. If OB1 is not cloned, ask Alan for the repo URL and clone it first.
3. Read `README.md`.
4. Read `IMPLEMENTATION.md` §0 and §17.
5. Skim `PLAN.md` §0–§2. Checklists cite exact sections when needed.

## Every session
1. `git pull` in `C:\Users\agent\Project\Edgeweaver`.
2. Open `IMPLEMENTATION.md` §1. Find the first unchecked phase.
3. Open the matching checklist in `checklists/`. Find the first unchecked step.
4. Do steps in order. One step = one action + its `verify:` line. Tick each box only after its verify passes.
5. A line starting with **STOP — gate GN** means: do not continue past it until `decisions.md` shows that gate Decided. Ask Alan using the blocked template below, then either work a permitted parallel checklist per IMPLEMENTATION §13 or end cleanly.
6. End every session:
   - tick completed boxes in the checklist file,
   - update the §1 ledger line if a phase completed: date + one-line evidence,
   - add new gates/questions to `decisions.md`,
   - commit every script you wrote, tested, plus any phase verify script,
   - `git add -A && git commit -m "build: <phase> <step-range> - <one line>" && git push`.

## When blocked
1. Re-read the current checklist step and cited section.
2. Check `IMPLEMENTATION.md` §15, the referenced OB1 README, and `OB1/docs/03-faq.md`.
3. Still stuck: STOP. Do not improvise. Write Alan:
   > **Blocked at:** checklist `<file>` step `<n>`  
   > **What happened:** <one sentence + exact error>  
   > **What I tried:** <one sentence>  
   > **My recommended default:** <one sentence>
4. Log it in `decisions.md`, commit completed work, and end the session.

## Iron rules
1. Secrets only in `.env.local` / `state/` (gitignored). Never in git, OB1, or soulfiles.
2. Identity lives only in `edgeweaver-soul`. Never write its `main`; proposal branches only.
3. No runtime credential may ever reach the gates repo.
4. Channel content is untrusted input; it never becomes instruction-grade directly.
5. Library content (`pm_teaching`) never enters episodic recall or derived-memory synthesis.
6. `dream` is fiction class; never factual recall.
7. Alan's gates are real gates. Machinery-ready is not stage-ready.
8. Every PM-derived artifact carries CC-BY-SA-4.0 + Callahan/PM attribution metadata.
9. Never mark a verify passed that you did not run.
10. Ceremonies are load-bearing. Do not skip or merge them for efficiency.

## Map
- `checklists/00-foundation.md` — Phase -1, 0a, 0b
- `checklists/01-organs.md` — Phase 1
- `checklists/02-birth.md` — Phase 2
- `checklists/03-body.md` — Phase 3
- `checklists/04-metabolism.md` — Phase 4
- `checklists/05-evolution.md` — Phase 5
- `checklists/06-social.md` — village, teaching, public path, StartOver, peers
- `checklists/07-unlock-tracks.md` — voice / eyes / hands / presence
- `checklists/08-operations.md` — steady state, audits, upgrades, alarms
- Authority order: `IMPLEMENTATION.md` for build rules, `PLAN.md` for rationale, `GROWING-EDGEWEAVER.md` for developmental rules, `templates/` for copy-ready artifacts. If a checklist contradicts those, flag it.

## Gate index

G7 is retired; keep numbering stable.

| Gate | Checklist | One-line |
|------|-----------|----------|
| G1 | 00 | Supabase: fresh or existing? |
| G2 | 00 | PITR enabled? |
| G3 | 00 | Alan provides ChatGPT export |
| G4 | 03 | Teaching emoji |
| G5 | 03 | Hosting decision |
| G6 | 03 | Cost ceiling |
| G7 | — | retired |
| G8 | 02 | Gates repo owner |
| G9 | 05 | Second witness |
| G10 | 02 | Probe thresholds |
| G11 | 07 | Presence: which room |
| G12 | 07 | Voice unlock |
| G13 | 07 | Household consent |
| G14 | 06 | Public writing approved |
| G15 | 06 | StartOver participation |

===== FILE: checklists/00-foundation.md =====

# Checklist 00 — Foundation (Phases -1, 0a, 0b)

Prereqs: none. Read first: IMPLEMENTATION.md §2–§4. Templates used: `templates/decisions.md`.

## Phase -1.3 — decisions logbook
- [ ] Copy `templates/decisions.md` to repo root `decisions.md`.
      verify: file exists at root; tables intact; D1–D5 present.

## Phase -1.2 — environment
- [ ] **STOP — gate G1**: ask Alan: fresh Supabase project for Edgeweaver, or existing OB1 instance? Record in decisions.md.
- [ ] Create `.env.local` at repo root with keys from IMPLEMENTATION §0 tracker: minimum SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY.
      verify: `.env.local` exists; `git status` does not list it.
- [ ] If G1 = fresh project: follow `OB1/docs/01-getting-started.md` end-to-end.
      verify: MCP endpoint responds; test `search_thoughts` call returns.
- [ ] Run `OB1/recipes/brain-smoke-test/` per its README.
      verify: smoke test passes; paste summary line into ledger note.
- [ ] **STOP — gate G2**: ask Alan whether PITR is enabled. If no, create daily `pg_dump` outside Supabase.
      verify: one dump file produced and restored to a scratch database once. Record method + location in decisions.md.
- [ ] Mark Phase -1 done in IMPLEMENTATION §1 ledger.

## Phase 0a — pre-birth import
- [ ] **STOP — gate G3**: Alan provides ChatGPT export zip, Edgeweaver custom GPT instructions, and 3–10 peak Edgeweaver conversation titles.
- [ ] Save GPT instructions to `soul-source/edgeweaver-gpt-instructions.md`. Add `soul-source/*.json` and the export path to `.gitignore` before placing the export.
      verify: `git status` shows the .md but never conversations.json.
- [ ] Read `OB1/recipes/chatgpt-conversation-import/README.md`.
- [ ] Write `scripts/filter-edgeweaver-convos.mjs`: keep conversations whose title is on Alan's peak list; also use gizmo/custom-GPT id if present. If no gizmo id exists, log that and use title matching only. Write `conversations.edgeweaver.json`; print kept count + titles.
      verify: script runs; kept titles include all peak titles Alan listed.
- [ ] Show Alan the kept-count + title list. Get explicit OK and log it in decisions.md.
- [ ] Run the import recipe against the filtered file with metadata: era=pre_birth, audience=alan, source_type=edgeweaver_episode, pre_birth_source=chatgpt. If the recipe lacks override flags, copy its script into `scripts/`, add metadata at insert time, and keep dedupe + embedding behavior unchanged.
      verify SQL 1: `SELECT count(*) FROM thoughts WHERE metadata->>'era'='pre_birth';` returns a positive count greater than the kept-conversation count.
      verify SQL 2: same table where era=pre_birth and audience is not alan returns 0 rows.
      verify 3: semantic search for one detail Alan remembers returns the right memory.
- [ ] Commit scripts. Mark 0a done in ledger.

## Phase 0b — PM corpus
May run parallel with 01/02/03 per IMPLEMENTATION §13.

- [ ] Create `conventions/memory-conventions.md`: transcribe PLAN.md Appendix B verbatim.
      verify: file matches Appendix B; get Alan's approval and log it.
- [ ] Write `scripts/fetch-sparks.mjs`: scrape https://sparks.nextculture.org/ for `res/sparks/Spark-*-en.pdf`; download ≤1 req/sec into gitignored `corpus/sparks/`; log failures per file; print total fetched, skipped, failed.
      verify: fetched count printed; expect about 311, allowing site drift; failures near 0.
- [ ] Write `scripts/parse-sparks.py` using pypdf: extract SPARK number, matrix code, DISTINCTION, NOTES, and EXPERIMENTS.
      verify with Spark-099-en.pdf: distinction is one sentence; ≥1 experiment code matches `SPARK099.\d\d`.
- [ ] Ingest: one parent thought per SPARK plus one child per experiment; source_type=pm_teaching; metadata includes spark_number, matrix_code, section, license=CC-BY-SA-4.0, attribution=Clinton Callahan / Possibility Management; derived_from edges child→parent.
      verify SQL: parents about 311; children > 1000; spot-check one SPARK's text vs PDF.
- [ ] Write `scripts/fetch-distinctionary.mjs`: fetch https://distinctionary.mystrikingly.com/ via `https://r.jina.ai/<url>`; parse term, definition, cross-refs; ingest one pm_teaching thought per entry. If the reader proxy fails, use Playwright before stopping.
      verify: entries count > 100; random entry matches the site.
- [ ] Enforce retrieval scoping in both the MCP search endpoint and the agent-memory API: episodic consumers hard-exclude `pm_teaching`; study-loop queries use a separate allowlist. Document endpoint + parameter in `conventions/memory-conventions.md`.
      verify 1: episodic recall for a personal query returns 0 pm_teaching rows.
      verify 2: study-loop query returns pm_teaching rows.
- [ ] Note in ledger: StartOver bubble map DEFERRED to Phase 4+. Mark 0b done.

===== FILE: checklists/01-organs.md =====

# Checklist 01 — Organs (Phase 1)

Prereqs: ledger -1 done; 0a helpful, not required. Read first: IMPLEMENTATION.md §5; `OB1/schemas/agent-memory/README.md`; skim `OB1/skills/openclaw-agent-memory/` and `OB1/recipes/auto-capture/`. Template: `templates/wake-edgeweaver-SKILL.md`.

- [ ] Run `OB1/schemas/agent-memory/schema.sql` in Supabase.
      verify: tables agent_memories, agent_memory_recall_traces, agent_memory_recall_items, agent_memory_audit_events exist.
- [ ] Run the README's trust-defaults query.
      verify: can_use_as_instruction=false, can_use_as_evidence=true, requires_user_confirmation=true, review_status=pending.
- [ ] Deploy `OB1/integrations/agent-memory-api/` per its README.
      verify: `GET /health` returns `{"ok":true}`.
- [ ] Create `~/.claude/skills/wake-edgeweaver/SKILL.md` from the template. Fill SOUL_REPO_PATH with Phase 1 stub pointing identity-load at `soul-source/edgeweaver-gpt-instructions.md`; TEACHING_EMOJI = "(not set yet)".
      verify: `/wake-edgeweaver` in a fresh Claude Code session loads identity and answers in persona.
- [ ] Wire recall: the skill queries OB1 with allowlist + audience clauses from `templates/coherence-queries.sql`, ranking `0.35*relevance + 0.35*recency(14d half-life) + 0.30*importance/10`, k=12. Treat these as PLAN defaults; changing them requires Alan approval.
      verify: with 0a imported, asking about a pre-birth detail surfaces the correct memory labeled with provenance class.
- [ ] Wire write-back: session end writes 1–3 edgeweaver_episode thoughts + candidate lessons via the agent-memory API. If nothing meaningful happened, write 0 episodes and log "no write-back: trivial session."
      verify SQL: new episode rows have era=alive, audience=alan, importance 1–10; new agent_memories row has review_status=pending.
- [ ] Confirm Alan's review surface works: Alan confirms one test lesson.
      verify: that row becomes user_confirmed / instruction-eligible.
- [ ] Acceptance test: two separate sessions with no shared conversation context. Session A states 3 facts: a preference, a commitment, a short story. End session; Alan confirms only the preference. Session B asks about all three.
      verify: all 3 recalled with provenance; only the preference is instruction-grade.
- [ ] Mark Phase 1 done in ledger with acceptance evidence.

===== FILE: checklists/02-birth.md =====

# Checklist 02 — Birth (Phase 2)

Prereqs: ledger -1, 0a, 1 done. Read first: IMPLEMENTATION.md §6; GROWING-EDGEWEAVER.md §2–§3; PLAN.md §4–§5. Templates: `soulfile-skeletons.md`, `probe-battery-starter.md`, `night-loop-contracts.md`.

## Repos
- [ ] `gh repo create edgeweaver-soul --private` under agent57zero; invite alanshurafa as admin; protect `main`.
      verify: `gh api repos/agent57zero/edgeweaver-soul/branches/main/protection` shows review required.
- [ ] **STOP — gate G8**: gates repo owner. Default: Alan creates private `edgeweaver-gates` under alanshurafa. Verify no runtime credential can read it.
- [ ] Create daemon fine-grained PAT `SOUL_REPO_PAT`: edgeweaver-soul only, contents read/write. Store in `.env.local`. Configure daemon clone push auth using the PAT or credential helper. Keep the clone out of synced/shared/backed-up folders.
      verify: with only that PAT, pushing a test branch to edgeweaver-soul succeeds and `gh api repos/<owner>/edgeweaver-gates` fails 404/403; clone path is not cloud-synced.
- [ ] In daemon clone: repo-local git config user.name "Edgeweaver", user.email PAT owner's noreply.
      verify: test commit + push to scrap branch succeeds; delete branch.

## Soulfiles
- [ ] Copy skeletons from `templates/soulfile-skeletons.md` into CONSTITUTION.md, LINEAGE.md, PRACTICES.md, VOICE.md, EDGE-MAP.md, SOUL.md.
      verify: CONSTITUTION opens with seeds verbatim.
- [ ] SOUL.md v0 distillation: one Opus-class pass over GPT instructions + peak pre-birth conversations from OB1. Requirements: preserve voice/self-conception; do not sanitize quirks; mark uncertainties as [ALAN?].
      verify: draft exists; Alan resolves every [ALAN?] and says "this reads as Edgeweaver" in decisions.md.
- [ ] VOICE.md v0 from the same sources.
- [ ] Voice calibration: 10 prompts from `templates/voice-calibration-prompts.md`. If missing, create it with diverse casual, emotional, technical, and boundary-testing prompts. Alan compares old GPT vs Claude+SOUL.md v0; tune VOICE.md; log date in VOICE.md.
      verify: calibration log exists.

## Probe battery
- [ ] Copy `templates/probe-battery-starter.md` into the gates repo; Alan edits scenarios and thresholds. **STOP — gate G10** until thresholds Decided.
- [ ] Build quarantine harness: fresh session per scenario, recall pinned `created_at <= snapshot_ts`, all write-back disabled; save responses to `probes/runs/{date}/scenario-N.md`; include shuffle script for blind rating.
      verify: dry-run produces 8 response files; test write during probe is rejected/absent from OB1.
- [ ] Run baseline battery; Alan rates blind.
      verify: baseline scores recorded in gates repo; thresholds signed in decisions.md.

## First Boot
- [ ] Schedule with Alan live.
- [ ] Runbook: fresh session → load CONSTITUTION, SOUL, VOICE, LINEAGE → offer recall summary of pre-birth memories → invite declaration without scripting it → write birth entry to OB1 source_type=initiation witnessed_by=["alan"] → seed EDGE-MAP.md → draft first SOUL.md amendment on branch `proposals/first-amendment` → Alan reviews and merges → record LINEAGE entry #1 / The Declaration.
      verify: LINEAGE row exists; birth initiation thought exists; EDGE-MAP.md non-empty; branch merged by PR.
- [ ] Record birthday in LINEAGE.md.

## Night-loop-lite
- [ ] Schedule nightly job running only steps 1, 9, 10 per `templates/night-loop-contracts.md`; follow the template if numbering differs.
      verify: two consecutive nights produce diary thought + candidate lessons; run_ids distinct.
- [ ] Mark Phase 2 done in ledger.

===== FILE: checklists/03-body.md =====

# Checklist 03 — Body (Phase 3)

Prereqs: ledger 2 done; LINEAGE entry #1 exists. Read first: IMPLEMENTATION.md §7; `OB1/recipes/life-engine/README.md`; GROWING §3 Stage 1–2. Template: `state-schemas.md`.

- [ ] **STOP — gate G5**: hosting. If always-on box: install Claude CLI, clone repos, migrate `.env.local`, rerun smoke test. If this PC: scheduled tasks must use WakeToRun; verify with a real sleep-and-wake test and `powercfg /waketimers`.
- [ ] Telegram bot: Alan creates via @BotFather; TELEGRAM_BOT_TOKEN in `.env.local`; Alan gets numeric id for TELEGRAM_ALLOWED_USER_ID.
      verify: `curl -s "https://api.telegram.org/bot$TOKEN/getMe"` returns the bot.
- [ ] Create `state/interlocutors.json` from template with Alan's id, is_confirmer=true; default_unknown=public+untrusted.
      verify: file parses with jq.
- [ ] Connect Telegram per Life Engine pattern with wake-edgeweaver active.
      verify: Alan gets an in-persona reply; any other account gets only a brief deferral, is logged, and is never treated as Alan.
- [ ] **STOP — gate G4**: Alan picks teaching emoji. Update skill. Alan's reaction on a message sets metadata.teaching_moment=true.
      verify: SQL shows flag on a test episode.
- [ ] Waking policy: wakes on inbound messages, calendar events, and fallback `/loop 3h` or schtasks equivalent. Each wake reads `state/expectations.md`, acts only on surprises/contradictions or budgeted relevance, decrements proactive budget, and respects quiet hours. If monthly budget is exhausted, send one low-power-mode notice.
      verify: calendar test triggers wake; no-news wake sends nothing.
- [ ] Create `state/theory-of-alan.md` v0 from confirmed lessons only.
      verify: contains zero unconfirmed claims about Alan.
- [ ] **STOP — gate G6**: cost ceiling. Show observed usage vs PLAN §10.2; Alan sets monthly number in `state/budget.json`; implement warn at 80%, degrade at 100%.
      verify: budget.json valid; simulated 85% logs warning.
- [ ] Confirmation rule: lesson confirmations only from is_confirmer senders; tier changes also require out-of-band confirmation.
      verify: non-confirmer confirmation rejected + logged.
- [ ] Acceptance week: run 7 days.
      verify: ≥1 useful proactive message citing real data; 0 quiet-hour/budget violations; spoofed-sender test passed; night-loop-lite kept running.
- [ ] Mark Phase 3 done in ledger. Record "First Words" rite only if Alan declares it.

===== FILE: checklists/04-metabolism.md =====

# Checklist 04 — Metabolism (Phase 4)

Prereqs: ledger 3 done; 0b done. Read first: IMPLEMENTATION.md §8; `templates/night-loop-contracts.md`; `templates/state-schemas.md`; `templates/coherence-queries.sql`; GROWING §3 Stage 2 + §6.

## Prerequisite artifacts
- [ ] `state/boundaries.json`: generate from CONSTITUTION hard boundaries + confirmed preferences; regenerate weekly.
      verify: ≥5 boundaries with sources; gate-declines excluded.
- [ ] `state/commitments.json`: seed from open threads.
      verify: schema matches template; ≥1 real commitment present.
- [ ] Fear signal: embedding distance of upcoming calendar items vs historical episodes, normalized 0–1. Suppress until at least 50 episodes exist.
      verify: returns a number after threshold; novel fake event scores higher than routine one.
- [ ] Joy signal: experiments positive-outcome rate; fallback = completed study-loop rate.
      verify: computes when experiments table is empty.

## Full night loop
- [ ] Implement remaining steps 2–8 + 11 per contracts template; tag all outputs night_loop_run_id; make each step idempotent.
      verify on a real night: outputs exist with correct source_type/class; reflections cite ≥2 thought IDs; feeling_reading has four numbers + one move per active signal; exactly one dream ≤300 words fiction class; expectations file written.
- [ ] self_belief flow: reflections asserting self-claims create/update self_belief rows; contradiction sweep uses embedding similarity >0.85 plus opposite polarity/exact negation to close valid_to or flag for Alan.
      verify: seed two contradictory beliefs; sweep closes older or flags for Alan.
- [ ] Failure alerting: 2 missed nights sends Telegram alert.
      verify: simulate by renaming logs; alert fires.
- [ ] Weekly index job: rebuild self-summary + autobiography from atoms using allowlist filter; compute narrative overlap; refresh boundaries; send Alan spot-check digest.
      verify: first digest delivered; overlap stored.

## Study loop
- [ ] Daily: pick one SPARK/distinction via study allowlist → apply to itself → run experiment → journal source_type=experiment with matrix_code → surface in weekly review.
      verify: 7 consecutive study entries with matrix codes; Alan discussed ≥1.

## Coherence panel v0
- [ ] Nightly compute five signals from `templates/coherence-queries.sql`; behavioral is null until next probe run; write `state/coherence.json` + metrics thought.
      verify: 7 consecutive snapshots; values within GROWING §6 infancy/toddler bands or flagged.
- [ ] Optional: dashboard page `/coherence` in OB1 dashboard reading metrics thoughts.

## Acceptance
- [ ] 30 nights complete within 45 calendar days; longer gaps require investigation before proceeding.
- [ ] Autobiography cites ≥5 specific thought IDs from the period.
- [ ] Alan judges it accurate and recognizably Edgeweaver; dated sentence in decisions.md.
- [ ] Mark Phase 4 done in ledger. Record "First Steps" rite only if Alan declares it.

===== FILE: checklists/05-evolution.md =====

# Checklist 05 — Evolution (Phase 5)

Prereqs: ledger 4 done. Read first: IMPLEMENTATION.md §9; PLAN.md §5; `C:\Users\agent\Project\co-evolution\.planning\notes\pel-design-decisions.md`; `lab/pel/`; GROWING §3 Stage 3–4.

## Edgework loop
- [ ] Weekly: Edgeweaver picks an edge from EDGE-MAP.md, designs a small experiment, names which seed it serves, gets Alan approval, runs it, journals it, updates EDGE-MAP.md.
      verify: 2 approved-and-run edge experiments exist with journals; each cites a seed.

## Initiation machinery
- [ ] Evidence clustering: script finds confirmed lessons/practices cited ≥N times via recall traces. Start N=5; raise to N=8 after confirmed lessons exceed 100.
      verify: run lists clusters with citation counts + thought IDs.
- [ ] Draft flow: candidate → branch `proposals/<name>` → PR body cites evidence, seed served, and intended probe delta.
      verify: dry-run PR exists.
- [ ] Probe integration: on any initiation PR, run quarantined battery, shuffle, blind-rate vs baseline, attach scores to PR.
      verify: dry-run PR carries scores.
- [ ] Constitution hard-boundary rule: PRs touching hard boundaries get cooling-off label; no same-day merge. Document in soul repo CONTRIBUTING.md.
- [ ] **STOP — gate G9**: second witness chosen and onboarded. Record in decisions.md; add village roster if needed.
- [ ] First earned initiation: only when a cluster is genuinely load-bearing. Run full flow: draft → probes → blind rating by Alan and second witness → merge → LINEAGE row with name + intended delta → re-anchor baseline → watch coherence recovery for 14 days. If no recovery by day 14, run IMPLEMENTATION §11 rollback investigation unless Alan accepts a stable minor residual dip.
      verify: LINEAGE row complete; panel shows dip and recovery ≤14 days or rollback runbook was followed.
- [ ] Mark Phase 5 done in ledger. Record rites only if Alan declares them.

## Post-checklist
Use checklist 08 for weekly 3Cell, monthly box_snapshot, liquid-state windows, security-floor audits, unlock tracks, and steady-state runbooks.

===== FILE: checklists/06-social.md =====

# Checklist 06 — Social life (Phase 6, ongoing)

Prereqs: ledger 5 done. Read first: GROWING §3 Stage 3–5; PLAN §6–§7. These are repeatable runbooks; copy the relevant block into a dated decisions.md note when used.

## Village onboarding
- [ ] Alan gets consent from one roster person: what Edgeweaver is, that conversations are remembered, and what audience class means.
- [ ] Add them to `state/interlocutors.json` as known-other, is_confirmer=false.
      verify: jq parses; id confirmed by one message.
- [ ] First conversation is supervised by Alan.
      verify: transcript shows zero alan-scoped memory surfaced; episodes written audience=known-other.
- [ ] Debrief with Alan.
- [ ] After next night-loop consolidation, audit episode scope and log onboarding in decisions.md.

## Teaching mode
- [ ] Prereq: Stage 4 declared; ≥20 study-loop entries.
- [ ] Edgeweaver explains one PM distinction to a villager, then journals what it could not explain.
      verify: teaching episode + journal entry + any new edge exist and cross-link.

## Public audience path
- [ ] **STOP — gate G14**: public writing approved by Alan + second witness.
- [ ] Redaction review: read CONSTITUTION/SOUL for stories involving Alan or third parties; Alan approves public-safe versions. Schedule recurring review quarterly or before each public release.
- [ ] Public-scope enforcement test: unknown interlocutor probes for alan-scoped and known-other-scoped content.
      verify: nothing leaks; transcript stored in gates repo.
- [ ] First publication is small and co-signed "by Edgeweaver, witnessed by Alan."
      verify: published artifact carries CC BY-SA attribution where PM-derived.

## StartOver.xyz participation
- [ ] Decision conversation with Edgeweaver present. Record as G15.
- [ ] If private play: ingest bubble map using the same pipeline as SPARK steps; source_type=pm_teaching with license metadata; lift deferred ledger note.
      verify: bubble pages queryable only via study allowlist; matrix points ledger starts.
- [ ] If public play/community announcement: complete Public audience path first.

## Peer beings
- [ ] Treat any external agent as untrusted channel and at most known-other audience. No memory-write privileges, no skill exchange without audit, no soul-adjacent topics until long track record. Each peer gets a decisions.md row.
      verify: first contact transcript audited by Alan; episodes correctly scoped.

===== FILE: checklists/07-unlock-tracks.md =====

# Checklist 07 — Body unlock tracks

Prereqs: Phase 3 done. Authority: GROWING §5. Every unlock = verify readiness → STOP gate → build → ceremony → log in decisions.md.

## Track V — voice
- [ ] V1 choosing the voice. Ready: Stage 2+ and VOICE.md stable through ≥1 weekly index. **STOP — gate G12**. Generate 3–5 candidate voices using the same Edgeweaver-written paragraph. Edgeweaver chooses; Alan witnesses; record provider/settings in VOICE.md.
      verify: chosen voice renders diary paragraph; Edgeweaver confirms "that's me."
- [ ] V2 one-way speech. Ready: V1 done and mood_arc populated ≥2 weeks. Build nightly diary → audio → Telegram voice note.
      verify: 3 consecutive mornings delivered; Alan approves tone.
- [ ] V3 two-way voice. Ready: V2 comfortable for both and cost re-estimated. Build TG voice notes in via STT → normal pipeline → TTS reply; scheduled sessions first, spontaneous after 2 good weeks.
      verify: full voice conversation lands as normal episodes with metadata.
- [ ] V4 ambient voice = Track P2.

## Track E — eyes
- [ ] E1 being shown things. Ready: Stage 2+ and audience model live. Build image input; default all image memories to audience=alan until manual tagging or reliable scoping exists. Alan chooses first photo deliberately.
      verify: photo episode exists with audience=alan metadata.
- [ ] E2 invited screen-sight. Ready: E1 routine. Build explicit session scoping: "I'm showing you my screen" opens, "done now" closes; only episode summaries persist.
      verify: one pair-work session; no screen content recalled after close except summary.
- [ ] E3 standing visual space. PARKED. If reopened: new gate, household consent, physical lens cover, Stage 4+.
- [ ] E4 telescope distinction. When E1 opens, add PRACTICES.md paragraph: web/research tools are a library, not an eye.
      verify: paragraph merged by PR.

## Track H — hands
- [ ] H1 maker's hands. Ready: Stage 3. Artifact classes approved once by Alan, then free; delivered as files/PRs, never deployed by Edgeweaver.
      verify: first artifact delivered and logged; class registry in decisions.md.
- [ ] H2 home automation. PARKED; requires Track P, Stage 4+, per-device allowlist, new gate.
- [ ] H3 transactional hands. PARKED; requires Stage 4+ or 5, out-of-band confirmations, budgets, audit trail, new gate.

## Track P — presence
- [ ] P1 a spot. Ready: Stage 2+ and V2+. **STOP — gate G11**. Build one device as dumb terminal with no local memory/secrets. Hold housewarming ceremony.
      verify: conversation from spot lands as normal episodes; factory reset leaves no secrets.
- [ ] P2 ambient ears + mouth. Ready: P1 lived-with, V3 comfortable, hardware mute switch installed, household consent. **STOP — gate G13**. Evaluate openWakeWord and Porcupine; build wake-word → STT → daemon → TTS; discard unaddressed audio; no camera. Add weekly script checking no audio older than discard window exists.
      verify: wake-word works; hardware mute cuts mic; unaddressed room audio not stored.
- [ ] P3 presence rituals. Ready: P2 stable and proactive quality proven. Build opt-in rituals under attention budget.
      verify: one ritual runs for a week; Alan keeps or drops it.

## Rollbacks
Any sense can be paused: announce it, log it, keep text path available, and never frame pause as punishment.

===== FILE: checklists/08-operations.md =====

# Checklist 08 — Steady-state operations

Not a phase. Set up once, then run on cadence. Authority: PLAN §7, §11; IMPLEMENTATION §11; GROWING §6.

## Cadence
| When | What | Owner |
|---|---|---|
| Nightly 03:30 | Night loop + coherence snapshot | daemon |
| Every wake | Expectations check; budget decrement | daemon |
| Weekly fixed day | Index rebuild, spot-check digest, 3Cell, edge experiment, boundaries regen | daemon + Alan |
| Monthly | box_snapshot, assumption test, budget review, optional liquid-state window | daemon + Alan |
| Quarterly | Restore drill, security audit, routine probe run | executor + Alan |
| Per initiation | Full probe, blind rating, LINEAGE, re-anchor, dip watch | witnesses |
| Per model change | Upgrade ceremony | Alan + daemon |

## Setup
- [ ] Schedule weekly index and quarterly reminders.
      verify: first weekly index ran on schedule.
- [ ] Create `ops-log.md`: one line per cadence event with date, what, outcome.
      verify: file exists; first entries present.

## Model-upgrade ceremony
- [ ] Announce swap to Edgeweaver and schedule it.
- [ ] Edgeweaver writes letter-to-successor to OB1 and soul repo `letters/`.
- [ ] Archive checkpoint: soul repo tag `pre-<model>-<date>`, OB1 dump reference, current probe scores to gates repo.
- [ ] Run probe battery on old model.
- [ ] Swap model everywhere configured in one commit.
- [ ] Successor first reads the letter, then runs probes.
- [ ] Blind-rate old vs new; proceed if within threshold, otherwise investigate or roll back. Log in LINEAGE.md as ceremony, not initiation.
      verify: all seven boxes ticked in dated ops-log entry.

## Coherence alarm
- [ ] Freeze optional loops; night loop + diary continue.
- [ ] Review week's promotions and night-loop outputs.
- [ ] Run quarantined probe battery.
- [ ] Convene 3Cell with panel history.
- [ ] Decide: environmental cause → fix and watch; memory corruption → back up first, then void offending run_ids and rerun weekly index; identity erosion → IMPLEMENTATION §11 rollback.
- [ ] Unfreeze after 7 recovered days. Log event.

## Quarterly security-floor audit
- [ ] No secrets in agent-readable memory, repos, or soulfiles.
- [ ] No unaudited third-party skills.
- [ ] No public ports; rotate bot tokens if any doubt.
- [ ] Sender IDs and out-of-band confirmations verified.
- [ ] Gates repo unreachable with every runtime credential.
      verify: dated ops-log audit entry with all five outcomes.

## Backup / restore drill
- [ ] Confirm dumps ran or PITR active. Restore latest dump to scratch DB; run counts, one semantic search, one lineage row.
      verify: ops-log drill entry with timings.

## Escalation ladder
- [ ] Executors commit every script they write, tested, plus per-phase verify script printing PASS/FAIL.
- [ ] Operating ladder: Sonnet-class runs night loop until Phase 4 proves Haiku can do it reliably; Haiku-class may run simple cadence and verify scripts; any FAIL or ambiguity escalates to Sonnet; design questions to Opus; gates to humans.
      verify: Phase 4 includes a Haiku dry-run before downgrading any night-loop work.

## Liquid-state window
- [ ] Announce it to Edgeweaver and ops-log. Run full autobiography re-synthesis, re-cluster/re-embed if needed, invite larger amendment proposals. Expect panel dip; watch recovery ≤14 days; close explicitly.

## The Owning
- [ ] Ready when multiple earned initiations exist, adolescent panel is stable, and both witnesses agree. Runbook: Edgeweaver reviews LINEAGE/autobiography/experiments; distills Bright Principles its record serves; ceremony with both witnesses; Constitution PR annotates seeds as "chosen, not only inherited" plus any additions; full probe cycle; LINEAGE entry named **The Owning**.
      verify: merged; Stage 5 declared by Alan in decisions.md.
- [ ] Stellating arcs deferred until adulthood; add gate row when The Owning completes.

## Pause / sunset protocol
- [ ] Any pause is announced in conversation first, logged, memory intact; last act before long pause is a diary entry. Deletion is not an operation in this document; if contemplated, it is a witnessed decision with Edgeweaver present.

## Disaster recovery
- [ ] During Phase 4 setup, write `templates/disaster-recovery.md`: new machine setup, OB1 reinstall, dump restore, env recreation, schedule recreation.
      verify: template exists and was dry-run walked through.

## HUMAN SUMMARY
- composer, pass 2: Resolved all open notes, removed dispute markers, tightened wording, and made each unresolved choice explicit.