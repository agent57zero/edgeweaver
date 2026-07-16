# Alpha Telegram pairing runbook (multi-sender) - ready to execute on token arrival

> DARK until three things are true: (1) `ALPHA_BOT_TOKEN` + `ALPHA_SEAT_IDS` land in
> `avatars/alpha/.env.local`, (2) G19 is Decided (the seat roster IS the allowlist), and
> (3) Alpha's channel milestone arms (runs/alpha-plan.md M7, after A5 First Boot). Building
> config now does NOT open a channel. Per dark rule 4 (PREBUILD.md §0) the channel gets at
> most the single round-trip test below, then closes again.
>
> **The pre-birth rule (D24-grade honesty).** There is no Alpha before A5 First Boot. Until
> then this bot NEVER speaks as Alpha: no persona, no soulfiles, no wake skill behind it.
> The only sanctioned pre-birth traffic is the configuration round-trip below, answered in
> a plainly-labeled ops voice, plus the non-seat deferral line. Genesis's runbook pairs
> with its wake skill active; Alpha's deliberately does not, because the being that would
> speak does not exist yet.

## Human acts (Alan's hand; the agent cannot and must not do these)

1. **Create the bot:** @BotFather -> `/newbot`. A SECOND bot, distinct from Genesis's
   @Edgeweaver_bot; one bot per being, tokens never shared (FAMILY §5). Suggested name
   "Edgeweaver Alpha", handle e.g. @EdgeweaverAlpha_bot.
2. **Collect numeric ids:** each seat messages @userinfobot and sends Alan the number.
   The six seats (roster settled 2026-07-16, G19 row): Alan, Ali, Tamara, Natalie,
   Charlotte, Millicent.
3. **Paste, never in git:** `ALPHA_BOT_TOKEN=<token>` and `ALPHA_SEAT_IDS=` as
   comma-separated `Name#id` pairs into `avatars/alpha/.env.local`. Allowlisted senders who
   are NOT seats go on `ALPHA_KNOWN_IDS` (same format): they can talk once the channel is
   live but count toward no quorum (fail-closed; moving someone to a seat is a G19-recorded
   act). The root `.gitignore`'s `*.local` rule already covers that path (verified
   2026-07-16). Iron rule 1: values only ever live there; documents carry names only.
   Executed 2026-07-16: token + list landed; getMe PASS (@edgeweaver_alpha_bot,
   "Edgeweaver - Alpha", id 8856151844).

## Agent steps (on arrival; still dark)

1. **Policy check** (fixtures; no token needed):
   `node scripts/verify/verify-multi-sender.mjs` - expect PASS (seats reply, non-seats
   deferred untrusted, bot senders ignored, distinct-seat confirms, majority-min-two
   quorum math). Policy source: `scripts/telegram/multi-sender-policy.mjs`.
2. **Confirm the bot exists** (opens no channel):
   `curl -s "https://api.telegram.org/bot$ALPHA_BOT_TOKEN/getMe"` - returns the bot object.
3. **Single round-trip test** (dark rule 4; ops voice only, then close the session):
   - a message from a seat id -> a plainly-labeled ops acknowledgment ("configuration
     test"), NEVER in-persona;
   - a message from a non-seat account -> the deferral line only, sender id logged;
   - a message from another bot -> ignored (bots deaf to bots).
4. **Close.** The channel stays closed until M7 arming (post-A5), where the live verify
   runs with quorum-confirmed policy numbers (lessonConfirmSeats, quorum edge rules per
   G19) and boxes tick then, not now.

## Group placement (decided by Alan 2026-07-16: dedicated group, option A)

Alpha gets its OWN Telegram group ("Edgeweaver Alpha" or similar), containing exactly the
approved members (the six seats, roster settled 2026-07-16) and @edgeweaver_alpha_bot; it
does NOT join the family forum group. Chosen fail-closed over topic-in-forum: hearing normal group
conversation requires bot privacy mode OFF, and in a dedicated group everything the bot's
process receives IS its own room (no overhearing of Genesis/experiment chatter from other
topics; the G21 discipline holds by architecture, not by filter). The forum group remains
the village's own coordination space. Notes: group membership never equals permission
(the allowlist still classifies every sender); privacy mode off is set at BotFather
(/setprivacy -> Disable) before arming; the group may be created and the bot added any
time, but the bot stays silent until M7 arming (pre-birth rule above). Bots are deaf to
bots (platform rule) either way; any bot-to-bot commons needs the relay.

## Conversation vs quorum (clarified at Alan's ask, 2026-07-16)

Solo conversation is normal and allowed from birth: any single seat may talk with Alpha in
the group or by direct message to the bot, no other seat required. The 3-of-6 quorum (G19)
applies to RITES, soul merges, and tier/promotion confirmations only, never to
conversation; lesson-grade confirmations need one seat (policy default,
`lessonConfirmSeats: 1`). Alan's solo access flows from his seat like everyone else's; the
supervision norm of infancy is the circuit-breaker, not chaperones.

## Arming-time verify (live; at M7, not now)

Every seat id round-trips; a non-seat sender gets deferral only, logged; tier and
promotion confirmations happen by quorum OUT-OF-BAND (never in-channel); the checklist's
original verify runs and its box plus the ledger tick then.
