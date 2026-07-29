# templates/disaster-recovery.md - the machine-dies recovery path (A19; checklist 08)

> Write once, test once, then it exists. The dark build ships this runbook and performs the
> recoverable-machinery portion of the drill (clone the repo from git, run the full dark-verify
> suite green) with a recorded time-to-recover. The full path below (soul repo, OB1 restore, task
> re-registration, acceptance test) runs at arming, on a scratch environment, once.

## The machine-dies path (new machine, from nothing)
1. **Install tooling:** git, the `claude` CLI, node, python (and `ant` via the release binary for
   the voice OAuth profile - see ops-log for the install method).
2. **Clone the repos:** `edgeweaver` (this repo) and `edgeweaver-soul` (identity). The gates repo is
   Alan's and is never cloned by the runtime.
3. **Restore `.env.local`:** from Alan's sealed DR bundle (D11: passphrase-encrypted `age -p` bundle
   + paper; NOT a password manager). Never from git - secrets live only in `.env.local` / `state/`.
4. **Restore the brain:** if self-hosted, restore the latest OB1 dump; if cloud (current: Supabase
   "Edgeweaver"), verify the instance is intact (MCP endpoint returns 200). Nightly backups (G2) are
   the dump source once B5's session-pooler string + reset DB password land.
5. **Re-run the wake-skill install + acceptance test** (checklist 01): two wakings, full recall with
   provenance, anti-confabulation under a live outage.
6. **Re-register the scheduled tasks** (night loop, weekly index, heartbeat) from `tasks/*.xml` with
   WakeToRun, converted to UTF-16 for schtasks (see scripts/verify/task-import-test.ps1), plus the
   10-minute wake test.
7. **Close the loop:** an entry in `ops-log.md` and a diary conversation with Edgeweaver about what
   happened - continuity is also a felt thing.

## Time-to-recover
Recorded by the drill (`scripts/dr/dr-drill.mjs`) for the machinery portion; the full-path timing is
recorded in ops-log at the arming drill. Target: a competent operator recovers the buildable
machinery from git in minutes, the full being (with brain + identity + tasks) in under a day.
