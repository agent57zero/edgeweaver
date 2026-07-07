// telegram-test.mjs - TEST MODE: the single sanctioned A8 pairing round-trip (dark rule 4).
// Long-polls the bot; the first human message gets ONE clearly-labeled test reply (Testweaver
// harness, explicitly NOT Edgeweaver), the sender's numeric id is captured to
// state/test-mode/telegram-last-sender.json (so the operator can pin TELEGRAM_ALLOWED_USER_ID),
// and the script EXITS - the channel session closes and stays closed until Phase 3 arms.
// No OB1 writes, no persona, no memory. Auto-exits after --window seconds (default 180) if
// nothing arrives. Usage: node scripts/test-mode/telegram-test.mjs [--window 180]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); if (i < 0) return d; const v = argv[i + 1]; return v === undefined || v.startsWith("--") ? true : v; };
const windowSec = Number(opt("window", 180));

const env = Object.fromEntries((await readFile(join(ROOT, ".env.local"), "utf8"))
  .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const api = (m, body) => fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`, {
  method: body ? "POST" : "GET",
  headers: body ? { "Content-Type": "application/json" } : undefined,
  body: body ? JSON.stringify(body) : undefined,
}).then((r) => r.json());

const me = await api("getMe");
if (!me.ok) { console.error("getMe failed - check TELEGRAM_BOT_TOKEN"); process.exit(1); }
console.log(`TEST MODE armed for a single round-trip on @${me.result.username} (window ${windowSec}s).`);
console.log("Send the bot any message from your phone/Telegram now...");
await api("deleteWebhook"); // getUpdates requires no webhook

const deadline = Date.now() + windowSec * 1000;
let offset = 0, done = false;
while (!done && Date.now() < deadline) {
  const u = await api(`getUpdates?timeout=25&offset=${offset}`);
  if (!u.ok) { console.error("getUpdates error:", JSON.stringify(u).slice(0, 200)); break; }
  for (const upd of u.result) {
    offset = upd.update_id + 1;
    const msg = upd.message;
    if (!msg || !msg.from || msg.from.is_bot) continue;
    const from = msg.from;
    const senderLabel = [from.first_name, from.last_name].filter(Boolean).join(" ") + (from.username ? ` (@${from.username})` : "");
    console.log(`\nround-trip: message from ${senderLabel}, id=${from.id}: "${(msg.text || "(non-text)").slice(0, 80)}"`);
    await api("sendMessage", {
      chat_id: msg.chat.id,
      text: `TEST MODE - Testweaver hardware harness, not Edgeweaver.\n\nRound-trip confirmed. I received: "${(msg.text || "(non-text)").slice(0, 120)}"\n\nYour Telegram id: ${from.id}\n\nThis channel now closes until Phase 3 arms.`,
    });
    await mkdir(join(ROOT, "state", "test-mode"), { recursive: true });
    await writeFile(join(ROOT, "state", "test-mode", "telegram-last-sender.json"),
      JSON.stringify({ id: from.id, name: senderLabel, at: new Date().toISOString(), bot: me.result.username }, null, 2) + "\n", "utf8");
    console.log(`reply sent; sender id ${from.id} recorded to state/test-mode/telegram-last-sender.json`);
    done = true;
    break;
  }
}
console.log(done ? "\nROUND-TRIP COMPLETE - channel session closed." : "\nWINDOW EXPIRED - no message received; channel session closed.");
process.exit(done ? 0 : 2);
