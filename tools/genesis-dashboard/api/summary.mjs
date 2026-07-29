// GET /api/summary
// Header counts: visible (alan-audience, Edgeweaver-type) thoughts by type,
// latest write, and lesson tallies.
import { withRoom, json, fail, ALAN_ONLY, ALLOWED_TYPES } from "./_lib/db.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });
  try {
    const out = await withRoom(async (c) => {
      const types = (await c.query(
        `SELECT t.source_type, count(*)::int AS n, max(t.created_at) AS latest
           FROM public.thoughts t
          WHERE ${ALAN_ONLY} AND t.source_type = ANY($1)
          GROUP BY 1`,
        [ALLOWED_TYPES]
      )).rows;
      const lessons = (await c.query(
        `SELECT can_use_as_instruction AS confirmed, count(*)::int AS n
           FROM public.agent_memories
          WHERE workspace_id = 'edgeweaver'
            AND lifecycle_status = 'active' AND memory_type = 'lesson'
          GROUP BY 1`
      )).rows;
      return { types, lessons };
    });
    // The headline count stays the curated record; the session stream (D38) is
    // its own number, never inflating "memories".
    const total = out.types.filter((r) => r.source_type !== "inner_dialogue").reduce((s, r) => s + r.n, 0);
    const latest = out.types.map((r) => r.latest && new Date(r.latest).toISOString()).sort().pop() || null;
    const lessons = { confirmed: 0, pending: 0 };
    for (const r of out.lessons) lessons[r.confirmed ? "confirmed" : "pending"] = r.n;
    return json(res, 200, {
      total,
      latest,
      types: Object.fromEntries(out.types.map((r) => [r.source_type, r.n])),
      lessons,
    });
  } catch (err) {
    return fail(res, err);
  }
}
