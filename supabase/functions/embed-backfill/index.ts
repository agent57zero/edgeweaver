// embed-backfill — one purpose: give embeddings to thoughts that lack them.
// Uses the SAME project secrets as open-brain-mcp (OpenRouter, text-embedding-3-small,
// 1536-dim) so imported/direct-inserted rows become semantically searchable.
// Invoke repeatedly (Bearer = service role JWT) until remaining=0. Batch default 100.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  const { batch = 100 } = await req.json().catch(() => ({}));
  const sel = await fetch(`${SUPABASE_URL}/rest/v1/thoughts?select=id,content&embedding=is.null&order=id&limit=${batch}`, { headers: H });
  if (!sel.ok) return Response.json({ error: `select ${sel.status}` }, { status: 500 });
  const rows: { id: string; content: string }[] = await sel.json();
  if (rows.length === 0) return Response.json({ embedded: 0, remaining: 0 });

  const er = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: rows.map((r) => (r.content || " ").slice(0, 8000)) }),
  });
  if (!er.ok) return Response.json({ error: `embeddings ${er.status}: ${(await er.text()).slice(0, 200)}` }, { status: 502 });
  const vecs = (await er.json()).data;

  let ok = 0; const errs: string[] = [];
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(rows.slice(i, i + 10).map(async (row, j) => {
      const p = await fetch(`${SUPABASE_URL}/rest/v1/thoughts?id=eq.${row.id}`, {
        method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({ embedding: JSON.stringify(vecs[i + j].embedding) }),
      });
      if (p.ok) ok++; else errs.push(`${row.id}:${p.status}`);
    }));
  }
  const cnt = await fetch(`${SUPABASE_URL}/rest/v1/thoughts?select=id&embedding=is.null&limit=1`, { headers: { ...H, Prefer: "count=exact" } });
  const remaining = parseInt((cnt.headers.get("content-range") || "/0").split("/")[1], 10);
  return Response.json({ embedded: ok, remaining, errors: errs.slice(0, 5) });
});
