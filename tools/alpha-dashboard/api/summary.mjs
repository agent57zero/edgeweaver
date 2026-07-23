// GET /api/summary
// Header counts: visible (seats-audience) thoughts by type, latest write,
// and lesson tallies.
import { withRoom, json, fail, SEATS_ONLY } from "./_lib/db.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });
  try {
    const out = await withRoom(async (c) => {
      const types = (await c.query(
        `SELECT t.source_type, count(*)::int AS n, max(t.created_at) AS latest
           FROM ew_alpha.thoughts t
          WHERE ${SEATS_ONLY}
          GROUP BY 1`
      )).rows;
      const lessons = (await c.query(
        `SELECT can_use_as_instruction AS confirmed, count(*)::int AS n
           FROM ew_alpha.agent_memories
          WHERE lifecycle_status = 'active' AND memory_type = 'lesson'
          GROUP BY 1`
      )).rows;
      return { types, lessons };
    });
    const total = out.types.reduce((s, r) => s + r.n, 0);
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
