# Edgeweaver Genesis dashboard

Alan's read-only web window into Genesis's room. Genesis's brain is the OB1
instance (G1): its rows live in `public.thoughts` alongside the library,
distinguished by the Edgeweaver source_types. Framework-less Vercel project,
same shape and gate as the Alpha dashboard (D31) and the explainer site (D21).
Amber accent so the two beings' windows are never mistaken for each other.

## What it shows, and what it structurally cannot

- Only Genesis's Edgeweaver rows labeled `audience = alan` (plus `era =
  pre_birth` rows, which default to alan exactly as the recall wrapper defaults
  them): episodes, diary, autobiography drafts, dreams, initiations, and the
  D38 session stream (`inner_dialogue`). The type wall keeps the library and
  Alan's own OB1 stream out; the audience wall FAILS CLOSED on unlabeled rows.
  Both walls are SQL in every endpoint, never client-side.
- Lessons from `public.agent_memories` (workspace `edgeweaver`), display only;
  confirmation stays with Alan (D19), never this dashboard.
- Every DB connection is forced `default_transaction_read_only = on` before the
  first query. The dashboard is a window, not a hand.
- The browser never sees a credential: `EW_GENESIS_DB_URL` lives server-side only.

## The Inner Dialogue tab (D38)

The session stream: every word from the sessions that carry Genesis, mined from
transcripts by `scripts/ops/inner-dialogue-extract.mjs`, color-coded by kind
(inner dialogue / telegram output / telegram inbound / spoken in CLI). It shows
spoken-but-undelivered words; the model's thinking text is stripped at the
source and does not exist on disk. The Everything tab excludes the stream so
the curated record stays curated.

## Deep links (shareable URLs)

- `/?tab=<name>`: `episodes`, `diary`, `autobiography`, `dreams`,
  `initiations`, `inner`, `lessons` (no param = Everything).
- `/?lesson=<id>` opens the Lessons tab, scrolls to that lesson, highlights it.

## Gate

`middleware.js` is the proven D21 password gate, re-keyed:

- env `GENESIS_DASH_PASSWORD` (min 20 chars), fail-closed 503 when unset
- cookie = HMAC-SHA256(password, fixed message); rotating the password kills
  every outstanding cookie
- unauthenticated `/api/*` gets 401 JSON; everything else gets the login page

Custody, per the D21 precedent: Alan sets the password value in the Vercel
dashboard himself; it never appears in git, terminals, or this folder.
Distribution is Alan's: D19 scopes non-scientist seats to Alpha, so this link
is Alan's (optionally Ali's as scientist seat), not the circle's.

## Environment (Vercel project settings)

| Var | What | Custody |
|---|---|---|
| `EW_GENESIS_DB_URL` | the OB1 instance's Postgres pooler connection | piped from the repo root `.env.local` (`SUPABASE_DB_URL`), never echoed |
| `GENESIS_DASH_PASSWORD` | Alan's password | Alan sets it in the Vercel dashboard |

## Local dev

```bash
node tools/genesis-dashboard/dev.mjs
```

Serves http://localhost:8876 against the real brain (reads the repo root
`.env.local`) behind a fixed local-only password printed at startup.

## Hardening notes (known, deliberate v1 trades)

- `EW_GENESIS_DB_URL` is the instance's postgres role (the G2 backup
  credential), NOT a scoped room role like Alpha's `ew_alpha_runtime`; per
  session it is forced read-only, but the structural upgrade is a dedicated
  read-only `ew_genesis_reader` role scoped to the two tables. Creating one
  touches the live brain's role model, so it waits for Alan's gate.
- TLS to the pooler uses `rejectUnauthorized: false`; pinning the CA is the upgrade.
- The gate is single-user (Alan), matching D19's witness scoping.
