// sql-migrate — guarded DDL runner for schema migrations (agent-memory, thought_edges, ...).
// Auth: x-brain-key must equal MCP_ACCESS_KEY (same guard as open-brain-mcp).
// Uses the platform-provided SUPABASE_DB_URL (direct Postgres, in-infra) — the DB password
// never leaves Supabase. Body: {"sql": "..."} — runs as a single multi-statement script.
import postgres from "npm:postgres@3.4.5";

const KEY = Deno.env.get("MCP_ACCESS_KEY")!;
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

Deno.serve(async (req) => {
  if (req.headers.get("x-brain-key") !== KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { sql: script } = await req.json().catch(() => ({}));
  if (!script || typeof script !== "string") {
    return Response.json({ error: "body must be {\"sql\": string}" }, { status: 400 });
  }
  const sql = postgres(DB_URL, { prepare: false, max: 1 });
  try {
    const result = await sql.unsafe(script);
    return Response.json({ ok: true, statements: Array.isArray(result) ? result.length : 1 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 500) }, { status: 400 });
  } finally {
    await sql.end();
  }
});
