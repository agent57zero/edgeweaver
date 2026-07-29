// GET /api/health - liveness for the journal receiver: proves function + DB reachability
// without exposing any journal content.
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.JOURNAL_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ ok: false }); return; }
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (err) {
    // Diagnostic detail: code + sanitized message (no connection strings appear in pg
    // errors; belt-and-braces redaction anyway). Kept because this endpoint guards no
    // data and a named failure beats a mute 503 during an outage.
    const msg = String(err.message || "").replace(/postgres(ql)?:\/\/\S+/g, "<url>").slice(0, 160);
    res.status(503).json({ ok: false, code: err.code ?? null, err: msg });
  }
}
