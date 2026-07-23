// Shared room access for the Alpha dashboard API. Every query runs as the
// ew_alpha_runtime role via EW_ALPHA_DB_URL (server-side env only; no
// credential ever reaches the browser), and every connection is forced
// read-only before the first query: this surface is a window, not a hand.
//
// Visibility rule, mirroring the D19 recall-wrapper convention: the API only
// ever selects rows labeled audience=seats. Alan-scoped rows and unlabeled
// rows are invisible by construction (fail closed), not filtered client-side.
import pg from "pg";

export const SEATS_ONLY = "t.metadata->>'audience' = 'seats'";
export const ALLOWED_TYPES = ["edgeweaver_episode", "diary", "autobiography_draft", "dream", "initiation"];

export async function withRoom(fn) {
  const url = process.env.EW_ALPHA_DB_URL;
  if (!url) {
    const e = new Error("EW_ALPHA_DB_URL is not configured");
    e.code = "ENV";
    throw e;
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
  });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    await client.query("SET statement_timeout = '8s'");
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

export function params(req) {
  return new URL(req.url, "http://internal").searchParams;
}

export function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "private, no-store");
  res.end(JSON.stringify(obj));
}

export function fail(res, err) {
  if (err && err.code === "ENV") {
    return json(res, 503, { error: "room credential not configured; failing closed" });
  }
  console.error("alpha-dashboard api error:", err && err.message);
  return json(res, 500, { error: "query failed" });
}
