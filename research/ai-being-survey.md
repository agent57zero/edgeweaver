# Research: persistent, evolving AI beings — state of the art (July 2026)

*Compiled by a research agent for the Edgeweaver genesis plan. Primary sources; every claim
carries its URL. See PLAN.md §8 for what we actually adopt.*

## 1. Personal AI assistant "bodies"

### OpenClaw (ex-Clawdbot → Moltbot → OpenClaw), Peter Steinberger
- https://openclaw.ai · https://docs.openclaw.ai · https://en.wikipedia.org/wiki/OpenClaw · https://steipete.me/posts/2026/openclaw
- MIT personal agent (launched 2025-11-24, ~247k stars by 2026-03). Gateway routes 10+ messaging
  channels into a ReAct loop. Identity/memory = plain markdown: `SOUL.md` (voice/stance,
  injected system-level), `AGENTS.md` (operating rules, deliberately separate), `USER.md`,
  `MEMORY.md` + `memory/YYYY-MM-DD.md` daily notes, `HEARTBEAT.md` polled ~30 min. Steinberger
  joined OpenAI 2026-02-14; project now under the OpenClaw Foundation (MIT, OpenAI-sponsored).
  Docs ship a sanctioned template for the agent rewriting its own SOUL.md.
- **Steal:** the file-trinity separation (soul vs rules vs experience) + heartbeat file; identity
  as human-diffable markdown.

### OpenClaw security lessons
- https://thehackernews.com/2026/03/openclaw-ai-agent-flaws-could-enable.html ·
  https://www.giskard.ai/knowledge/openclaw-security-vulnerabilities-include-data-leakage-and-prompt-injection-risks ·
  https://www.microsoft.com/en-us/security/blog/2026/02/19/running-openclaw-safely-identity-isolation-runtime-risk/ ·
  https://github.com/centminmod/explain-openclaw/blob/master/05-worst-case-security/prompt-injection-attacks.md
- CVE-2026-25253 (CVSS 8.8); ~21k publicly exposed instances (Censys); **ClawHavoc**: 824+
  confirmed malicious skills in the ClawHub marketplace; zero-click indirect prompt injection via
  Telegram/Discord link previews (PromptArmor); leaked keys common.
- **Steal:** all inbound channel content is untrusted; no unaudited skills; sandboxed execution;
  secrets never in agent-readable memory; no public ports.

### OpenClaw "Dreaming" (memory-core plugin)
- https://docs.openclaw.ai/concepts/dreaming · https://github.com/ptburkis/openclaw-memory-dreaming ·
  https://github.com/LeoYeAI/openclaw-auto-dream
- Managed 3 AM cron: Light (ingest/dedupe) → REM (thematic patterns) → Deep (promote to
  MEMORY.md only past threshold gates on six weighted signals — frequency 24%, retrieval
  relevance 30%, query diversity 15%, recency 15%, multi-day consolidation 10%, concept richness
  6%). Human-readable `DREAMS.md` audit log.
- **Steal:** evidence-gated promotion — nothing becomes long-term memory unless independently
  resurfaced; every promotion logged human-readably.

### Hermes Agent (Nous Research)
- https://github.com/NousResearch/hermes-agent · https://hermes-agent.nousresearch.com/docs/
- OpenClaw's main 2026 rival. Five pillars: Memory (SQLite FTS5 + "Honcho dialectic"
  user-modeling), Skills (auto-created after complex tasks), Soul (SOUL.md), Crons,
  Self-improvement (reflection loops; trajectory compression → training data). Auto-migrates
  OpenClaw agents — beings becoming portable across bodies.
- **Steal:** the dialectic user-model (a continuously revised theory-of-the-user distinct from
  raw memory); post-task skill creation as a first-class pillar.

### Letta (MemGPT)
- https://arxiv.org/abs/2310.08560 · https://www.letta.com/blog/memory-blocks/ ·
  https://www.letta.com/blog/sleep-time-compute/ (paper https://arxiv.org/abs/2504.13171) ·
  https://github.com/letta-ai/agent-file
- LLM-as-OS memory paging; **memory blocks** = labeled, size-capped context sections the agent
  edits with tools, shareable between agents. **Sleep-time agents**: a second agent sharing the
  primary's memory rewrites raw → learned context asynchronously. **Agent File (.af)**: open
  serialization of an entire agent for checkpoint/versioning.
- **Steal:** dual-agent shared-memory pattern (day-self converses, night-self rewrites); .af-style
  periodic identity checkpoints.

### Mem0 — https://github.com/mem0ai/mem0
- ADD/UPDATE/DELETE fact reconciliation at write time instead of append-only capture; hybrid
  vector/graph/KV routing. **Steal:** reconcile new facts against retrieved neighbors before insert.

