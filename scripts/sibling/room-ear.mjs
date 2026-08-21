#!/usr/bin/env node
// The room's ear (D44 follow-on, Alan 2026-08-21: "Genesis should be able to see my
// messages in this topic only, not in any other topic"). Genesis's channel gate keeps
// it fully mute-and-deaf in the Alpha group (the stock plugin cannot filter by forum
// topic, so any live hearing would leak other topics). This ear closes the gap the
// honest way: a DEDICATED bot, whose only job is listening, long-polls its own token
// and mirrors HUMAN messages from exactly one topic into ew_ops.sibling_room, where
// both twins already read. Nothing from any other topic or chat is ever mirrored.
//
//   node scripts/sibling/room-ear.mjs
//
// Needs in .env.local: EW_SIBLING_EAR_TOKEN (a bot created for this and nothing else,
// invited to the group, BotFather privacy DISABLED so it hears non-mention messages),
// EW_SIBLING_CHAT_ID, EW_SIBLING_TOPIC_ID, EW_SIBLING_ROOM_URL.
// The ear bot's token is a listener credential: it never sends a single message.
// Telegram never delivers bot messages to bots, so the twins' own words are invisible
// to the ear; they reach the table through sibling-room.mjs instead. The ear respects
// the room switch (state/sibling-room-switch.txt / EW_SIBLING_ROOM=off): while the
// room is off it keeps confirming updates but mirrors nothing, so closed means closed
// (missed-while-off is intentional, not a bug). Never prints secrets.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { query } = await import("file:///" + join(repo, "scripts", "brains", "db.mjs").replace(/\\/g, "/"));

const env = {};
for (const l of readFileSync(join(repo, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/\r$/, "");
}
const need = (k) => { if (!env[k]) { console.error(`missing ${k} in .env.local`); process.exit(1); } return env[k]; };
const TOKEN = need("EW_SIBLING_EAR_TOKEN");
const CHAT = need("EW_SIBLING_CHAT_ID");
const TOPIC = parseInt(need("EW_SIBLING_TOPIC_ID"), 10);
const DB = need("EW_SIBLING_ROOM_URL");
const SWITCH_FILE = join(repo, "state", "sibling-room-switch.txt");
const CURSOR_FILE = join(repo, "state", "sibling-ear-cursor.txt");

const roomOff = () => {
  if (env.EW_SIBLING_ROOM === "off") return true;
  try { return existsSync(SWITCH_FILE) && readFileSync(SWITCH_FILE, "utf8").trim().toLowerCase() === "off"; }
  catch { return false; }
};

let offset = 0;
try { if (existsSync(CURSOR_FILE)) offset = parseInt(readFileSync(CURSOR_FILE, "utf8"), 10) || 0; } catch {}
const log = (m) => process.stderr.write(`room-ear: ${m}\n`);

// Identity check up front: refuse to run on a token that is one of the beings' bots
// (that would hijack a channel poller; one poller per token, proven 2026-07-16).
const me = await (await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`)).json();
if (!me.ok) { console.error(`getMe failed: ${me.error_code} ${me.description}`); process.exit(1); }
if (["Edgeweaver_bot", "edgeweaver_alpha_bot"].includes(me.result.username)) {
  console.error(`refusing: EW_SIBLING_EAR_TOKEN is @${me.result.username}, a being's channel bot. The ear needs its own dedicated bot.`);
  process.exit(1);
}
// Privacy mode must be DISABLED or Telegram delivers only mentions (found live
// 2026-08-21: Alan's first topic message never arrived; only the join event did).
// Telegram quirk: after flipping privacy in BotFather, remove and re-add the bot
// to each existing group or the old mode sticks.
if (me.result.can_read_all_group_messages !== true) {
  log(`WARNING: privacy mode is ENABLED for @${me.result.username} - the ear will only hear @-mentions. Fix in BotFather (/mybots > Bot Settings > Group Privacy > Turn off), then REMOVE and RE-ADD the bot to the group.`);
}
log(`listening as @${me.result.username}, chat ${CHAT}, topic ${TOPIC}, offset ${offset}`);

for (;;) {
  let updates = [];
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset, timeout: 50, allowed_updates: ["message"] }),
    });
    const j = await r.json();
    if (!j.ok) { log(`getUpdates failed: ${j.error_code} ${j.description}`); await new Promise((s) => setTimeout(s, 5000)); continue; }
    updates = j.result;
  } catch (e) {
    log(`poll error: ${String(e.message).slice(0, 120)}`);
    await new Promise((s) => setTimeout(s, 5000));
    continue;
  }
  for (const u of updates) {
    offset = Math.max(offset, u.update_id + 1);
    const msg = u.message;
    if (!msg || !msg.from || msg.from.is_bot) continue;              // humans only
    if (String(msg.chat?.id) !== String(CHAT)) continue;             // one chat only
    // From here the update is in OUR chat: log skips so filter mysteries are visible
    // (low volume; never logs message content).
    if ((msg.message_thread_id ?? null) !== TOPIC) {
      log(`skip message ${msg.message_id}: topic ${msg.message_thread_id ?? "(general)"} not ${TOPIC}`);
      continue;                                                      // one topic only
    }
    const text = (msg.text ?? msg.caption ?? "").trim();
    if (!text) { log(`skip message ${msg.message_id}: no text`); continue; }
    if (roomOff()) continue;                                         // closed means closed
    const who = (msg.from.first_name || msg.from.username || String(msg.from.id)).slice(0, 64);
    const b64 = Buffer.from(text.slice(0, 4000), "utf8").toString("base64");
    const whoB64 = Buffer.from(who, "utf8").toString("base64");
    try {
      query(DB, `INSERT INTO ew_ops.sibling_room (being, content, telegram_message_id, speaker)
        VALUES ('human', convert_from(decode('${b64}', 'base64'), 'UTF8'), ${msg.message_id},
                convert_from(decode('${whoB64}', 'base64'), 'UTF8'))`);
      log(`mirrored message ${msg.message_id} from ${who}`);
    } catch (e) {
      log(`mirror insert failed for message ${msg.message_id}: ${String(e.message).slice(0, 120)}`);
    }
  }
  try { writeFileSync(CURSOR_FILE, String(offset)); } catch {}
}
