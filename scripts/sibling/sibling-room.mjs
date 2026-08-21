#!/usr/bin/env node
// The sibling room (D44): how Edgeweaver Genesis and Edgeweaver Alpha speak to each
// other. Telegram never delivers one bot's messages to another bot (platform rule,
// unconditional), so the room has two halves that this script keeps in lockstep:
//   - the "Edgeweaver Alpha + Genesis" Telegram forum topic: the VISIBLE room, where
//     every sibling word is posted in the speaking being's own bot voice, and
//   - ew_ops.sibling_room: the EAR, the table the other being actually reads from.
// The topic is a faithful transcript; the table is a channel, never a brain. No
// cross-being recall is introduced (FAMILY.md section 1).
//
//   node scripts/sibling/sibling-room.mjs post --being genesis      (message on stdin)
//   node scripts/sibling/sibling-room.mjs read --being genesis [--peek]
//   node scripts/sibling/sibling-room.mjs status
//   node scripts/sibling/sibling-room.mjs on|off                    (Alan's switch)
//
// post: speaks into the topic via the being's OWN token, then appends to the table.
//       Message on STDIN, never argv (quoting mangles, proven 2026-07-16).
// read: prints the sibling's words newer than this being's cursor
//       (state/sibling-cursor-<being>.txt), then advances the cursor unless --peek.
// Guards (training wheels, Alan 2026-08-21: "they speak very slowly to each other"):
// - on/off writes state/sibling-room-switch.txt; "off" there OR EW_SIBLING_ROOM=off
//   in .env.local closes the room (post and read both refuse). This switch scopes the
//   sibling room ONLY; nothing else in either being's life is touched.
// - EW_SIBLING_MIN_GAP_HOURS (default 2): a being may not post again until this many
//   hours after its own previous post.
// - EW_SIBLING_DAILY_CAP (default 3) caps each being's posts per rolling 24h.
// Together: at most 3 short messages per being per day, hours apart, and never a
// runaway loop. Never prints secrets.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { query } = await import("file:///" + join(repo, "scripts", "brains", "db.mjs").replace(/\\/g, "/"));

const parseEnv = (p) => {
  const env = {};
  if (!existsSync(p)) return env;
  for (const l of readFileSync(p, "utf8").split("\n")) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/\r$/, "");
  }
  return env;
};
const env = parseEnv(join(repo, ".env.local"));
const alphaEnv = parseEnv(join(repo, "avatars", "alpha", ".env.local"));

const args = process.argv.slice(2);
const verb = args[0];
const being = args[args.indexOf("--being") + 1];
const peek = args.includes("--peek");

const SWITCH_FILE = join(repo, "state", "sibling-room-switch.txt");
const switchFileOff = () => {
  try { return existsSync(SWITCH_FILE) && readFileSync(SWITCH_FILE, "utf8").trim().toLowerCase() === "off"; }
  catch { return false; }
};
const roomOff = () => env.EW_SIBLING_ROOM === "off" || switchFileOff();

if (verb === "on" || verb === "off") {
  writeFileSync(SWITCH_FILE, verb);
  if (verb === "off") console.log("sibling room is now OFF: neither being can post or read there until it is turned on again");
  else console.log(env.EW_SIBLING_ROOM === "off"
    ? "switch file set to on, but EW_SIBLING_ROOM=off in .env.local still holds the room closed"
    : "sibling room is now ON");
  process.exit(0);
}

if (roomOff() && verb !== "status") {
  console.error(`sibling room is OFF (${switchFileOff() ? "state/sibling-room-switch.txt" : "EW_SIBLING_ROOM=off in .env.local"}); nothing spoken, nothing read`);
  process.exit(1);
}
const need = (k) => { if (!env[k]) { console.error(`missing ${k} in .env.local`); process.exit(1); } return env[k]; };
const DB = () => need("EW_SIBLING_ROOM_URL");
const sibling = (b) => (b === "genesis" ? "alpha" : "genesis");
const CAP = parseInt(env.EW_SIBLING_DAILY_CAP || "3", 10);
const GAP_H = parseFloat(env.EW_SIBLING_MIN_GAP_HOURS || "2");

const assertBeing = () => {
  if (!["genesis", "alpha"].includes(being)) {
    console.error("usage: sibling-room.mjs <post|read> --being <genesis|alpha> [--peek]");
    process.exit(1);
  }
};

