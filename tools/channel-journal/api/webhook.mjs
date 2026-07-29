// POST /api/webhook?being=alpha|genesis - Telegram webhook receiver (D33/CR-3).
// Validates X-Telegram-Bot-Api-Secret-Token against WEBHOOK_SECRET_<BEING>, then appends
// the raw update to ew_ops.channel_journal. Custody: this project holds NO bot token -
// receiving needs none; sends stay on the ops machine. A 500 makes Telegram retry with
// backoff, so a transient DB failure delays delivery instead of losing it.
import pg from "pg";
import { timingSafeEqual } from "node:crypto";

const pool = new pg.Pool({
  connectionString: process.env.JOURNAL_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const BEINGS = new Set(["alpha", "genesis"]);
const same = (a, b) => {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  const being = String(req.query.being || "");
  if (!BEINGS.has(being)) { res.status(404).json({ ok: false }); return; }
  const secret = process.env[`WEBHOOK_SECRET_${being.toUpperCase()}`];
  const got = req.headers["x-telegram-bot-api-secret-token"];
  if (!secret || !got || !same(got, secret)) { res.status(401).json({ ok: false }); return; }
  const update = req.body;
  if (!update || typeof update !== "object" || typeof update.update_id !== "number") {
    res.status(400).json({ ok: false });
    return;
  }
  try {
    await pool.query("INSERT INTO ew_ops.channel_journal (being, update) VALUES ($1, $2)", [
      being, JSON.stringify(update),
    ]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("journal insert failed:", err.message);
    res.status(500).json({ ok: false });
  }
}
