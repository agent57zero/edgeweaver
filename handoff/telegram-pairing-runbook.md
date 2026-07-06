# Telegram pairing runbook (A8) - ready to execute on token arrival (B4)

> DARK until two things are true: (1) `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_USER_ID` land in
> `.env.local` (Bucket B4), and (2) Phase 3 arms. Building the config now does NOT open the
> channel. Per the dark rules, the channel gets at most the single pairing round-trip below, then
> closes again until Phase 3 activation. No live presence before its phase.

## Preconditions
- `.env.local` has `TELEGRAM_BOT_TOKEN` (from @BotFather) and `TELEGRAM_ALLOWED_USER_ID` (numeric,
  from @userinfobot). Names only ever live in `.env.local` (iron rule 1).

## Steps
1. **Rebuild interlocutors with the real id** (replaces the `ALAN_ID_PENDING` placeholder):
   ```
   node scripts/telegram/init-interlocutors.mjs
   node scripts/verify/verify-telegram.mjs      # expect PASS
   ```
2. **Confirm the bot** (does not open a channel):
   ```
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"   # returns the bot object
   ```
3. **Arm the flag** (Phase 3 arming pass only - NOT during the dark build):
   flip `channels.telegram.enabled` in `state/flags.json`, set `paired:true` after step 4.
4. **Single pairing round-trip** (the one sanctioned live test, then close the session):
   - Connect per the Life Engine recipe: `claude --channels plugin:telegram@claude-plugins-official`
     with the wake-edgeweaver skill active.
   - From Alan's account: a message gets an in-persona reply.
   - From ANY other account: only the brief deferral (`channel-policy.js` `DEFERRAL_MESSAGE`),
     sender id logged, Alan notified, never treated as Alan.
   - Close the channel session. It stays closed until Phase 3 arms for real.

## Arming-time verify (live; at Phase 3, not now)
- Message from Alan -> in-persona reply; message from a second account -> deferral only, logged.
- This is checklist 03's original verify; ticking its box + the §1 ledger happens then, not here.
