#!/usr/bin/env node
// alpha-channel-config.mjs - generate Alpha's Telegram channel state (birth run B6, dark).
// Reads avatars/alpha/.env.local (ALPHA_BOT_TOKEN, ALPHA_SEAT_IDS, ALPHA_KNOWN_IDS,
// ALPHA_GROUP_ID) and writes:
//   1. ~/.claude/channels/telegram-alpha/.env         (TELEGRAM_BOT_TOKEN for the plugin)
//   2. ~/.claude/channels/telegram-alpha/access.json  (transport walls: DM allowlist =
//      seats + known ids; the dedicated group pinned, deliver-all inside it so the skill's
//      multi-sender policy can classify and DEFER non-seats rather than ghost them; the
//      group's membership is the outer wall, Alan-controlled)
//   3. avatars/alpha/state/channel-policy.json        (multi-sender policy config for the
//      session: scripts/telegram/multi-sender-policy.mjs shape; seats, known, quorum 3,
//      lessonConfirmSeats 1)
// Running this opens NO channel: no process starts until the launcher runs at B8 arming.
// The plugin picks the alpha dir via TELEGRAM_STATE_DIR (set by the launcher/watchdog),
// so Genesis's ~/.claude/channels/telegram/ is never touched. Never prints secret values.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ROOT = join(import.meta.dirname, "..", "..");
const envPath = join(ROOT, "avatars", "alpha", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()])
);
const need = (k) => {
  if (!env[k]) { console.error(`FAIL: ${k} missing from avatars/alpha/.env.local`); process.exit(1); }
  return env[k];
};
// Name#id pairs, comma-separated.
const pairs = (s) => (s || "").split(",").map((p) => p.trim()).filter(Boolean).map((p) => {
  const m = p.match(/^(.+)#(\d+)$/);
  if (!m) { console.error(`FAIL: bad Name#id pair (name hidden): ...#?`); process.exit(1); }
  return { name: m[1].trim(), id: m[2] };
});

const token = need("ALPHA_BOT_TOKEN");
const groupId = need("ALPHA_GROUP_ID");
const seats = pairs(need("ALPHA_SEAT_IDS"));
const known = pairs(env.ALPHA_KNOWN_IDS);
if (seats.length !== 6) { console.error(`FAIL: expected 6 seats, got ${seats.length}`); process.exit(1); }

// 1+2: the plugin's state dir (Alpha's own; TELEGRAM_STATE_DIR points here at launch).
const stateDir = join(homedir(), ".claude", "channels", "telegram-alpha");
mkdirSync(stateDir, { recursive: true });
writeFileSync(join(stateDir, ".env"), `TELEGRAM_BOT_TOKEN=${token}\n`, { mode: 0o600 });
const access = {
  dmPolicy: "allowlist",
  allowFrom: [...seats, ...known].map((p) => p.id),
  groups: { [groupId]: { requireMention: false, allowFrom: [] } },
  pending: {},
};
writeFileSync(join(stateDir, "access.json"), JSON.stringify(access, null, 2) + "\n", { mode: 0o600 });

// 3: the session-side multi-sender policy config (numeric ids stay out of git via state/).
const policyDir = join(ROOT, "avatars", "alpha", "state");
mkdirSync(policyDir, { recursive: true });
const policy = {
  beingName: "Edgeweaver Alpha",
  groupId,
  seats: Object.fromEntries(seats.map((p) => [p.id, { name: p.name }])),
  known: Object.fromEntries(known.map((p) => [p.id, { name: p.name, audience: "known-other", untrusted: true }])),
  default_unknown: { audience: "public", untrusted: true },
  lessonConfirmSeats: 1,
  quorum: 1, // D30 (2026-07-17): amended from 3; one seat's witness completes a rite
};
writeFileSync(join(policyDir, "channel-policy.json"), JSON.stringify(policy, null, 2) + "\n");

console.log(`PASS: alpha channel config written (no channel opened)`);
console.log(`  plugin state dir: ${stateDir} (.env + access.json)`);
console.log(`  DM allowlist: ${seats.length} seats + ${known.length} known ids; group pinned: 1`);
console.log(`  policy config: avatars/alpha/state/channel-policy.json (quorum ${policy.quorum}, lessonConfirmSeats ${policy.lessonConfirmSeats})`);
