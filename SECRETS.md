# SECRETS.md — key manifest (names and provenance ONLY; values never live here)

Source of truth for values: **Alan's password manager** (checklist 00 disaster-recovery
seed). This file exists so a bare machine can be re-seeded: every key, what it's for,
where a fresh value comes from. Update this table whenever `.env.local` gains or loses
a key — the weekly machine-state backup archives the key *names* alongside the encrypted
values, so drift shows up in drills.

## `.env.local` (repo root, gitignored)

| Key | What | Re-issue / retrieve |
|---|---|---|
| SUPABASE_URL | OB1 Supabase project URL | Supabase dashboard → Settings → API |
| SUPABASE_ANON_KEY | public (anon) API key | same page |
| SUPABASE_SERVICE_KEY | service-role key, full DB access — **value pending** | same page, `service_role` (Alan retrieves) |
| OB1_MCP_URL | OB1 MCP edge-function endpoint | Supabase → Edge Functions; also OB1 dashboards `.env.local` |
| OB1_MCP_KEY | key for that endpoint | same |
| ANTHROPIC_API_KEY | Claude API | console.anthropic.com → API keys |
| TELEGRAM_BOT_TOKEN | Edgeweaver's Telegram bot — **value pending** | @BotFather (`/token`; revoke with `/revoke`) |
| TELEGRAM_ALLOWED_USER_ID | Alan's Telegram user id (config, not secret) — **value pending** | @userinfobot |
| SOUL_REPO_PAT | fine-grained PAT: edgeweaver-soul only, contents:write | GitHub → Settings → Developer settings → Fine-grained tokens |

## `edgeweaver-backups` repo → Actions secrets

| Secret | What | Source |
|---|---|---|
| SUPABASE_DB_URL | **Session-pooler** Postgres connection string (nightly `pg_dump`) — **pending** | Supabase → Settings → Database → Connection string → *Session pooler* |
| TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID | backup-failure alerts — **pending** (mirror of `.env.local` values above) | set with `gh secret set <NAME> -R agent57zero/edgeweaver-backups` |
| HEALTHCHECKS_URL | dead-man-switch ping (alerts on backup *silence*) — **pending, optional** | healthchecks.io → the check's ping URL |

## Not in any file on any machine

| Item | Custody |
|---|---|
| **age private key** — decrypts every brain dump and machine-state archive | Alan's password manager ONLY — **pending generation** (RESTORE.md § Keys in edgeweaver-backups) |
| Supabase / GitHub / Anthropic account logins | their owners' password managers |

Iron rule (START-HERE.md): secrets only in `.env.local` / `state/` (both gitignored) and
the stores above. Never in git, OB1 memory, soulfiles, or the gates repo.