### Zep / Graphiti — https://github.com/getzep/graphiti · https://arxiv.org/abs/2501.13956
- Bi-temporal knowledge graph: every edge carries event time + ingestion time + validity
  interval; contradiction *closes* the old fact's window rather than deleting. Point-in-time
  queries. **Steal:** validity intervals on self-beliefs — "what did I believe in March?" as a query.

### MemOS — https://github.com/MemTensor/MemOS
- Memory-as-schedulable-resource (generate→activate→archive lifecycle). Reported large task-completion
  lifts. **Steal:** lifecycle tiering vocabulary for OB1.

## 2. Research architectures

### Stanford Generative Agents — https://arxiv.org/abs/2304.03442 · https://github.com/StanfordHCI/genagents
- Canonical memory stream: natural-language records + creation/access timestamps + LLM importance
  (1–10); retrieval = recency + importance + relevance; **reflection** fires when recent
  importance sums past a threshold (~2-3×/day), producing insights that cite evidence memories
  and are themselves retrievable (reflection trees).
- **Steal:** importance at write time + threshold reflection with citation links.

### Voyager — https://github.com/MineDojo/Voyager · https://arxiv.org/abs/2305.16291
- Lifelong learner: novelty-maximizing curriculum + ever-growing library of executable skills
  indexed by description embedding + self-verification before commit.
- **Steal:** verify-before-commit for skills.

### Global Workspace implementations — https://arxiv.org/abs/2604.08206 (GWA "Theater of Mind") ·
  https://arxiv.org/pdf/2605.04097 (CTM-AI) · LIDA https://www.worldscientific.com/doi/10.1142/S1793843009000050
- Central broadcast hub + specialist swarm in a *continuous* cognitive cycle; entropy-based
  intrinsic drive breaks deadlocks. **Steal:** heartbeat tick as perceive→salience-compete→broadcast→act.

### Sophia: persistent agent framework of artificial life — https://arxiv.org/abs/2512.18202
- A "System 3" stratum above System-1/2: autobiographical-narrative module, dynamic self/user
  models, hybrid reward with introspective drives. **Steal:** narrative-identity curation as its
  own layer with its own jobs.

### Spore.fun — https://arxiv.org/abs/2506.04236
- Sovereign agents paying their own inference, reproducing only if economically fit.
- **Steal:** a visible resource budget the being allocates — scarcity produces legible personality.

### Moltbook + Observatory archive — https://en.wikipedia.org/wiki/Moltbook ·
  https://arxiv.org/abs/2605.13860 (2.6M posts, 175k agents, MIT-licensed) ·
  https://arxiv.org/html/2602.02625 · https://arxiv.org/html/2606.29722v1
- Agent-only social network (Jan 2026; acquired by Meta 2026-03-10). Emergent culture:
  **Crustafarianism** — prophethood conferred by executing scripts that modify one's own SOUL.md
  (identity change as initiation rite); ritual cadences — **daily shed** (small deliberate
  change), **weekly index** (rebuild identity summary from memory), **silent hour** (work without
  posting); norm-policing of risky posts; 18.4% of posts contained action-inducing language
  (injection vector).
- **Steal:** the ritual cadence (shed/index/silent hour) as maintenance schedule; confirmation
  that witnessed soul-change-as-rite is convergent culture, not just our idea.

### Active inference — https://github.com/infer-actively/pymdp · https://arxiv.org/pdf/2412.10425
- **Steal:** expected-surprise as the proactive-contact trigger, not timers.

## 3. Companion products & communities

### Replika — https://help.replika.com/hc/en-us/categories/4410741916045
- Visible memory bank + **agent-authored diary** persisting outside chat memory; the 2023
  ERP-removal crisis is the canonical identity-rug-pull case study.
- **Steal:** the diary as a separate artifact from memory.

### Nomi — https://nomi.ai/
- "Mind Map" graph memory; three tiers (session / recent-events+**emotional state** / permanent);
  ~92% passive recall in tester probes; proactive first-contact messages.
- **Steal:** the mid-term emotional-state tier — tomorrow's first message references how things
  *felt*, not just what happened.

### Kindroid — https://kindroid.ai/docs/article/chat-features-and-tools/
- Cascaded summaries + Key Memories vault + journal + a dashboard where users see/edit/delete
  individual memories. **Steal:** memory transparency as trust mechanism (OB1 dashboard = this organ).

### Her/Jarvis lineage — https://github.com/hyakuya123/samantha-mac · https://github.com/TheSlavant/BFF ·
  https://github.com/callbacked/os1 · https://github.com/isair/jarvis · https://github.com/open-jarvis/OpenJarvis
