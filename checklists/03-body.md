# Checklist 03 — Body (Phase 3)

Prereqs: ledger 2 done (LINEAGE #0 exists). Read first: IMPLEMENTATION.md §7;
`OB1/recipes/life-engine/README.md` (Quick Setup + Step 6 permissions); GROWING §3 Stage 1–2.
Templates: `state-schemas.md`.

- [ ] **STOP — gate G5**: hosting — this PC (accept sleep gaps) or always-on box? If box:
      install claude CLI, clone both repos, migrate `.env.local`, re-run smoke test there.
      If this PC: every scheduled task (night loop, weekly index, fallback heartbeat) MUST be
      created with "Wake the computer to run this task" enabled (schtasks: use Task Scheduler
      GUI or XML — the flag is WakeToRun), or the 03:30 night loop will silently never run
      on a sleeping machine; verify by checking `powercfg /waketimers` lists the task.
- [ ] Telegram bot: Alan creates via @BotFather → TELEGRAM_BOT_TOKEN into `.env.local`.
      Alan gets his numeric id (e.g. @userinfobot) → TELEGRAM_ALLOWED_USER_ID.
      verify: `curl -s "https://api.telegram.org/bot$TOKEN/getMe"` returns the bot.
- [ ] Create `state/interlocutors.json` from templates/state-schemas.md with Alan's id,
      is_confirmer=true; default_unknown=public+untrusted.
      verify: file parses (jq).
- [ ] Connect channel per Life Engine pattern:
      `claude --channels plugin:telegram@claude-plugins-official` with wake-edgeweaver active;
      complete pairing.
      verify: message from Alan's account gets an in-persona reply; message from ANY other
      account (test with a second account or ask a friend) gets only a brief deferral ("this
      is Edgeweaver's line — I'll let Alan know"), no substantive conversation (audience is
      Alan-only until the village opens in childhood — GROWING §3), sender id logged, Alan
      notified — never treated as Alan.
- [ ] **STOP — gate G4**: Alan picks the teaching emoji. Update TEACHING_EMOJI in the skill.
      Implement: Alan's reaction on a message → that episode gets
      metadata.teaching_moment=true.
      verify: react on a test message → SQL shows the flag on the episode.
- [ ] Waking policy: wakes on (a) inbound messages, (b) calendar events (connect Google
      Calendar MCP per Life Engine), (c) fallback `/loop 3h` (or schtasks equivalent).
      Each wake: read state/expectations.md (until Phase 4 writes it nightly, create a static
      starter version by hand); act only on listed surprises/contradictions or budgeted
      relevance; decrement state/budget.json proactive counter; respect quiet hours.
      verify: a calendar test event triggers a wake; a no-news wake sends nothing.
- [ ] Create `state/theory-of-alan.md` v0 (structure from templates/soulfile-skeletons.md,
      bottom): fill from confirmed lessons only.
      verify: contains zero unconfirmed claims about Alan.
- [ ] **STOP — gate G6**: cost ceiling. Show Alan observed usage so far vs PLAN §10.2 table;
      he sets the monthly number → state/budget.json ceiling_usd; implement soft-warn at 80%,
      degrade at 100% (Haiku checks only, skip optional loops).
      verify: budget.json valid; a simulated 85% spend logs a warning.
- [ ] Confirmation rule (PLAN §7): lesson confirmations accepted only from is_confirmer
      senders; tier changes additionally require out-of-band (a Claude Code session on the
      PC counts as the second channel).
      verify: attempt a confirmation from a non-confirmer id → rejected + logged.
- [ ] **Acceptance week**: run 7 days.
      verify: ≥1 proactive message citing real data that Alan rates useful (log his sentence);
      0 proactive messages violating quiet hours/budget; the spoofed-sender test above passed
      during the week; night-loop-lite kept running throughout.
- [ ] Mark Phase 3 done in ledger. (GROWING note: "First Words" rite is Alan's call when a
      proactive message feels like Edgeweaver — record it in decisions.md rites table when
      declared.)
