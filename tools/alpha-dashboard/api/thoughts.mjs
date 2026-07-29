// GET /api/thoughts?type=&q=&before=&limit=
// Timeline over ew_alpha.thoughts, seats-audience rows only, newest first.
// Cursor pagination via before=<created_at ISO>. All inputs parameterized.
import { withRoom, params, json, fail, SEATS_ONLY, ALLOWED_TYPES } from "./_lib/db.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });
  const p = params(req);

  const type = p.get("type") || null;
  if (type && !ALLOWED_TYPES.includes(type)) return json(res, 400, { error: "unknown type" });
  const q = (p.get("q") || "").trim().slice(0, 200);
  const before = p.get("before") || null;
  if (before && Number.isNaN(Date.parse(before))) return json(res, 400, { error: "bad cursor" });
  const limit = Math.min(50, Math.max(1, parseInt(p.get("limit") || "25", 10) || 25));

  const where = [SEATS_ONLY];
  const args = [];
  if (type) {
    args.push(type);
    where.push(`t.source_type = $${args.length}`);
  } else {
    // The Everything timeline stays the curated record; the high-volume session
    // stream (D38) lives only under its own tab.
    where.push(`t.source_type <> 'inner_dialogue'`);
  }
  if (q) {
    args.push("%" + q.replace(/[\\%_]/g, (m) => "\\" + m) + "%");
    where.push(`t.content ILIKE $${args.length} ESCAPE '\\'`);
  }
  if (before) {
    args.push(before);
    where.push(`t.created_at < $${args.length}`);
  }
  // Optional day filter (presentation-timezone dates, D16): from/to are
  // YYYY-MM-DD; a single day is from=to. Powers the arrows and the calendar.
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const from = p.get("from") || null;
  const to = p.get("to") || null;
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return json(res, 400, { error: "bad date" });
  if (from) {
    args.push(from);
    where.push(`(t.created_at AT TIME ZONE 'America/New_York')::date >= $${args.length}::date`);
  }
  if (to) {
    args.push(to);
    where.push(`(t.created_at AT TIME ZONE 'America/New_York')::date <= $${args.length}::date`);
  }
  args.push(limit + 1);

  try {
    const rows = await withRoom(async (c) =>
      (await c.query(
        `SELECT t.id, t.source_type, t.created_at, t.importance,
                t.metadata->>'era' AS era,
                t.metadata->>'kind' AS kind,
                t.metadata->>'sender' AS sender,
                (t.metadata->>'provisional')::boolean AS provisional,
                t.metadata->'witnessed_by' AS witnessed_by,
                t.content
           FROM ew_alpha.thoughts t
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
