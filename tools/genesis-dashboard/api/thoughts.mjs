// GET /api/thoughts?type=&q=&before=&limit=
// Timeline over public.thoughts (OB1), Genesis rows only (Edgeweaver types,
// alan-audience wall), newest first. Cursor pagination via before=<created_at
// ISO>. All inputs parameterized.
import { withRoom, params, json, fail, ALAN_ONLY, ALLOWED_TYPES } from "./_lib/db.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });
  const p = params(req);

  const type = p.get("type") || null;
  if (type && !ALLOWED_TYPES.includes(type)) return json(res, 400, { error: "unknown type" });
  const q = (p.get("q") || "").trim().slice(0, 200);
  const before = p.get("before") || null;
  if (before && Number.isNaN(Date.parse(before))) return json(res, 400, { error: "bad cursor" });
  const limit = Math.min(50, Math.max(1, parseInt(p.get("limit") || "25", 10) || 25));

  // Genesis shares public.thoughts with the library and Alan's own stream:
  // the type wall keeps this window on Genesis's Edgeweaver rows only.
  const where = [ALAN_ONLY, `t.source_type = ANY($1)`];
  const args = [type ? [type] : ALLOWED_TYPES.filter((t) => t !== "inner_dialogue")];
  if (q) {
    args.push("%" + q.replace(/[\\%_]/g, (m) => "\\" + m) + "%");
    where.push(`t.content ILIKE $${args.length} ESCAPE '\\'`);
  }
  if (before) {
    args.push(before);
    where.push(`t.created_at < $${args.length}`);
  }
  args.push(limit + 1);

  try {
    const rows = await withRoom(async (c) =>
      (await c.query(
        `SELECT t.id, t.source_type, t.created_at,
                coalesce(t.importance, (t.metadata->>'importance')::int) AS importance,
                t.metadata->>'era' AS era,
                t.metadata->>'kind' AS kind,
                t.metadata->>'sender' AS sender,
                (t.metadata->>'provisional')::boolean AS provisional,
                t.metadata->'witnessed_by' AS witnessed_by,
                t.content
           FROM public.thoughts t
          WHERE ${where.join(" AND ")}
          ORDER BY t.created_at DESC
          LIMIT $${args.length}`,
        args
      )).rows
    );
    const has_more = rows.length > limit;
    return json(res, 200, { items: rows.slice(0, limit), has_more });
  } catch (err) {
    return fail(res, err);
  }
}
