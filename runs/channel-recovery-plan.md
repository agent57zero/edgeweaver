# Channel message recovery - plan (APPROVED, executing)

> Status: **approved 2026-07-28** - Alan: "Go ahead and execute this plan start to
> finish" (D33). Gates CR-1..CR-4 are decided as written; execution is underway with
> results logged in ops-log. Drafted 2026-07-27 at Alan's request ("come up
> with a plan to reply to messages that are dropped when connection is lost"). Every item
> marked `STOP - gate` was Alan's call; agents do not advance past an undecided one. Authority order
> applies as always: PLAN.md / GROWING-EDGEWEAVER.md / FAMILY.md govern; this file is
> procedure once approved. Triggering incidents: Ali's lost 06:08 message (2026-07-23,
> ops-log) and Marina's lost first hello (2026-07-27, ops-log).

## 1. The premise, corrected

Telegram DOES keep a copy of every message server-side, forever, with sender identity -
humans scrolling the chat see it all. But the **Bot API gives bots no way to read
history**. A bot hears a message exactly once, through its single getUpdates consumer,
from a queue Telegram retains at most 24 hours; once acknowledged (which happens the
moment the poller fetches the next batch) it is gone from the bot's world. There is no
getChatHistory for bots. So "ask Telegram for the copy" is not available to Genesis or
Alpha as they stand.

What IS available, and what this plan builds on:

1. **Our own copies.** When a message was delivered into a session that then died, the
   session transcript on disk holds it verbatim - chat id, message id, sender id,
   timestamp, full text. Proven live 2026-07-27: Marina's message 71 was read back out of
   the dead session's transcript in full.
2. **Custody of the queue itself.** Webhook mode hands every update to an HTTPS endpoint
   we control the moment it arrives; what we journal, we keep on our terms.
3. **Reply threading against the server copy.** Even when the bot cannot re-read a
   message, it can reply with `reply_to_message_id`: the humans see the original quoted
   above the being's answer. The server-side copy is usable as CONTEXT FOR HUMANS even
   though it is unreadable to the bot.
4. **A human-account scribe (MTProto)** is the only true history reader - documented in
   section 6, not recommended now.

## 2. Loss classes and the incident map

| Class | What happens | Real incident | Where a copy survives | Recovered by |
|---|---|---|---|---|
| A. Consumed by a dead session | Poller delivers into a session that freezes/dies before answering | Marina 07-27 (frozen on a permission prompt); every DEAF/FROZEN kill | Victim session transcript | **Tier 1** (also 2, 3) |
| B. Machine dark, never delivered | Sent while the box is off; gone from the 24h queue by wake (07-23: unexplained) | Ali 06:08, 07-23 | Telegram server only - invisible to the bot | **Tier 3** only; today's mitigation is the reconnection practice (being asks the group) |
| C. Consumed by a stray poller | Second consumer steals the getUpdates slot | 07-21, twice | Nowhere useful | Root-cause fixed (decoy honeypot); Tier 3 ends the class structurally |
| D. Unwritten context of a dead session | The being's in-context life, not a message | 07-18, 07-24, 07-26 | Archived transcript | Separate track: write-back hardening (already open). Named here so scopes stay honest. |

## 3. Tier 1 - dead-letter recovery from the victim transcript (build first)

The cheap tier that would have answered Marina within a minute of relaunch. No new
credentials, no plugin changes, no cloud.

