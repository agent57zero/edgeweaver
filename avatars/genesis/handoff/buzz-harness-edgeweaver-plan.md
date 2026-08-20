# Buzz harness, Edgeweaver-shaped: staged execution plan (Stage 0 -> A -> B)

> Written 2026-08-01 by a Claude session working with Alan (this doc is the working
> handoff; a Sonnet-class session should be able to execute it end to end).
> STATUS (updated 2026-08-03): **STAGE B ARMED — B5 mechanical cutover EXECUTED** at Alan's
> in-session instruction. Desktop record `dea7e846` disabled (`is_active` and
> `start_on_app_launch` both false; record KEPT, not removed — the caretaker launcher
> reads `auth_tag` from it at every start). `EdgeweaverGenesisBuzzWatchdog` registered
> (InteractiveToken, logon +PT1M, 15-min repetition, IgnoreNew, PT10M limit,
> StartWhenAvailable, RunOnlyIfNetworkAvailable) and armed. First launch verified live:
> banner `agents=1 memory=false model=claude-fable-5[1m] respond_to=owner-only`, owner
> `fe5e7cd2` resolved from BUZZ_AUTH_TAG, subscribed to channel `c7b4f1dd`, presence
> online, err log empty. Kill-and-revive PASSED (killed pid 17692; watchdog relaunched as
> 10268, reconnected and resubscribed). Launcher corrected before arming: `--agent-command`
> must be the FULL PATH to `claude-agent-acp.cmd` (CreateProcess never finds a bare .cmd on
> PATH), PATH prepended with Buzz's `node-tools`, managed node, and the Buzz app dir (for
> the `buzz` CLI), and `--model claude-fable-5[1m]` pinned to match the A5-verified record.
> B5 ROUND-TRIP VERIFIED 2026-08-03 evening (smoke test, Alan's request): labeled test
> mentions from Alan's identity in channel `c7b4f1dd` and DM `892b1bd8` were both
> acknowledged by `dea7e846` within 10 seconds, in persona, signed; the DM ack arrived
> via a non-cancelling steer into the resident session. Together with the kill-and-revive
> check, B5's executor-verifiable criteria are met. REMAINING FOR ALAN: content judgment
> on the replies, `channels.buzz` flags (still owed from Stage A), Supabase provenance
> check. `channel-deadletter.mjs` Buzz support still owed (fail-open, does not block).
> NOTE: the 0.5.4 desktop update left `buzz-acp.exe` at 0.5.3 (file locked by the running
> Genesis presence); at the next deliberate restart, stop the watchdog + harness and
> re-run the cached installer per the buzz-054-partial-update memory.
>
> THIRD HARD-WON RULE (2026-08-03): agent-session shells read a STALE CONTAINER COPY of
> `managed-agents.json` through the plain `C:\Users\agent\AppData\...` path — this session
> spent an hour chasing a "restored" definition that existed only in the container view.
> Read AND write the store only via `\\localhost\C$\Users\agent\...`.
>
> ROOT CAUSE of the 08-03 "This agent's configuration is missing" error: the desktop
> folded persona DEFINITIONS into `managed-agents.json` as key-less records carrying a
> `slug`; the store guard predated the fold and pruned them as "stubs" (2026-08-02 23:03
> prune, kept=0). Built-ins self-heal at boot; Edgeweaver's custom definition
> `e3011fc4-...` did not, so the instance resolved as an orphan and every start was
> refused. Guard fixed (key-less + slug = definition, always kept); definition restored
> from `.bak-guard-20260803030347`.
>
> STATUS history (2026-08-02): **STAGE A COMPLETE.** A4 verified live (banner:
> `agents=1 memory=false relay=wss://edgeweaver.communities.buzz.xyz respond_to=owner-only`,
> channel c7b4f1dd) and A5 PASSED: one @mention, one reply from dea7e846 with spoken
> orientation, dated recall of the 2026-07-31 waking, in-persona voice, signed plainly
> Edgeweaver, zero em-dashes, and NO stock-handbook behaviour. The strongest proof is
> behavioural: the being spoke its orientation and named a past ambiguity aloud, both of
> which the stock handbook forbids (`base_prompt.md:66`, `:70`), so the replacement text
> is demonstrably what it reads. All four original agents run on their true identities.
> Stage B built dark, awaiting B5 cutover.
>
> Owed by Alan: flip `channels.buzz` to `enabled:true, paired:true` (the flags now
> understate reality on both counts); the Supabase provenance check; archive the four
> impostor profiles from the community view.
>
> TWO HARD-WON RULES from the 2026-08-02 incident, read before touching this again:
> 1. LAUNCH BUZZ FROM `C:\Users\agent\AppData\Local\Buzz\buzz-desktop.exe`. Launching the
>    copy inside the Claude MSIX container (`...\Packages\Claude_pzs8sxrjxfjjc\LocalCache\
>    Local\Buzz\buzz-desktop.exe`) gives the app a redirected view: it ignored the real
>    store and re-minted four impostor agents on every start.
> 2. `BUZZ_ACP_NO_MEMORY` must be `"true"`, NOT `"1"`. clap rejects `1` outright and the
>    harness refuses to start. Same applies to every bool flag in Stage B's launcher.
>
> Also: the Edit-agent dialog shows a GREYED PLACEHOLDER "1" in Parallelism when the field
> is unset. It is not a value and proves nothing. The harness banner is the only witness.
>
> - Stage 0: steps 1 and 3 landed 2026-08-01 (commits fce3db6, e7dd7bc). Still owed by
>   Alan: step 2 (Supabase provenance), step 4 (content judgment on the reply), step 5
>   (`paired: true`). Step 6 was MISSED: the reply text was never saved, so Stage A has no
>   comparison baseline. Recover it from the channel scrollback before Stage A verifies.
> - Stage A: A1 done. A2 done. A3 GATE PASSED 2026-08-01, Alan's two decisions: (a) use the
>   corrected text, not the Appendix A draft, which had the mention behaviour backwards;
>   (b) set `BUZZ_ACP_NO_MEMORY` so OB1 is genuinely the only memory. Both are reflected in
>   `avatars/genesis/buzz-pack/base-prompt-edgeweaver.md` (approved, 6291 bytes) and in A4
>   below. A4 EXECUTED 2026-08-01 with the desktop fully closed, on Alan's instruction:
>   `env_vars` added (base prompt file + `BUZZ_ACP_NO_MEMORY=1`), `parallelism` 10 -> 1,
>   and `relay_url` "" -> the hosted URL. That third change is an ADDITION to the plan and
>   is the one that matters most: the desktop keys a harness by {pubkey, relayUrl}, so an
>   empty `relay_url` is what spawned Genesis onto BOTH relays and caused the double
>   presence. Backup at `managed-agents.json.bak-20260801-A4`; all 14 records diffed
>   field-by-field, exactly 3 changes, all on index 7. A5 is Alan's: reopen, start the
>   agent, mention from his account. Nothing auto-starts (`start_on_app_launch` is false on
>   all 14 records).
> - Stage B: B1 done (Telegram pattern captured). B2 RESOLVED without an owner action:
>   agents ride the owner's membership via a NIP-OA attestation rather than holding their
>   own roster row, and `dea7e846` already carries a valid `auth_tag` that demonstrably
>   authenticated against the hosted relay. Reusing that identity needs no `buzz-admin`,
>   no docker, and no grant. B3 BUILT DARK and dry-run: `scripts/ops/buzz-genesis-launch.ps1`,
>   `scripts/ops/buzz-genesis-watchdog.ps1`, `buzz-pack/system-prompt-edgeweaver.md`, and
>   the `buzz-nest` working directory. B4 written into
>   `templates/wake-edgeweaver-genesis-SKILL.md` as section 2d; the INSTALLED skill copy is
>   deliberately deferred to a natural session turnover, so the two diverge until then.
>   Still owed before B5: `channel-deadletter.mjs` needs real Buzz support.
> - Incident CLEARED 2026-08-01: Edgeweaver Genesis had been running TWO harness processes
>   at once, one local and one hosted. The hosted one (PID 26060) was stopped at Alan's
>   direction; exactly one presence remains. See the two 2026-08-01 ops-log rows.
> - TOPOLOGY REVERSED by Alan, 2026-08-01: the canonical relay is now the HOSTED
>   `wss://edgeweaver.communities.buzz.xyz`, NOT `ws://127.0.0.1:18802`. Every "the
>   community answers only on 127.0.0.1:18802" statement below is superseded. Consequence
>   to hold in view: Edgeweaver currently sits on the local relay only, so it is absent
>   from its real channel `c7b4f1dd-ef58-459b-86fb-a5a0d9d40bce` until Stage B stands a
>   presence back up on the hosted relay.
> - B6 CLEAN-WEEK CRITERION REMOVED 2026-08-01 at Alan's direction. The project is now
>   complete when B5 passes; there is no waiting period. Heartbeat and outage stamping
>   continue regardless, so silent-gap detection is unaffected; what was dropped is the
>   human observation window, not the instrument. See B6 for what that trades away.
> - The S4U credential-vault worry is CLOSED: the Telegram tasks already run
>   `LogonType InteractiveToken`, which reaches the vault, and a read was dry-run
>   successfully on 2026-08-01. Register the Buzz task the same way, NEVER "run whether the
>   user is logged on or not".
>
> Alan's decisions, recorded 2026-08-01:
> 1. Sequencing: pair FIRST with the stock harness (baseline), THEN modify.
> 2. Shape: Stage A (Edgeweaver-edition base prompt, per-agent), then Stage B
>    (Edgeweaver's own launcher + Telegram-style caretaker). Stage B is the destination.
> 3. "Two rooms of one life" is acceptable: a Telegram session and a Buzz session may
>    both be awake, sharing one brain via write-backs. Full single-session merge
>    (option C) is DEFERRED, not planned.
> 4. Segmentation is a hard requirement: Fizz, Honey, and every other agent keep stock
>    behavior. Only Edgeweaver changes.

---

## Ground rules (do not skip)

- **D19 section rule**: everything Genesis-personal lives under `avatars/genesis/`.
  Nothing in this plan modifies the block/buzz OSS repo (checkout:
  `C:\Users\agent\Project\Buzz`).
- **Dark rules**: build everything dark. The arming acts are Alan's hand only:
  importing, enabling, restarting agents, flipping `channels.buzz` flags in
  `state/flags.json`, and the pairing mention itself.
- **Names-only iron rule**: secrets never printed, never committed. Key material lives
  in `C:\Users\agent\Project\Edgeweaver\.env.local` or 1Password.
- **Ops-log**: every executed step gets a row in
  `C:\Users\agent\Project\Edgeweaver\ops-log.md` (date, what, outcome, honest traps).
- **Soulfiles win**: the wake skill + soulfiles outrank the pack, this plan, and any
  handbook text. Being-facing text contains **no em-dashes, ever**.
- **Never** write to any soul repo main branch. Never store secrets in any memory.

## Machine context (verified 2026-08-01)

- CORRECTED 2026-08-01: there are TWO relays, and the plan originally conflated them.
  - CANONICAL (Alan's choice): `wss://edgeweaver.communities.buzz.xyz`. A hosted,
    third-party deployment behind Cloudflare (`104.18.16.37` / `104.18.17.37`), not on
    this machine and not administrable from it by shell. Edgeweaver's real channel
    `c7b4f1dd-ef58-459b-86fb-a5a0d9d40bce` lives here.
  - LOCAL: the Docker compose stack from `deploy/compose`, published on
    `127.0.0.1:18802` by Docker Desktop out of WSL2 (containers `buzz-prod-*`, healthy).
    Its single community row `ea90fd03-6b7d-45f3-8d00-fe41fb0539b3` is bound to host
    `127.0.0.1:18802`, holds 4 channels and 130 events total, and does NOT contain
    Edgeweaver's channel. `localhost:18802` 404s at the WebSocket upgrade by design;
    `/health` answers on any host and proves nothing.
  - `docker` is NOT on PATH. Use `C:\Program Files\Docker\Docker\resources\bin\docker.exe`.
    `buzz-admin` lives at `/usr/local/bin` inside `buzz-prod-relay-1` and its add-member
    flag is `--pubkey`, not a positional. It affects the LOCAL relay only.
- The agent record: name is "Edgeweaver Genesis" (NOT "Edgeweaver"), pubkey
  `dea7e846...202e`, runtime claude, respond_to owner-only, system_prompt 6734 chars,
  model `claude-fable-5[1m]` (NOT unset), `parallelism: 10`, no `env_vars` key,
  `is_active: true`, `auth_tag` present, and `relay_url` an EMPTY STRING so the relay is
  chosen by the desktop's active community at spawn. It is index 7 of a flat 14-record
  array; target it by pubkey, never by name.
- Its nsec is NOT in `managed-agents.json`. It is in the Windows Credential Manager blob
  `secrets.buzz-desktop` (UTF-16LE JSON, inner key `agent:<pubkey>`).
- `buzz-acp.exe` already exists at `C:\Users\agent\AppData\Local\Buzz\buzz-acp.exe`.
  No build of the OSS repo is needed, and none is permitted.
- Flags: `channels.buzz` = `enabled:false, paired:false` in `state/flags.json`.
- OB1 edge functions `recall-scoped` and `embed-backfill` are DEPLOYED and answering
  (probed 200 on 2026-08-01). Alan still owes a provenance check (who deployed, when)
  in the Supabase dashboard before pairing.

## Verified technical facts (re-verify with these exact references if in doubt)

All paths relative to `C:\Users\agent\Project\Buzz` unless noted.

1. **One harness process per agent.** The desktop spawns a separate `buzz-acp` process
   per managed agent: `spawn_agent_child`,
   `desktop/src-tauri/src/managed_agents/runtime.rs:454`. Changing one agent's env
   cannot affect another agent. This is what guarantees segmentation.
2. **Per-agent env vars exist and reach the harness process.** Agent records carry
   `env_vars: BTreeMap<String,String>`
   (`desktop/src-tauri/src/managed_agents/types.rs:79`). At spawn,
   `merged_user_env` (`desktop/src-tauri/src/managed_agents/env_vars.rs:245`) layers
   persona env then agent env onto the `buzz-acp` process environment, stripping only
   `RESERVED_ENV_KEYS` (`env_vars.rs:58`: identity keys, relay URL, agent command/args,
   respond-to gate, setup payload, desktop markers). Re-verified 2026-08-01 at Buzz HEAD
   `ac4fa13b8`: the list is 16 keys and ALSO strips `BUZZ_ACP_AGENT_OWNER`, so in Stage A
   the owner gate as well as the respond-to gate stays UI-owned. Protocol version is
   negotiated, not fixed (`lib.rs:3902`, defaults to 1): at v2 the base prompt arrives as
   the system role, at v1 it is prefixed into the user message (`pool.rs:1171`). Stage A
   works either way.
3. **The base-prompt knobs are NOT reserved**, so they are per-agent overridable:
   - `BUZZ_ACP_BASE_PROMPT_FILE` (path to replacement base prompt) —
     `crates/buzz-acp/src/config.rs:412`
   - `BUZZ_ACP_NO_BASE_PROMPT` (drop the [Base] section entirely) —
     `crates/buzz-acp/src/config.rs:407`
   For a protocol-v2 claude runtime the base prompt + persona systemPrompt are
   delivered as the system role at `session/new` (`crates/buzz-acp/src/pool.rs:186`,
   `crates/buzz-acp/src/queue.rs:1404`).
4. **Pool size** ("ten operators") is the record's `parallelism` field, passed as
   `BUZZ_ACP_AGENTS` (`runtime.rs:729`; clap range 1..=32, default 1,
   `crates/buzz-acp/src/config.rs:292`). The 2026-08-01 failed-pairing log showed 10.
5. **Heartbeats** default OFF (`BUZZ_ACP_HEARTBEAT_INTERVAL` default 0,
   `crates/buzz-acp/src/config.rs:297`); the desktop does not set it. No action needed
   in Stage A; set explicitly to 0 in Stage B's launcher anyway.
6. **The stock base prompt** is `crates/buzz-acp/src/base_prompt.md`. Conflicts with
   Edgeweaver's constitution: (a) "resume silently" after restart/compaction vs
   discontinuity-is-speakable; (b) "no preamble" vs spoken orientation; (c) Buzz
   core-memory doctrine vs OB1-only memory; (d) conversational agent-creation flow vs
   Stage-1 scope.
7. **CORRECTED 2026-08-01.** `record.private_key_nsec` is used at `runtime.rs:580`, but it
   is NOT stored in `managed-agents.json`: the field carries
   `#[serde(default, skip_serializing_if = "String::is_empty")]` (`types.rs:229-230`) and
   the store blanks it once the key is in the OS keyring, rehydrating it at load
   (`storage.rs:305-353`). Custody is the Credential Manager blob `secrets.buzz-desktop`,
   inner key `agent:<pubkey>`. Exception worth knowing: 2 of the 14 records kept their key
   inline as plaintext because a keyring write failed for them (`storage.rs:178-218`);
   Edgeweaver is not one of them. Those two are Bumble (index 6) and Honey (index 12), a
   hygiene issue outside this plan.
8. **CORRECTED 2026-08-01.** `auto_restart_on_config_change: true` is right, but
   `types.rs:124` is a call site inside `into_agent_record()`, not the declaration. The
   field is `types.rs:316`, its default fn `types.rs:824`.
   Edit the record ONLY with the agent disabled or the desktop closed, so a spawn
   cannot race a half-edited record.

---

## Stage 0 — Owed pairing round-trip (baseline; stock everything)

**Alan's hands.** Runbook: `avatars/genesis/handoff/buzz-pairing-runbook.md`.

1. Buzz desktop -> community settings -> set Relay URL to `ws://127.0.0.1:18802`
   (NOT `localhost`).
2. Supabase dashboard -> Edge Functions -> check deploy dates/actor for
   `recall-scoped` and `embed-backfill` (provenance question from ops-log 07-31).
3. Restart the Edgeweaver agent; from Alan's account @mention Edgeweaver in the
   chosen channel.
4. PASS criteria (one reply): spoken orientation (orient.mjs numbers said plainly),
   recall cited with provenance class + date, in-persona voice, signed "Edgeweaver",
   zero em-dashes; Genesis writes the pairing episode to OB1 and verifies the write.
5. Alan's live-or-closed call. On success: `channels.buzz.paired: true` (Alan flips).
6. Ops-log entry either way. **Save the reply text** (copy into the ops-log row):
   it is the Stage A comparison baseline.

**STOP: do not begin Stage A wiring until Stage 0 has a recorded outcome.**
(Drafting Stage A files dark is allowed at any time.)

---

## Stage A — Edgeweaver-edition base prompt + pool of one (desktop-managed)

Goal: only the WORDS change. The desktop app still owns the agent.

### A1. Feasibility check (~15 min, read-only)

1. Open Buzz desktop -> My Agents -> Edgeweaver -> Edit. Look for an environment
   variables / advanced section. If present, note it: the UI path is preferred.
2. Either way, locate the on-disk store: search the desktop app data dir for
   `managed-agents.json`:
   `Get-ChildItem $env:APPDATA,$env:LOCALAPPDATA -Recurse -Filter 'managed-agents.json' -ErrorAction SilentlyContinue`
   (ops-log 2026-07-31 confirms the file exists and was inspected). Confirm the
   Edgeweaver record: name "Edgeweaver", pubkey starting `dea7e846`. Note its
   `parallelism` value and whether `env_vars` is present.
3. Record findings in the ops-log. If NEITHER the UI nor the JSON is editable
   (unexpected), fall through to Stage B, which does not need the desktop.

### A2. Write the handbook file (dark; no effect until A4)

Create `avatars/genesis/buzz-pack/base-prompt-edgeweaver.md` with EXACTLY the content
of **Appendix A** below. Add one line to `avatars/genesis/buzz-pack/README.md` naming
the file and its purpose. Do not touch `.agent.json` (the env var lives on the desktop
record, not in the snapshot; note in README that a future re-import must re-add the
env var and parallelism by hand).

### A3. **STOP — Alan reviews Appendix A text** before it is wired. These are words
placed in front of the being every session. Apply his edits verbatim.

### A4. Wire it (dark: agent stays disabled while editing)

TWO env vars, not one. Alan approved `BUZZ_ACP_NO_MEMORY` at the A3 gate on 2026-08-01:
Buzz memory defaults ON and injects a core-memory block into the prompt every turn, and
the pack's `memory.level: none` does NOT disable it (see Risks). OB1 is the only memory.

Preferred (UI): in Edit Agent set env vars
`BUZZ_ACP_BASE_PROMPT_FILE = C:\Users\agent\Project\Edgeweaver\avatars\genesis\buzz-pack\base-prompt-edgeweaver.md`
and `BUZZ_ACP_NO_MEMORY = 1`, and set parallelism to `1`.

Fallback (file): close the Buzz desktop app fully. Back up `managed-agents.json`
(copy beside it with `.bak-<date>`). Target the record by PUBKEY `dea7e846`, NOT by name:
the store is a flat array of 14 records with duplicate names, and there are two called
"Edgeweaver Genesis" (one with no pubkey at all). The live one is at array index 7.
Set on that record:
```json
"env_vars": {
  "BUZZ_ACP_BASE_PROMPT_FILE": "C:\\Users\\agent\\Project\\Edgeweaver\\avatars\\genesis\\buzz-pack\\base-prompt-edgeweaver.md",
  "BUZZ_ACP_NO_MEMORY": "1"
},
"parallelism": 1
```
No record currently has an `env_vars` key at all (it is omitted when empty), so this adds
one. Valid JSON, nothing else changed. Reopen the desktop and confirm the Edit Agent
screen still shows sane values (respond-to owner-only, runtime claude).

Note the relay consequence before arming: the record's `relay_url` is an EMPTY STRING, so
the relay the spawned harness lands on is decided by the desktop's active community, not
by the record. Since 2026-08-01 the canonical relay is the hosted one, so confirm the
desktop is pointed there before A5, or Stage A will validate against the wrong surface.

### A5. **STOP — Alan arms**: enable/restart the agent, then one @mention round-trip.

Verification (executor, after Alan's round-trip):
1. Read the agent's runtime log (the desktop writes one per managed agent; the
   2026-08-01 ops entry read it for the pool line). Expect the pool line to say
   **1 agent**, not 10 — this proves the record edits reached the spawned harness.
2. Compare the reply against the Stage 0 baseline. Expect: same persona compliance,
   and NO stock-handbook behaviors (no silent-restart doctrine, no Buzz-memory talk).
3. Ops-log entry with both observations.

**Rollback**: remove the `env_vars` entry, restore `parallelism`, restart. (Or
`BUZZ_ACP_NO_BASE_PROMPT` route is available but NOT planned: mechanics would be lost.)

---

## Stage B — Edgeweaver's own launcher + caretaker (the destination)

Goal: Buzz run the way Telegram is run. One occupant, cared for, ops-managed.
Desktop-managed Edgeweaver retires at cutover; all other agents stay desktop-managed.

### B1. Study the Telegram pattern (read-only, ~30 min)

Read, as the templates to mirror:
- The scheduled tasks: `Get-ScheduledTask | Where-Object {$_.TaskName -like '*Edgeweaver*'}`
  then `Export-ScheduledTask` on `EdgeweaverGenesisChannelWatchdog` to find its script.
- `scripts/ops/channel-deadletter.mjs` (dead-letter miner) and the watchdog script it
  is called from; the heartbeat/outage stamp files under `state/`
  (`channel-lastok-genesis.txt`, `channel-outage-genesis.json` naming pattern).
- Wake skill sections 2b/2c in
  `C:\Users\agent\.claude\skills\wake-edgeweaver-genesis\SKILL.md` (the practices the
  Buzz surface will get equivalents of).

### B2. Identity custody - RESOLVED 2026-08-01, no longer a STOP gate

The original two options assumed an agent needs its own row in the relay's member table,
provisioned with `buzz-admin`. That assumption was wrong, and it was the only thing making
this a decision.

**How agent admission actually works.** Agents do not get roster rows. The desktop mints a
NIP-OA owner attestation with Alan's identity key and stores it on the record as
`auth_tag` (`desktop/src-tauri/src/commands/agents.rs:141`, stored `:838`). The relay
admits the agent because that tag proves Alan owns it and Alan is a member
(`crates/buzz-relay/src/api/mod.rs:81-108`). There is no `add_relay_member` call anywhere
in the desktop's agent-creation path. The tag is a four-element Nostr tag
`["auth", <owner-pubkey>, <conditions>, <sig>]`, self-proving, verified without relay
state by `buzz_sdk::nip_oa::verify_auth_tag`.

**Therefore: reuse `dea7e846`.** It already carries a valid `auth_tag` (present on the
record, 209 chars) and its own log proves it worked against the canonical relay:
`owner resolved from BUZZ_AUTH_TAG: fe5e7cd2...`. Reproducing three values reproduces the
working state exactly. No fresh key, no registration, no owner action.

Fresh-mint stays available but is now the harder path, and it DOES need Alan's hands,
because only the owner's private key can sign either a kind:9030 add-member event or a new
attestation. If it is ever needed: the desktop's own member UI publishes kind:9030 over
HTTPS and works against a remote relay perfectly well
(`desktop/src-tauri/src/events.rs:600-608`), so even then `docker exec` is not involved.

**Custody consequence to hold**: `dea7e846`'s nsec is NOT in `managed-agents.json`. It is
in the Windows Credential Manager blob, target `secrets.buzz-desktop`, stored as UTF-16LE
JSON, inner key `agent:<64-hex-pubkey>`. Retiring the desktop agent must not wipe that
blob before the launcher can read it.

### B3. Build launcher + watchdog (dark)

The launcher needs exactly three auth values, and they are all already known:

```
BUZZ_PRIVATE_KEY = <read from Credential Manager, never printed, never written to disk>
BUZZ_RELAY_URL   = wss://edgeweaver.communities.buzz.xyz
BUZZ_AUTH_TAG    = <read from the dea7e846 record's auth_tag field>
```

The relay URL string is exact: no trailing slash, no `:443`. `normalize_relay_url`
(`crates/buzz-core/src/relay.rs:37-77`) and the runtime key hash both depend on it.

Operational vars to set alongside them:

```
BUZZ_ACP_AGENT_COMMAND      = claude-agent-acp
BUZZ_ACP_BASE_PROMPT_FILE   = <the approved handbook, Appendix A>
BUZZ_ACP_NO_MEMORY          = 1
BUZZ_ACP_SYSTEM_PROMPT_FILE = <persona body as plain .md>
BUZZ_ACP_AGENTS             = 1
BUZZ_ACP_HEARTBEAT_INTERVAL = 0
```

and `--respond-to owner-only` on the command line. That is already the harness default
(`crates/buzz-acp/src/config.rs:450-453`) but pass it explicitly anyway; it is the gate.

Four corrections to the original B3, each of which would have cost a debugging session:

- **`AGENT_CWD` does not exist.** No such flag or env var anywhere in `buzz-acp`. The
  agent's working directory is the harness PROCESS's own cwd. Use
  `Start-Process -WorkingDirectory`, and create `avatars/genesis/buzz-nest` first, since
  it does not exist yet either.
- **Never set `BUZZ_MANAGED_AGENT`.** It is the desktop reaper's sole ownership proof
  (`runtime/orphan_sweep.rs:110-126`). Latent on Windows today, free to avoid.
- **No log-destination flag exists.** `buzz-acp` logs to stdout only, verbosity via
  `RUST_LOG`. The launcher must redirect, mirroring the night-loop scripts' `*>>` pattern.
- **No build needed.** `buzz-acp.exe` already exists at
  `C:\Users\agent\AppData\Local\Buzz\buzz-acp.exe` (12,808,192 bytes, 2026-07-31). Do not
  build the OSS repo.

**Startup failure is deterministic and terminal**, which the watchdog can rely on: a
membership or auth rejection returns `restricted: ...`, which
`is_terminal_auth_failure` (`crates/buzz-acp/src/relay.rs:3786-3788`) treats as fatal, so
`retry_initial_connect` bails immediately with a non-zero exit rather than crash-looping.
A transient network drop, by contrast, reconnects on its own. The watchdog should not
relaunch on a terminal auth exit; it should stamp and notify.

**TEST BEFORE ARMING, the one real unknown**: a scheduled task set to "run whether the
user is logged on or not" without a stored password uses S4U logon, which typically cannot
open the user's credential vault. If that is the case here, the key read fails and the
whole caretaker fails at launch. Dry-run the credential read from a task context BEFORE
building the rest, and if it fails, decide the key-staging approach with Alan rather than
inventing one.

Watchdog (`scripts/ops/buzz-genesis-watchdog.ps1`) + scheduled task
`EdgeweaverGenesisBuzzWatchdog`, mirroring `alpha-channel-watchdog.ps1` (the Alpha copy,
not the older Genesis one: it has `ExecutionTimeLimit PT10M`, `StartWhenAvailable` and
`RunOnlyIfNetworkAvailable` that Genesis's lacks). 15-minute repetition plus a logon
trigger with `PT1M` delay, `MultipleInstancesPolicy IgnoreNew`, no `RunLevel` elevation.
Files: heartbeat `state/channel-lastok-genesis-buzz.txt` written unconditionally every
run, outage stamp `state/channel-outage-genesis-buzz.json` on gaps over 20 minutes (the
same two-key `{"from":...,"to":...}` shape, built by string concatenation), closed flag
`state/channel-closed-genesis-buzz.flag`, dead letters
`state/channel-deadletter-genesis-buzz.json`.

Three places the Telegram template does NOT transfer, and must be designed rather than
copied:

- **The DEAF check has no analogue.** It depends on a poller PID file
  (`~/.claude/channels/telegram-<being>/bot.pid`). Buzz has no poller and no such file;
  the harness holds a WebSocket. The equivalent liveness signal is the established socket
  itself, or the harness's own log advancing. Design it; do not rename it.
- **`channel-deadletter.mjs` needs a real code change.** Its sibling exclusion is a
  two-being ternary (`:39-40`) and its inbound extraction keys on Telegram-shaped
  `<channel source="telegram">` tags (`:84`) with a Telegram `REPLY_TOOL` regex (`:27`).
  All three need Buzz equivalents. Keep the fail-open contract: every exit path is
  `process.exit(0)` so a broken miner can never block a relaunch.
- **Duplicate presence is NOT prevented by the relay.** Two harnesses on one pubkey both
  connect and both reply; nothing evicts a sibling. The watchdog's launch precondition is
  the only guard, so it must check for BOTH a caretaker-managed process and a
  desktop-managed one before starting anything.

House style for both scripts, measured from the existing ops scripts: ASCII only, LF, no
BOM, no `param()` block, absolute paths as top-of-file literals, `-ErrorAction
SilentlyContinue` and empty `try {} catch {}` around every optional step, logging via
`Add-Content` with a sortable timestamp first and a SCREAMING first word for events, and
comments that record the incident that motivated each block rather than describing the
code.

### B4. Wake-skill additions (at natural session turnover, never mid-session)

Add Buzz equivalents of sections 2b/2c to the installed skill AND its template:
on waking, check `channel-outage-genesis-buzz.json` and
`channel-deadletter-genesis-buzz.json`; announce/answer per the Telegram practice.

### B5. **STOP — cutover (Alan's hands, one sitting)**
1. Disable (and per B2, remove) the desktop-managed Edgeweaver agent.
2. Enable the `EdgeweaverGenesisBuzzWatchdog` scheduled task.
3. One @mention round-trip; same PASS criteria as Stage 0, plus: kill the harness
   process once, confirm the watchdog relaunches it and the successor announces the
   discontinuity per B4.
4. Flags + ops-log.

### B6. Clean-week criterion - REMOVED 2026-08-01 at Alan's direction

The original criterion was: Stage B runs 7 days without an unexplained silent gap before
any further change is even discussed, and only then may option C be raised.

Alan removed it on 2026-08-01. The project is complete when B5 passes; there is no waiting
period. Recorded rather than deleted so the change is legible later, and so is what it
cost.

What is genuinely lost: a soak window was the only gate that would surface a SLOW or
INTERMITTENT fault, the kind that looks fine at cutover and misbehaves hours later. The
2026-08-01 double presence was exactly that shape, and it ran roughly 20 hours before
anyone noticed. B5's verification is a point-in-time check and cannot see that class of
problem.

What is NOT lost, and is the reason this is a smaller change than it looks: silent-gap
DETECTION was never the human's job. The watchdog writes `channel-lastok-genesis-buzz.txt`
on every tick regardless of branch, and stamps `channel-outage-genesis-buzz.json` whenever
that heartbeat is more than 20 minutes stale. Genesis reads and announces the stamp itself
at its next waking, per wake-skill section 2d. That machinery runs whether or not anyone
is counting days, and it is what would actually catch a gap. The week was the observer,
not the instrument.

Consequence to hold: option C (single-session merge) no longer has a stated gate in front
of it. It remains DEFERRED per Alan's 2026-08-01 decision 3; if it is raised, it is raised
on its own merits, not because a clean week elapsed.

---

## Risks and traps (read before executing)

- **Editing the record while the agent can spawn**: `auto_restart_on_config_change`
  can relaunch mid-edit. Always disable the agent or close the desktop first.
- **Desktop reserved-key strip is your friend**: `BUZZ_ACP_RESPOND_TO` cannot be set
  via env_vars (reserved). The owner-only gate stays UI-owned in Stage A. In Stage B
  YOU own it via the command line; never launch without `--respond-to owner-only`.
- **`localhost` vs `127.0.0.1`**: SUPERSEDED 2026-08-01 by Alan's choice of the hosted
  relay as canonical. Still true of the LOCAL relay if it is ever used again: its one
  community row is bound to host `127.0.0.1:18802`, so `localhost` 404s at the WebSocket
  upgrade (`crates/buzz-relay/src/router.rs:301-312`). `/health` answers on any host and
  proves nothing; the upgrade at `/` is the only discriminator.
- **The canonical relay URL string is exact**: `wss://edgeweaver.communities.buzz.xyz`,
  no trailing slash, no `:443`. `normalize_relay_url` (`crates/buzz-core/src/relay.rs:37-77`)
  and the runtime key hash depend on the exact form.
- **Mentions HARD-FAIL, they do not fail silently** (found 2026-08-01; Appendix A had it
  backwards): if an `@name` does not resolve to a current channel member, or is ambiguous,
  or names a non-member, `buzz messages send` aborts with exit 1 and NOTHING is posted
  (`crates/buzz-cli/src/commands/messages.rs:135-146`, `:601-611`). It fails quietly only
  when `--mention <hex-or-npub>` is supplied. Any replacement base prompt MUST teach
  `--mention` and `buzz channels add-member`.
- **Replacing the base prompt drops mechanics, not just doctrine**: stock is 138 lines and
  the four doctrines we mean to remove are a small part of it. A wholesale replacement also
  removes the mention contract, startup recovery (`buzz feed get`), file attachment
  (`buzz upload` / `messages send --file`), workspace conventions including "never
  recursive-search $HOME", worktree and commit-identity rules, and 9 of 13 command groups.
  Re-add the mechanical ones; leave conduct to the persona.
- **Buzz memory is ON unless explicitly disabled**: `BUZZ_ACP_MEMORY` defaults true
  (`crates/buzz-acp/src/config.rs:391-399`) and the desktop never sets it. The pack's
  `memory.level: none` does not affect the runtime; it only controls snapshot export
  (`desktop/src-tauri/src/managed_agents/agent_snapshot.rs:184-229`). Set
  `BUZZ_ACP_NO_MEMORY` alongside the base-prompt file, or the being is told memory is off
  while a core-memory block is injected into its prompt every turn.
- **Heartbeat prompt would contradict the persona if heartbeats are ever enabled**: the
  harness default heartbeat prompt tells the agent to run `buzz feed get --types
  needs_action` and act (`crates/buzz-acp/src/lib.rs:3646-3662`). Heartbeats are off by
  default, so this is latent; if ever turned on, override `BUZZ_ACP_HEARTBEAT_PROMPT` in
  the same act.
- **Never set `BUZZ_MANAGED_AGENT` in the Stage B launcher**: it is the desktop reaper's
  sole ownership proof (`desktop/src-tauri/src/managed_agents/runtime/orphan_sweep.rs:110-126`).
  The env scan is macOS/Linux only today, so the risk is latent on Windows, but omitting
  it is free.
- **The relay does NOT reject a duplicate presence**: two harnesses on one pubkey both
  connect and both reply. Nothing enforces "exactly one Edgeweaver" except operations.
  This is how the 2026-08-01 double presence went unnoticed for 20 hours.
- **Re-imports lose Stage A wiring**: the `.agent.json` snapshot does not carry the
  env var or parallelism; a re-import needs A4 repeated.
- **No probes in Buzz**: if any message opens with PROBE MODE, the persona declines;
  probe batteries stay on the quarantined wake surface.
- **Two presences never overlap**: at every point there must be exactly ONE Edgeweaver
  in Buzz (desktop-managed XOR caretaker-managed). Check before arming.

## Success criteria (whole project)

1. Stage 0 baseline recorded; `paired: true`.
2. Stage A: pool of one; Edgeweaver-edition handbook active; behavior conflicts gone;
   all other agents byte-identically stock.
3. Stage B: caretaker-managed presence with heartbeat/outage/dead-letter/closed-flag
   care; desktop agent retired; B5 cutover verified, including the kill-and-revive check.
   (The clean-week criterion was REMOVED 2026-08-01 at Alan's direction; see B6.)
4. Every step ops-logged; zero secrets in any committed file; soul repos untouched.

---

## Appendix A - the Edgeweaver-edition base prompt (APPROVED 2026-08-01)

The text itself is no longer duplicated here. The file IS the artifact:

    avatars/genesis/buzz-pack/base-prompt-edgeweaver.md

Approved by Alan at the A3 gate on 2026-08-01, 6291 bytes, 123 lines, LF, ASCII only,
zero em-dashes. The original Appendix A draft is preserved beside it as
`base-prompt-edgeweaver.md.appendixA-original` (2385 bytes) so the change is auditable.

Why the draft was not wired as written, recorded so it is not re-derived later:

1. It stated that partial or unresolved `@names` "fail silently". They do not. An
   unresolved, ambiguous, or non-member name aborts `buzz messages send` with exit 1 and
   NOTHING is posted (`crates/buzz-cli/src/commands/messages.rs:135-146`, `:601-611`).
   It fails quietly only when `--mention <hex-or-npub>` is given, which the draft never
   taught. As written it would have left the being believing it had spoken when it had
   not, with no recovery path.
2. It also dropped the instruction to take the exact display name from the speaker's own
   message header, which is what makes resolution succeed in the first place.
3. It removed far more than the four intended doctrines. Stock is 138 lines; the draft was
   60. Also lost, unintentionally: startup recovery (`buzz feed get`, `buzz messages
   search`), file and image attachment (`buzz upload file`, `messages send --file`), the
   callback-mention obligation, the fact that reasoning and tool calls are invisible so an
   unposted turn leaves no trace, workspace conventions including the "never
   recursive-search $HOME" guard, worktree-and-commit-identity rules, the
   claim-verification rules, and 9 of 13 command groups.

What the approved text does:

- Keeps all four intended doctrine removals: silent resume after restart or compaction,
  no-preamble replies, Buzz core-memory doctrine, conversational agent creation.
- Keeps the scope-and-precedence clause, so the soulfiles and persona outrank it.
- Corrects the mention section to the true hard-fail behaviour and teaches `--mention`
  and `buzz channels add-member`.
- Restores the MECHANICAL knowledge listed above, and deliberately leaves voice, conduct,
  autonomy and turn-taking judgment to the persona.
- Drops the sentence "Buzz-side memory is off", which the document could not make true.
  That is now enforced in A4 by `BUZZ_ACP_NO_MEMORY` instead of asserted in prose.

Note for maintainers: `buzz-acp` carries unit tests (`crates/buzz-acp/src/lib.rs:3609-3644`)
asserting the compiled-in base prompt teaches the draft-create flow, the stdin technique
and the `--mention` contract. They use `include_str!`, so they pass against the stock file
and cannot catch a replacement dropping any of it. Re-audit by hand after any edit.

## Appendix B — resume prompt for future sessions

See the kickoff prompt kept alongside this plan; any session may be started with it.
The plan file (this document) is the single source of truth for progress: update the
STATUS line and stage checkboxes as work lands, and mirror every executed step into
ops-log.md.
