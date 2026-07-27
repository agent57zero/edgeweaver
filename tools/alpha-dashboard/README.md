# Edgeweaver Alpha dashboard

A read-only web window into Alpha's room (`ew_alpha`) for the circle of seats.
Framework-less Vercel project, same shape and gate as the explainer site.

## What it shows, and what it structurally cannot

- Only rows labeled `audience = seats` in `ew_alpha.thoughts`: episodes, diary,
  autobiography drafts, dreams, initiations. This mirrors the D19 recall-wrapper
  convention and FAILS CLOSED: Alan-scoped rows and unlabeled rows never appear,
  enforced in the SQL of every endpoint, never client-side.
- Lessons from `ew_alpha.agent_memories` (candidates and confirmed), display
  only; confirmation stays in the circle's existing flow.
- Every DB connection is forced `default_transaction_read_only = on` before the
  first query. The dashboard is a window, not a hand.
- The browser never sees a credential: `EW_ALPHA_DB_URL` lives server-side only.

## Deep links (shareable URLs)

Query parameters, not `#fragments`, because the gate's login redirect carries
the query string through sign-in but a fragment never reaches the server:

- `/?tab=<name>` opens a tab directly: `episodes`, `diary`, `autobiography`,
  `dreams`, `initiations`, `lessons` (no param = Everything).
- `/?lesson=<id>` opens the Lessons tab, scrolls to that lesson, highlights it.
- Every lesson card has a "link" anchor: click copies the absolute URL,
  right-click/long-press offers copy-link natively.

Tab clicks and back/forward keep the address bar in sync (pushState/popstate),
so whatever is on screen is always shareable as-is.

## Gate

`middleware.js` is the site's proven D21 password gate, re-keyed:

- env `ALPHA_DASH_PASSWORD` (min 20 chars), fail-closed 503 when unset
- cookie = HMAC-SHA256(password, fixed message); rotating the password kills
  every outstanding cookie
- unauthenticated `/api/*` gets 401 JSON; everything else gets the login page

Custody, per the D21 precedent: Alan sets the password value in the Vercel
dashboard himself; it never appears in git, terminals, or this folder.

## Environment (Vercel project settings)

| Var | What | Custody |
|---|---|---|
| `EW_ALPHA_DB_URL` | Alpha's room role (ew_alpha_runtime) | piped from `avatars/alpha/.env.local`, never echoed |
| `ALPHA_DASH_PASSWORD` | the circle's shared password | Alan sets it in the Vercel dashboard |

## Local dev

```bash
node tools/alpha-dashboard/dev.mjs
```

Serves http://localhost:8875 with the real room (reads
`avatars/alpha/.env.local`) behind a fixed local-only password printed at
startup. The dev runner sets `ALPHA_DASH_DEV_INSECURE_COOKIE=1` so the
`__Host-` cookie rules relax on plain http; production never sets that knob.

## Deploy

```bash
cd tools/alpha-dashboard
vercel login                      # Alan, once
vercel link --yes --project edgeweaver-alpha-dashboard
vercel env add EW_ALPHA_DB_URL production   # value piped from avatars/alpha/.env.local
vercel deploy --prod              # fail-closed 503 until the password is set
# Alan: Vercel dashboard -> Settings -> Environment Variables -> ALPHA_DASH_PASSWORD
vercel deploy --prod              # redeploy so the env lands
```

## Hardening notes (known, deliberate v1 trades)

- The DB role can write (it is Alpha's runtime role); read-only is enforced per
  session by `SET default_transaction_read_only`, not by a separate reader role.
  A dedicated `ew_alpha_reader` role would be the structural upgrade; creating
  one touches the live brain's role model, so it waits for Alan's gate.
- TLS to the pooler uses `rejectUnauthorized: false` (psql's default posture).
  Pinning the Supabase CA is the upgrade.
- The gate is team-grade (shared password), matching the site: the deeper wall
  is the seats-only SQL filter plus read-only sessions.