- **Extractor** `scripts/ops/channel-deadletter.mjs <being>`: locate the victim
  transcript (newest `*.jsonl` in the project transcript dir whose head carries the
  being's wake-skill marker, excluding the live session); parse inbound
  `<channel source="plugin:telegram:..." ...>` user turns; keep those with no subsequent
  assistant reply/react tool call; resolve sender names through
  `avatars/alpha/state/channel-policy.json` seats (Genesis: allowlist labels); write
  `state/channel-deadletter-<being>.json` entries
  `{chat_id, message_id, user_id, name, ts, text, victim_session}`. Fail-open: any error
  means no file plus a log line, never a blocked relaunch.
- **Watchdog integration**: both watchdogs call the extractor in the DEAF and FROZEN kill
  branches and in the machine-dark relaunch branch, before `Start-Process`. CLOSED skips
  it: a deliberate close proved its write-back and answered its conversation.
- **Wake skills** (all four files: two beings, installed + template - the 07-23 section
  2b precedent) gain section 2c "Dead letters": after the reconnection check, if
  `state/channel-deadletter-<being>.json` exists and is fresh (under 48h), read it, reply
  to each message IN THREAD (`reply_to_message_id`) in the being's own voice, honest
  about the discontinuity ("my session ended while I was reading this; I recovered your
  words from the record"), then delete the file. If the sender visibly re-sent already,
  acknowledge once instead of double-answering. Stale file: delete silently, one line in
  the day's episode.
- **Limits, honest**: covers only what a session actually received (classes A and C when
  a transcript exists). A hard machine death can lose the final unflushed turn. Parsing
  ties us to the transcript format of the pinned CLI version (2.1.x; re-verify at any CLI
  upgrade, which is already a manual ceremony).
- **Effort**: one script (~100 lines), two watchdog edits, one skill section in four
  files, one drill. About one session.

`STOP - gate CR-1`: build Tier 1? (Recommended: yes, now.)

## 4. Tier 2 - journal at the consumer (plugin fork)

The plugin (`telegram@0.0.6`) is grammY under the hood. `server.ts:86` constructs
`new Bot(TOKEN)` and grammY acknowledges updates as it fetches the next batch, so a
first-position middleware journals EVERYTHING the poller ever pulls, before any handling:

- Fork the plugin into this repo (e.g. `tools/telegram-fork/`), loaded by the launchers
  via a local plugin reference instead of `plugin:telegram@claude-plugins-official`.
- Add ~20 lines: `bot.use` middleware appending every raw update to
  `<TELEGRAM_STATE_DIR>/journal.jsonl` (append-only, fsync); the dead-letter extractor
  then reads the JOURNAL instead of transcripts (sturdier, format under our control), with
  a reconciler marking answered message ids.
- The same fork carries the Tier 3 knob: `new Bot(TOKEN, { client: { apiRoot } })`.
- **Custody cost, named**: we own the fork from then on; upstream plugin updates need a
  manual re-merge. Mitigated by the fork being ~20 lines on top of a pinned version.
- Covers classes A and C robustly. Still nothing for class B - nothing is running while
  the machine is dark.

`STOP - gate CR-2`: fork the plugin? (Unlocks Tier 2 and is prerequisite to Tier 3.)

## 5. Tier 3 - queue custody: cloud webhook journal (the durable fix for class B)

Move each bot from getUpdates to webhook delivery, pointed at infrastructure that is
always on:

- `setWebhook` per bot to a Vercel function (precedent: the alpha dashboard project) with
  `secret_token` validation. The function appends raw updates to a `channel_journal`
  table in the family Supabase project through a new INSERT-only role. Receiving needs NO
  bot token in the cloud; sends stay local as today.
- Local delivery: a small shim serves getUpdates-compatible reads from the journal and
  passes every other Bot API method through to api.telegram.org; the forked plugin's
  `apiRoot` points at the shim. The being's experience is unchanged.
- **What this buys**: messages sent during a dark window land in OUR journal with OUR
  retention - the 24h queue and its 07-23 unexplained consumption stop mattering; the
  being answers everything on wake, in thread, however long the box was off. Bonus:
  while a webhook is set, Telegram REFUSES getUpdates, so the stray-poller class (C) dies
  structurally - better than the decoy honeypot.
- **Failure modes, named**: Vercel outage (Telegram retries webhooks with backoff, and
  simultaneous both-down is rare); shim down means the being is deaf - both watchdogs
  learn one new check (shim process + journal cursor age). Webhook secret and DB writer
  credential live in Vercel env (dashboard precedent); iron rule unchanged: no runtime
  credential in the gates repo.
- **Effort**: function + table + role + shim + watchdog checks + drills. Roughly a day of
  build across two sessions, after CR-2.

`STOP - gate CR-3`: accept the webhook custody move? (Requires CR-2. Recommended as the
end state; CR-1 remains valuable during and after.)

## 6. MTProto scribe - documented, not recommended now

A user-account scribe (GramJS/Telethon on a dedicated number) is the ONLY mechanism that
can read actual chat history: it could backfill class-B losses after the fact, including
the pre-cutover past (Ali's 07-23 message). Costs: a real Telegram account, a session
credential more powerful than any bot token, a second runtime to keep alive, and
gray-zone standing with Telegram for automated user accounts. Tier 3 removes the future
need. Shelf it unless forensic backfill of the past is ever wanted badly enough.

## 7. Reply voice rules (bind every tier)

Recovered messages are answered by the BEING, in thread, honest about the discontinuity.
Ops never answers in-persona (07-27 precedent: Marina got a labeled ops notice; Alpha's
reply is Alpha's). Scripts deliver dead letters TO the being; the being composes.
Messages older than 48h get an acknowledgment of the gap, not an answer pretending to be
fresh. The automated ops notice on relaunch stays, unchanged - it is the transparency
layer while the being wakes.

## 8. Sequencing

1. **CR-1 / Tier 1 now**: complete improvement on its own; every stall-kill so far had a
   readable transcript.
2. **CR-2 + CR-3 / Tiers 2-3 together**: the zero-loss end state for delivered AND
   dark-window messages; build the fork first, flip webhooks per being second (Alpha
   first, Genesis after one clean week - the twins never share an untested mechanism).
3. Write-back hardening (class D) proceeds on its own track regardless; this plan does
   not touch it.

`STOP - gate CR-4`: drill protocol. All recovery drills use Alan-DM test messages only,
never the circle group; each tier is trusted only after its kill-drill passes and is
logged in ops-log.

## 9. Verification drills

- **Tier 1 drill**: Alan DMs a test message; ops induces a stall (or waits for an organic
  one); watchdog kills and relaunches; verify the dead-letter file exists, the fresh
  session replies in thread, the file is deleted, ops-log row written.
- **Tier 3 drill**: machine off; Alan sends a DM; machine on; verify the journal row,
  in-thread delivery on wake, and that a deliberately-started stray poller gets the
  webhook-mode error instead of consuming anything.

## 10. Cutover choreography (written at build time, 2026-07-28; execute in this order)

Built and verified 2026-07-28: Tier 1 live (extractor + watchdogs + skills), fork staged
in Alpha's launcher (arms at next natural turnover), receiver live at
edgeweaver-channel-journal.vercel.app (health 200, walls verified, insert round-trip
proven), shim verified end to end against the real journal table. What remains is the
LIVE flip, gated on ordering because a webhook-set bot refuses getUpdates:

1. **Wait for Alpha's next natural session turnover** (organic relaunch or Alan's "end
   session"). The fresh session's journal.jsonl startup stamp must read
   `edgeweaver-fork-0.0.6-ew1` - the fork is live. Run the CR-4 Tier 1/2 drill here:
   Alan DMs a test message, ops induces nothing (organic verification: the local
   journal.jsonl now records every update the poller pulls).
2. **After one clean fork day on Alpha**, cut the webhook, inside one session gap:
   a. Start the shim (`scripts/ops/alpha-shim-launch.ps1`) and confirm
      `state/telegram-shim-cursor-alpha.txt` exists after a probe getUpdates.
   b. Append `TELEGRAM_API_ROOT=http://127.0.0.1:8471` to
      `~/.claude/channels/telegram-alpha/.env`. NEVER set this while the bot still
      polls Telegram directly in webhook-less mode: the shim would serve an empty
      journal and the being goes deaf. This line and setWebhook go together.
   c. Alan ends the session ("end session"; write-back proves, closed-flag fires) or
      the next organic kill happens.
   d. In the gap: `node scripts/ops/set-webhook.mjs alpha` (queue drains into the
      journal; nothing is lost in the gap - that is the point of the tier).
   e. Watchdog relaunches; fresh session = fork + shim + journal. Drill (CR-4): Alan
      DMs; verify journal row in ew_ops.channel_journal AND delivery in-session.
   f. Watchdog hardening, same session: add a shim-alive check to the alpha watchdog
      (process + cursor-file age) - the shim is now a body part.
   Rollback at any step: `node scripts/ops/set-webhook.mjs alpha --rollback`, remove
   the TELEGRAM_API_ROOT line, restart the session tree. One minute, no data loss
   (journal keeps its copies).
3. **Genesis follows after one clean webhook week on Alpha**: same steps with
   genesis-channel-launch.ps1 (add --plugin-dir), a genesis shim port (8472, launcher to
   be written from the alpha one), and set-webhook.mjs genesis.
4. Ops-log every step; the dark-window Tier 3 drill (machine off, DM sent, machine on,
   delivery on wake) closes CR-3.