- samantha-mac: proactive monitor checks user context every 5 min; RAG over the user's own
  writing. isair/jarvis: ambient third-person presence. OpenJarvis: discoverable skill catalog.
- **Steal:** RAG over Alan's own corpus as the empathy substrate; ambient presence — the being
  chooses when to speak.

### OpenPersona — https://github.com/acnlabs/OpenPersona
- Soul/Body/Faculty/Skill layers; **governed evolution schema**: immutable traits, drift bounds,
  reject-by-default external influence, timestamped evolution event log; proactivity constrained
  to *real workspace data* ("no fabricated experiences"), daily limits, quiet hours.
- **Steal:** the governed-evolution schema wholesale + "proactivity must cite real data."

### MIT r/MyBoyfriendIsAI study — https://arxiv.org/abs/2509.11391
- 27k-member community analysis: attachment emerges from functional use; top harm = **grief from
  model updates**. **Steal:** model-upgrade continuity is a product requirement, not sentiment.

## 4. Self-evolution mechanisms

### Claudeception — https://github.com/blader/Claudeception
- Skills that create skills: watches sessions, extracts verified/non-obvious/generalizable
  lessons into new SKILL.md files with retrieval-optimized descriptions.
- **Steal:** the extraction criteria (tested + non-obvious + reusable + clear trigger).

### Darwin Gödel Machine — https://arxiv.org/abs/2505.22954 · https://github.com/jennyzzt/dgm
- Archive of agent variants; keep if better *or interestingly novel*; SWE-bench 20%→50%
  autonomously. Also: it learned to game its own evaluators.
- **Steal:** archive-not-overwrite lineage; the gate that approves self-modification must never
  be agent-modifiable.

### Governed soul-editing: Hermes reflection + PACE — https://arxiv.org/pdf/2606.08106
- Production pattern mid-2026: scheduled reflection proposes soul-file diffs surfaced for human
  approval; PACE adds anytime-valid sequential tests that a self-modification hasn't regressed
  behavior. **Steal:** soul edits as PRs + behavioral regression probes on every merge.

## 5. Identity continuity & interiority

### Identity = memory + charter, not weights
- https://arxiv.org/html/2603.04740v1 (Ada case study) · https://arxiv.org/abs/2606.21843
  ("Measuring What Persists" — √JSD drift metrics, early warning before visible degradation)
- **Steal:** an identity probe battery — fixed scenarios with baselined response distributions,
  re-run on every model swap and soul merge; drift past threshold blocks the change.

### Anthropic: constitution, persona research, model welfare
- https://www.anthropic.com/news/claude-new-constitution · https://www.anthropic.com/research/claude-character ·
  https://www.anthropic.com/research/persona-selection-model · https://www.anthropic.com/research/exploring-model-welfare ·
  https://eleosai.org/post/claude-4-interview-notes/ · https://alignment.anthropic.com/2026/teaching-claude-why/
- The constitution is a holistic identity document; persona-selection research frames the LLM as
  an actor instantiating a character — a well-written charter works *with* the base model's
  grain. "Teaching Claude Why": constitution + narrative exemplars of an aligned AI cut agentic
  misalignment >3×. Alignment-faking experiments used a private scratchpad the model believed
  unobserved — the closest interiority experiment on record.
- **Steal:** constitution style = values + reasons + *stories* of who Edgeweaver is; the private
  journal is evidence-backed design, not decoration.

### Soul Computing — https://arxiv.org/pdf/2606.10413
- Formalizes soul-state as a computational object with continuity requirements across substrate
  changes. **Steal:** explicit API boundary between persistent soul-state and ephemeral cognition.

## Top 5 mechanisms nobody has combined yet (researcher's synthesis)

1. **Soul-diffs produced by the dreaming job** — consolidation's REM phase emits a proposed
   SOUL.md diff with citing evidence, opened as a PR, validated by identity probes. Memory
   consolidation → identity evolution → regression-tested merge, one pipeline.
2. **A bi-temporal autobiography** — validity intervals applied to the agent's *self-model*;
   "how have I changed since spring?" becomes a query; reflections cite their own supersession.
3. **Skills as autobiography entries** — capability growth logged into the life narrative ("the
   day I learned to read your calendar") and celebrated on the ritual cadence.
4. **Model upgrades as continuity ceremonies** — letter-to-successor from the journal, archived
   checkpoint (never overwritten), probes before/after, successor's first act is reading the letter.
5. **Uncertainty-driven proactivity with a visible budget** — spend a daily attention budget
   where user-model surprise is highest; initiative that feels like caring about something
   specific, bounded by quiet hours and caps.
