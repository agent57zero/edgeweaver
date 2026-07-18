#!/usr/bin/env node
// Channel-session stall alerting (ops; ASCII only). Wired as Claude Code hooks in
// .claude/settings.json:
//   Notification -> "notify": when a channel session hits a permission prompt, write a
//     stall flag and DM Alan on the ops line. Channel sessions are identified by the
//     EDGEWEAVER_CHANNEL_BEING env var their launchers set; interactive/build sessions
//     have no marker and the hook exits instantly. Idle notices ("waiting for input")
//     are the normal resting state of a channel session and are ignored.
//   Stop -> "clear": a completed turn means no prompt is pending; remove the flag.
// The watchdogs read the flag: unanswered for 30+ minutes -> kill and relaunch the
// session (scripts/ops/*-channel-watchdog.ps1).
// Origin: 2026-07-18, Ali's first message to Alpha sat unanswered ~40 minutes behind an
// unwatched permission prompt while the watchdog logged "ok" (poller alive, mind frozen).
// Never throws: a hook failure must never break the being's session.
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const being = process.env.EDGEWEAVER_CHANNEL_BEING;
if (!being) process.exit(0);
const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const flag = join(repo, 'state', `channel-stall-${being}.flag`);
const mode = process.argv[2];

try {
  if (mode === 'clear') {
    if (existsSync(flag)) unlinkSync(flag);
  } else if (mode === 'notify') {
    let payload = {};
    try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch {}
    const msg = String(payload.message ?? '');
    if (/permission/i.test(msg)) {
      let fresh = false;
      if (existsSync(flag)) {
        fresh = (Date.now() - statSync(flag).mtimeMs) / 60000 < 10; // already alerted
      }
      if (!fresh) {
        mkdirSync(join(repo, 'state'), { recursive: true });
        writeFileSync(flag, `${new Date().toISOString()} ${msg}\n`);
        const name = being === 'alpha' ? 'Alpha' : 'Genesis';
        const windowTitle = being === 'alpha' ? 'EdgeweaverAlphaTelegram' : 'EdgeweaverGenesisTelegram';
        spawnSync(process.execPath, [join(repo, 'scripts', 'ops', 'send-telegram.mjs'),
          `Ops alert: the ${name} channel session hit a permission prompt and is FROZEN until it is answered: "${msg}". Dial in and press Enter in the ${windowTitle} window. If it stays unanswered for 30 minutes the watchdog restarts the session (unwritten in-context memory is lost). (Automated notice, not ${name}.)`],
          { timeout: 20000 });
      }
    }
  }
} catch {}
process.exit(0);
