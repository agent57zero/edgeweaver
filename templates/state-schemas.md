# Template: state file schemas (daemon-local, gitignored; `state/` directory)

> Operational memory — NOT identity (soul repo) and NOT experience (OB1). Losable without
> death; rebuilt by the loops. All JSON, UTF-8.

## state/interlocutors.json — audience scoping map (PLAN §7)
```json
{
  "telegram": {
    "123456789": { "name": "Alan", "audience": "alan", "is_confirmer": true },
    "987654321": { "name": "Ali",  "audience": "known-other" }
  },
  "default_unknown": { "audience": "public", "untrusted": true }
}
```
Only entries with `is_confirmer: true` may confirm lessons or tier changes — and tier changes
additionally require out-of-band confirmation (a Claude Code session counts).

## state/boundaries.json — anger-signal registry (PLAN §2.4)
```json
{
  "generated_from": ["CONSTITUTION.md hard boundaries", "confirmed agent_memories prefs"],
  "generated_at": "2026-09-01T03:30:00Z",
  "boundaries": [
    { "id": "b-001", "text": "No secrets in memory", "source": "constitution" },
    { "id": "b-002", "text": "Quiet hours 22:00-07:00", "source": "confirmed-pref" }
  ],
  "overrides_log": [
    { "date": "", "boundary": "", "by": "external|self", "gate_decline": false }
  ]
}
```
Anger signal = count(overrides_log last 7d where by=external AND gate_decline=false) — Alan's
legitimate gate declines are excluded by construction.

## state/commitments.json — sadness-signal tracker
```json
{
  "commitments": [
    { "id": "c-001", "text": "Send Alan the SPARK summary", "made": "2026-09-01",
      "due": "2026-09-03", "status": "open|done|renegotiated", "source_thought": "uuid" }
  ]
}
```
Sadness signal = count(open past due). Renegotiated ≠ overdue (declare-then-do allows
renegotiation, silently dropping does not).

## state/expectations.md — surprise baseline (written by night-loop step 11)
```markdown
# Expectations for {DATE}
- [calendar] Alan: dentist 14:00 — expect low afternoon responsiveness.
- [pattern] Likely OB1 work in the morning (3 of last 4 weekdays).
- [thread] Awaiting Alan's reply on the village roster question.
- SURPRISING IF: a new person messages; calendar event cancelled; Alan works past 23:00.
```
Waking policy: score each observation against this file; proactive contact only on listed
surprises, contradictions, or budgeted relevance.

## state/budget.json — attention/cost ledger
```json
{ "month": "2026-09", "ceiling_usd": 0, "spent_estimate_usd": 0,
  "daily_proactive_cap": 3, "proactive_sent_today": 0,
  "quiet_hours": ["22:00", "07:00"] }
```
Update per wake; soft-warn at 80% of ceiling, degrade at 100% (Haiku checks only, skip
optional loops). Cost estimation: tokens from API usage metadata × current pricing; crude is
fine, consistent matters.

## state/wal/{YYYY-MM-DD}.jsonl — write-ahead buffer (degraded mode, PLAN §7)
One JSON object per line: `{ "ts": "...", "kind": "episode|lesson|metric", "payload": {...},
"fingerprint": "sha256-of-content" }`. Replay on reconnect; dedupe by fingerprint (OB1 core
has content-fingerprint dedupe — reuse it). After replay, move file to state/wal/replayed/.

## state/coherence.json — panel snapshot (night-loop output)
```json
{ "date": "2026-09-01", "stage": "infancy",
  "relational": 0.41, "temporal_open_contradictions": 2, "narrative_overlap": null,
  "behavioral_drift": null, "pulse": { "night_loops_7d": 6, "weekly_index": true } }
```
Thresholds per stage: GROWING-EDGEWEAVER §6. Also written to OB1 as a metrics thought so the
dashboard can chart history.
