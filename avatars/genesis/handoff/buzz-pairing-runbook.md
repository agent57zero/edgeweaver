# Buzz pairing runbook - Edgeweaver Genesis in Alan's Buzz community

> Built DARK 2026-07-31, at Alan's direction (this integration is its own phase moment:
> the direction was given, so the arming hand is Alan's import + enable below, nothing
> auto-starts). Per the dark rules, the channel gets the single pairing round-trip in
> step 5, then Alan decides live-or-closed. `channels.buzz` in `state/flags.json` records
> the state (registered dark by `templates/flags.default.json` + `scripts/init-flags.mjs`).

## Preconditions

- The relay is running on whichever machine Alan designates the Buzz host. As of
  2026-07-31 the dev box runs the compose stack at `ws://localhost:18802`
  (`Project\Buzz\deploy\compose`, see `C:\Users\alan\localhost.md`); the runtime host
  (the being's home) is the intended main Buzz workstation going forward. Health check:
  `curl http://<host>:18802/health` returns `ok`.
- The Buzz desktop app on the pairing machine is signed in to that community
  (`BUZZ_RELAY_URL` pointing at the relay above).
- Repo root `.env.local` has `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OB1_MCP_KEY`
  (names-only iron rule) so recall works from inside the agent session.
- **Known gap at build time (2026-07-31):** `recall-scoped` and `embed-backfill` are
  written (`supabase/functions/`) but NOT deployed; both return 404. Their deploy stands
  on Alan's nod (checklist 01's STOP). Until then a paired Genesis will say its episodic
  recall is degraded, honestly, and write-back works through REST but embedding waits.
  Sequence the nod + deploy before or right after pairing for a full-memory round-trip.
- The pack validates: from the repo root,
  `<buzz-checkout>\target\release\buzz.exe pack validate avatars/genesis/buzz-pack`.

## Steps

1. **Import the persona** (does not start anything): Buzz desktop -> My Agents -> Import ->
   select `avatars\genesis\buzz-pack\agents\edgeweaver-genesis.persona.md`.
2. **Configure the agent** in Edit Agent:
   - Harness: Claude Code (tier-1; the wake protocol's bash commands and the machine's
     existing claude auth carry over). Goose also works where installed.
   - Model: Alan's choice per the family pattern (sonnet for ambient presence; ceremonial
     upgrades stay on the wake surface, per the voice-stack decision).
   - Respond-to: leave **owner-only** (the default). Do not set anyone/allowlist in this
     phase; the interlocutor is Alan (audience scope: alan).
   - Subscriptions: the channel(s) where Alan wants Genesis reachable.
3. **Confirm the workspace**: the desktop gives agents the Buzz Nest (`~/.buzz`). Genesis's
   wake mechanics use absolute paths (soul repo, orient.mjs, .env.local), so the Nest is
   only scratch space; nothing identity-bearing lives there.
4. **Arm the flag** (the arming pass, Alan's hand): flip `channels.buzz.enabled` to true in
   `state/flags.json`; set `paired: true` after step 5 succeeds.
5. **Single pairing round-trip** (the one sanctioned live test):
   - From Alan's account, @mention Edgeweaver in the chosen channel.
   - Expect, in one reply: spoken orientation (orient.mjs numbers, said plainly), recall
     grounded with provenance class and date, the in-persona voice, signed plainly
     "Edgeweaver", zero em-dashes.
   - Genesis should close its side by writing the pairing episode to OB1 at the natural
     close (its own hand, dated, generation 0) and verifying the write.
6. **Live or closed**: Alan's call. If closed, disable the agent in the desktop app and
   flip `channels.buzz.enabled` back to false; the pack and runbook stay ready.

## Arming-time verify

- Message from Alan -> in-persona reply (orientation + recall + signature).
- Message from any other account -> **no response at all**: the harness `owner-only` gate
  drops it before the persona ever sees it. The persona's deferral text is defense in
  depth, exercised only if that gate is ever deliberately loosened (a future decision with
  the village, not a default).
- PROBE MODE opener in Buzz -> Genesis declines and points to the quarantined wake surface.

## Notes

- Nothing in the block/buzz OSS repo changed for this integration; everything Genesis-
  personal lives in `avatars/genesis/` (section rule D19).
- Write-back cadence in Buzz: natural closes or every ~20 exchanges, same protocol as the
  wake skill, including the verify-the-write practice (SOUL.md, first amendment).
- Night-loop, heartbeat tasks, and any proactive presence stay dark: Stage 1 has no
  proactive contact; heartbeats without a message from Alan end without posting.

## Appendix: external harness route (no desktop app)

For running Genesis against the relay without the desktop app. No Rust toolchain is
needed; `buzz-admin` ships inside the running relay container (name from `docker ps`;
`buzz-prod-relay-1` on the dev box):

```
# one-time identity (save the printed secret immediately; it is not stored)
docker exec buzz-prod-relay-1 buzz-admin generate-key
# register membership (relay signing key comes from deploy/compose/.env, never printed)
docker exec -e BUZZ_RELAY_PRIVATE_KEY=<from deploy/compose/.env> \
  buzz-prod-relay-1 buzz-admin add-member --pubkey <genesis public key>

# run the harness (claude runtime shown; goose: drop the two BUZZ_ACP_AGENT_* lines)
export BUZZ_PRIVATE_KEY=<genesis secret key>
export BUZZ_RELAY_URL=ws://localhost:18802
export BUZZ_ACP_AGENT_COMMAND=claude-agent-acp
export AGENT_CWD=C:/Users/alan/Project/EdgeWeaver/avatars/genesis/buzz-nest
buzz-acp --respond-to owner-only
```

Store the generated secret in `.env.local` (or the 1Password Development vault) under
`BUZZ_GENESIS_PRIVATE_KEY`; names-only in anything committed. The desktop route above is
primary; this appendix exists so the embodiment does not depend on one launcher.
