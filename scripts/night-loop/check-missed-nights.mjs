// check-missed-nights.mjs - A9 failure alerting (night-loop-contracts + checklist 04): if no
// night_loop_run_id outputs exist for 2 consecutive nights, send a Telegram alert. DARK: --dry-run
// prints the alert instead of sending (no live channel before Phase 3 arms; iron rule + dark rule
// 4). At arming, it sends via TELEGRAM_* from .env.local. Run in the dark build ONLY with --dry-run.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
export const ALERT_TEXT = "Night loop has not completed for 2 nights - check logs/night.log";

// missedNights(lastRunDates: string[YYYY-MM-DD], now: Date) -> count missed in the last 2 nights
export function missedNights(lastRunDates, now) {
  const have = new Set(lastRunDates);
  let missed = 0;
  for (let i = 1; i <= 2; i++) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    if (!have.has(d)) missed++;
  }
  return missed;
}

async function sendTelegram(text) {
  const env = Object.fromEntries((await readFile(join(ROOT, ".env.local"), "utf8")).split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_ALLOWED_USER_ID, text }),
  });
  return r.status;
}

if (process.argv[1] && process.argv[1].endsWith("check-missed-nights.mjs")) {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry-run");
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1]; };
  const last = (opt("last", "") || "").split(",").filter(Boolean);
  const now = new Date((opt("now", new Date().toISOString().slice(0, 10))) + "T12:00:00Z");
  const missed = missedNights(last, now);
  if (missed >= 2) {
    if (dry) console.log("ALERT (dry-run, not sent): " + ALERT_TEXT);
    else console.log("alert sent, telegram status " + (await sendTelegram(ALERT_TEXT)));
  } else {
    console.log(`ok: ${missed} missed night(s) in the last 2`);
  }
}
