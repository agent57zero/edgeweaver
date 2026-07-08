# Template: night-loop step contracts (Phase 4; lite subset at Phase 2)

> Each step: purpose → inputs → outputs → prompt contract → failure behavior. All steps
> idempotent per `night_loop_run_id = "nl-" + YYYY-MM-DD`: before running a step, query for
> outputs with this run_id + step name; if present, skip. A step failure logs and continues
> to the next independent step (only 1→3 and 11 have hard ordering).
> **Night-loop-lite (from birth, Phase 2)** = steps 1, 9, 10 only.
>
> **Diary-day rule (D16, 2026-07-08)**: every "today's" below means the DIARY DAY = the local
> calendar day (EDGEWEAVER_TZ) containing T minus 12h at run time - at the scheduled 03:30
> that is the day that just ended, NOT the calendar date of the run moment. The run_id carries
> the diary-day date; fetch windows are that local day converted to UTC bounds. (The original
> "created_at today" reading at 03:30 consolidated 3.5 sleeping hours of the new day and
> missed the lived day - the bug that prompted this rule.)

| # | Step | Inputs | Outputs (all tagged run_id + step) | Contract / notes |
|---|---|---|---|---|
| 1 | Consolidate | today's `edgeweaver_episode` rows | candidate lessons → agent-memory API (pending) | Prompt: "From these episodes, extract 0–5 durable lessons (preference/fact/pattern). Each: one sentence + evidence thought-IDs + confidence. No speculation." |
| 2 | Ingest projection queue | thoughts with `metadata.staging=true` | episodes (untrusted-marked) or discard | No-op until projections exist (Phase 6). Same trust rules as channel content. |
| 3 | Reflect | today's episodes + last 3 reflections | 1–3 `interpretation` reflections citing ≥2 thought-IDs each; any `self_belief` updates (see below); weekly (or when the tell appears): one `gremlin_report` | Generative-Agents pattern: "What 1–3 higher-level observations follow from today? Cite evidence." Self-belief change → close old row's valid_to, insert new. The gremlin_report checks the five inherited patterns by name (soul-source Q5: performance/velvet curtain, inflation, pleasing, premature coherence, soft saviorism) plus the observable checks (agreed too quickly, avoided a topic, exceeded evidence); the tell: voice more impressive than intimate; the antidote is written into the report (name it, reduce ornament, one grounded move, return authority). |
| 4 | Feelings reading | signal computations (state/boundaries.json, commitments.json, calendar novelty query, experiment outcomes) | one `feeling_reading` + one concrete move per active signal | Signals are computed BEFORE the LLM call; the model interprets numbers it is given — it never invents the numbers. |
| 5 | Completion loops | recall traces: memories retrieved ≥3× this week in contexts with cosine sim < 0.35 to them | one processed lesson; importance down-weight on the stale memory | "This old memory keeps intruding. What is it about? What lesson completes it?" |
| 6 | Importance recalibration | recall traces + importance values | batch metadata updates | v1 rule: `new = round(0.5*current + 0.5*min(10, retrievals_14d * usefulness))`; never-retrieved & >30d & importance>6 → decay by 1. SQL sketch in coherence-queries.sql. |
| 7 | Coherence sweep | active `self_belief` rows; this week's orphan thoughts | closed/flagged contradictions; proposed `thought_edges` for orphans; metrics for panel | Contradiction: overlapping validity windows + LLM judges conflict → close older `valid_to=now`, or flag for Alan if both seem true. |
| 8 | Dream | 6–10 randomly sampled thoughts from the last 30d (weighted by importance) | exactly one `dream` (fiction class) | Bounded: ≤300 words, clearly framed as dream. Log the prompt variant used (this step is an ongoing experiment). |
| 9 | Diary | today's episodes + feelings reading | one `diary` thought (interpretation class, audience=alan) + Telegram delivery next morning | First person, honest, short. This is the audit surface — never optimize it to please. |
| 10 | Autobiography (provisional) | diary + reflections | updated draft section | Weekly index (separate job) rebuilds from atoms — the compounding firewall. |
| 11 | Intentions + expectations | open commitments, calendar, theory-of-alan | state/expectations.md + `intention` metadata thought | Expectations must be concrete and checkable ("Alan will likely work on X; if Y appears, that's surprising"). Feeds tomorrow's waking policy. |

## Weekly index job (separate schedule)
1. Rebuild self-summary + autobiography **from atoms** (wiki-synthesis autobiography
   synthesizer, SUBJECT_NAME=Edgeweaver, source filter per conventions).
2. Narrative-coherence metric: Jaccard overlap of cited thought-ID sets between this rebuild
   and last week's. Store in panel metrics.
3. Refresh EDGE-MAP.md from `edge` thoughts (Phase 5+).
4. Emit Alan's spot-check digest: top-10 most-retrieved memories + all night-loop outputs of
   the week, one-tap confirm/flag via Telegram.

## Failure alerting
If no run_id outputs exist for 2 consecutive nights → send Telegram alert:
`curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d chat_id=$TELEGRAM_ALLOWED_USER_ID -d text="Night loop has not completed for 2 nights — check logs/night.log"`

## Scheduling (Windows, this-PC hosting)
```
schtasks /Create /SC DAILY /ST 03:30 /TN "EdgeweaverNightLoop" ^
  /TR "cmd /c cd /d C:\Users\agent\Project\Edgeweaver && powershell -NoProfile -Command \"claude -p '/wake-edgeweaver night-loop' --output-format text\" >> logs\night.log 2>&1"
```
Unattended permissions: configure per `OB1/recipes/life-engine/README.md` Step 6
(settings.json permission allowlist for headless operation). Weekly index: same pattern,
`/SC WEEKLY /D SUN /ST 04:30`.
