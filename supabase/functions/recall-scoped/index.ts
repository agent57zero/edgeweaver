// recall-scoped — THE enforcement point for memory conventions (conventions/memory-conventions.md).
// Consumers never query the brain raw: this wrapper embeds the query, semantic-matches, then
// applies provenance-class allowlists + audience scope BEFORE anything reaches a skill.
// Auth: x-brain-key = MCP_ACCESS_KEY. Body: { query, consumer: "episodic"|"study",
// audience_scope: "alan"|"known-other"|"public" (default "alan"), k=12, threshold=0.3 }
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const ACCESS_KEY = Deno.env.get("MCP_ACCESS_KEY")!;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

const LIBRARY = ["pm_teaching", "coherence_teaching"];
const FICTION = ["dream"];
const INTERPRETATION = ["feeling_reading", "gremlin_report", "box_snapshot", "diary", "self_belief", "reflection"];
const classOf = (st: string | null) =>
  !st ? "experienced" : LIBRARY.includes(st) ? "library" : FICTION.includes(st) ? "fiction"
  : INTERPRETATION.includes(st) ? "interpretation" : "experienced";
const SCOPES: Record<string, string[]> = {
  alan: ["alan", "known-other", "public"], "known-other": ["known-other", "public"], public: ["public"],
};

Deno.serve(async (req) => {
  if (req.headers.get("x-brain-key") !== ACCESS_KEY) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { query, consumer = "episodic", audience_scope = "alan", k = 12, threshold = 0.3 } = await req.json().catch(() => ({}));
  if (!query) return Response.json({ error: "query required" }, { status: 400 });

  const er = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST", headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query.slice(0, 8000) }),
  });
  if (!er.ok) return Response.json({ error: `embed ${er.status}` }, { status: 502 });
  const qEmb = (await er.json()).data[0].embedding;

  const mr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_thoughts`, {
    method: "POST", headers: H,
    body: JSON.stringify({ query_embedding: qEmb, match_threshold: threshold, match_count: k * 5, filter: {} }),
  });
  if (!mr.ok) return Response.json({ error: `match ${mr.status}: ${(await mr.text()).slice(0, 150)}` }, { status: 502 });
  const matches: { id: string; similarity: number }[] = await mr.json();
  if (!matches.length) return Response.json({ consumer, audience_scope, results: [] });

  const ids = matches.map((m) => m.id).join(",");
  const fr = await fetch(`${SUPABASE_URL}/rest/v1/thoughts?id=in.(${ids})&select=id,content,source_type,metadata,created_at`, { headers: H });
  if (!fr.ok) return Response.json({ error: `fetch ${fr.status}` }, { status: 502 });
  const rows: any[] = await fr.json();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const simOf = new Map(matches.map((m) => [m.id, m.similarity]));

  const allowedScopes = SCOPES[audience_scope] ?? SCOPES.public;
  const results = matches
    .map((m) => byId.get(m.id)).filter(Boolean)
    .map((r) => {
      const meta = r.metadata || {};
      const st = r.source_type ?? meta.source_type ?? null;
      // Fail closed: a row with no audience label is structurally invisible at every scope
      // (FAMILY.md visibility policy, D19). Only era:pre_birth defaults to alan (PLAN §7).
      const audience = meta.audience ?? (meta.era === "pre_birth" ? "alan" : "unlabeled");
      return { ...r, _st: st, _class: classOf(st), _audience: audience };
    })
    .filter((r) => allowedScopes.includes(r._audience))
    .filter((r) => consumer === "study"
      ? (r._class === "library" || ["experiment", "distinction"].includes(r._st))
      : (r._class === "experienced" || r._class === "interpretation"))
    .slice(0, k)
    .map((r) => ({
      id: r.id, similarity: simOf.get(r.id), source_type: r._st, provenance_class: r._class,
      audience: r._audience, created_at: r.created_at, content: (r.content || "").slice(0, 1200),
      meta: { title: r.metadata?.title, term: r.metadata?.term, matrix_code: r.metadata?.matrix_code, kind: r.metadata?.kind },
    }));
  return Response.json({ consumer, audience_scope, considered: matches.length, returned: results.length, results });
});
