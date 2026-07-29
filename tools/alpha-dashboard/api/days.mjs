// GET /api/days?type=
// Distinct presentation-timezone dates that have visible rows for the current
// view, newest first, with counts. Powers the day-step arrows (jump to days
// that actually have entries) and the calendar picker.
import { withRoom, params, json, fail, SEATS_ONLY, ALLOWED_TYPES } from "./_lib/db.mjs";

const TZ = "America/New_York"; // D16: tz owns presentation

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });
  const p = params(req);
  const type = p.get("type") || null;
  if (type && !ALLOWED_TYPES.includes(type)) return json(res, 400, { error: "unknown type" });

  const where = [SEATS_ONLY];
  const args = [];
  if (type) {
    args.push(type);
    where.push(`t.source_type = $${args.length}`);
  } else {
    where.push(`t.source_type <> 'inner_dialogue'`);
  }

  try {
    const items = await withRoom(async (c) =>
      (await c.query(
        `SELECT (t.created_at AT TIME ZONE '${TZ}')::date::text AS d, count(*)::int AS n
           FROM ew_alpha.thoughts t
          WHERE ${where.join(" AND ")}
          GROUP BY 1
          ORDER BY 1 DESC
          LIMIT 500`,
        args
      )).rows
    );
    return json(res, 200, { items });
  } catch (err) {
    return fail(res, err);
  }
}