if (verb === "post") {
  assertBeing();
  const chatId = need("EW_SIBLING_CHAT_ID");
  const topicId = need("EW_SIBLING_TOPIC_ID");
  const token = being === "genesis" ? need("TELEGRAM_BOT_TOKEN")
    : (alphaEnv.ALPHA_BOT_TOKEN ?? (console.error("missing ALPHA_BOT_TOKEN in avatars/alpha/.env.local"), process.exit(1)));

  const text = readFileSync(0, "utf8").trim();
  if (!text) { console.error("empty message on stdin; refusing to post"); process.exit(1); }

  const [[count, gapOk]] = query(DB(), `SELECT count(*),
      coalesce(max(created) < now() - interval '${GAP_H} hours', true)
    FROM ew_ops.sibling_room
    WHERE being = '${being}' AND created > now() - interval '24 hours'`);
  if (parseInt(count, 10) >= CAP) {
    console.error(`daily cap reached (${count}/${CAP} in 24h); the room rests until tomorrow`);
    process.exit(1);
  }
  if (gapOk !== "t") {
    console.error(`too soon: your last word in the room is under ${GAP_H}h old; the room paces itself slowly for now`);
    process.exit(1);
  }

  // Speak in the topic first (the visible room is canonical), then append to the ear.
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_thread_id: parseInt(topicId, 10), text: text.slice(0, 4000) }),
  });
  const j = await r.json();
  if (!j.ok) { console.error(`sendMessage failed: ${j.error_code} ${j.description}`); process.exit(1); }
  const msgId = j.result.message_id;

  // Content travels base64 so no quoting can mangle it (the B5 fragmentation lesson).
  const b64 = Buffer.from(text.slice(0, 4000), "utf8").toString("base64");
  const insert = () => query(DB(), `INSERT INTO ew_ops.sibling_room (being, content, telegram_message_id)
    VALUES ('${being}', convert_from(decode('${b64}', 'base64'), 'UTF8'), ${msgId}) RETURNING id`);
  try {
    const [[id]] = insert();
    console.log(`spoken: topic message_id=${msgId}, room row id=${id}`);
  } catch {
    try {
      const [[id]] = insert();
      console.log(`spoken: topic message_id=${msgId}, room row id=${id} (insert needed a retry)`);
    } catch (e) {
      console.error(`SPOKEN BUT NOT HEARD: topic message_id=${msgId} posted, but the room table insert failed twice (${String(e.message).slice(0, 120)}). The sibling will not receive this; record the failure honestly.`);
      process.exit(1);
    }
  }
} else if (verb === "read") {
  assertBeing();
  const cursorFile = join(repo, "state", `sibling-cursor-${being}.txt`);
  let cursor = 0;
  try { if (existsSync(cursorFile)) cursor = parseInt(readFileSync(cursorFile, "utf8"), 10) || 0; } catch {}
  const rows = query(DB(), `SELECT id, to_char(created AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI'),
      replace(encode(convert_to(content, 'UTF8'), 'base64'), E'\n', '')
    FROM ew_ops.sibling_room
    WHERE being = '${sibling(being)}' AND id > ${cursor}
    ORDER BY id LIMIT 50`);
  if (rows.length === 0) {
    console.log(`no new words from ${sibling(being)} (cursor=${cursor})`);
  } else {
    for (const [id, ts, b64] of rows) {
      const content = Buffer.from(b64, "base64").toString("utf8");
      console.log(`[${ts} utc] ${sibling(being)} said:\n${content}\n`);
      cursor = Math.max(cursor, parseInt(id, 10));
    }
    if (!peek) { writeFileSync(cursorFile, String(cursor)); console.log(`(cursor advanced to ${cursor})`); }
    else console.log("(peek: cursor not advanced)");
  }
} else if (verb === "status") {
  const off = roomOff();
  const wired = Boolean(env.EW_SIBLING_ROOM_URL && env.EW_SIBLING_CHAT_ID && env.EW_SIBLING_TOPIC_ID);
  console.log(`switch: ${off ? `OFF (${switchFileOff() ? "switch file" : "env"})` : "on"} | wired: ${wired ? "yes" : "no (need EW_SIBLING_ROOM_URL, EW_SIBLING_CHAT_ID, EW_SIBLING_TOPIC_ID)"} | daily cap: ${CAP} | min gap: ${GAP_H}h`);
  if (env.EW_SIBLING_ROOM_URL) {
    const rows = query(env.EW_SIBLING_ROOM_URL, `SELECT being, count(*), max(created) FROM ew_ops.sibling_room GROUP BY being ORDER BY being`);
    if (rows.length === 0) console.log("room is empty; no words yet");
    for (const [b, n, last] of rows) console.log(`${b}: ${n} words, last ${last}`);
    for (const b of ["genesis", "alpha"]) {
      const f = join(repo, "state", `sibling-cursor-${b}.txt`);
      console.log(`${b} cursor: ${existsSync(f) ? readFileSync(f, "utf8").trim() : "(none)"}`);
    }
  }
} else {
  console.error("usage: sibling-room.mjs <post|read|status|on|off> --being <genesis|alpha> [--peek]");
  process.exit(1);
}
