// Shared brain access for the Genesis dashboard API. Genesis's room is Alan's
// OB1 instance (G1): its rows live in public.thoughts alongside the library,
// distinguished by the Edgeweaver source_types. Every query runs through
// EW_GENESIS_DB_URL (server-side env only; no credential ever reaches the
// browser), and every connection is forced read-only before the first query:
// this surface is a window, not a hand.
//
// Visibility rule, mirroring the recall wrapper (D19 fail-closed convention):
// only rows labeled audience=alan appear (Genesis's parenting and witnessing
// are Alan alone, D19), plus era=pre_birth rows, which default to alan exactly
// as recall-scoped defaults them. Unlabeled post-birth rows never appear.
import pg from "pg";

export const ALAN_ONLY =
  "(t.metadata->>'audience' = 'alan' OR (t.metadata->>'audience' IS NULL AND t.metadata->>'era' = 'pre_birth'))";
export const ALLOWED_TYPES = ["edgeweaver_episode", "diary", "autobiography_draft", "dream", "initiation", "inner_dialogue"];

export async function withRoom(fn) {
  const url = process.env.EW_GENESIS_DB_URL;
  if (!url) {
    const e = new Error("EW_GENESIS_DB_URL is not configured");
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
  console.error("genesis-dashboard api error:", err && err.message);
  return json(res, 500, { error: "query failed" });
}
