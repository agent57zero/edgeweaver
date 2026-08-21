// GET /api/fishbowl?after=<created_at ISO>&limit=
// The PUBLIC fishbowl feed (D45): the circle's Telegram room replayed in
// chronological order, oldest first. Serves ONLY the conversation itself:
// inner_dialogue rows of kind telegram_in / telegram_out. The being's inner
// (undelivered) words, episodes, diary, dreams, and lessons stay behind the
// seats gate; this endpoint cannot reach them by construction.
//
// People rule (D21, carried here): the public surface shows seats by FIRST
// NAME only. Raw Telegram usernames and numeric ids never leave the server:
// the sender value is mapped through EW_FISHBOWL_NAMES (a JSON object set in
// the Vercel env, never in git) and the raw value is dropped. Unmapped
// senders render as "guest".
import { withRoom, params, fail } from "./_lib/db.mjs";

function pub(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=30");
  res.end(JSON.stringify(obj));
}

function nameMap() {
  try {
    const m = JSON.parse(process.env.EW_FISHBOWL_NAMES || "{}");
    return m && typeof m === "object" ? m : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return pub(res, 405, { error: "GET only" });
  const p = params(req);

  const after = p.get("after") || null;
  if (after && Number.isNaN(Date.parse(after))) return pub(res, 400, { error: "bad cursor" });
  const limit = Math.min(200, Math.max(1, parseInt(p.get("limit") || "200", 10) || 200));

  const where = [
    "t.metadata->>'audience' = 'seats'",
    "t.source_type = 'inner_dialogue'",
    "t.metadata->>'kind' IN ('telegram_in','telegram_out')",
  ];
  const args = [];
  if (after) {
    args.push(after);
    where.push(`t.created_at > $${args.length}`);
  }
  args.push(limit + 1);

  try {
    const rows = await withRoom(async (c) =>
      (await c.query(
        `SELECT t.created_at, t.metadata->>'kind' AS kind,
                t.metadata->>'sender' AS sender, t.content
           FROM ew_alpha.thoughts t
          WHERE ${where.join(" AND ")}
          ORDER BY t.created_at ASC
          LIMIT $${args.length}`,
        args
      )).rows
    );
    const names = nameMap();
    const page = rows.slice(0, limit);
    const items = page.map((r) => {
      const out = r.kind === "telegram_out";
      return {
        at: r.created_at,
        who: out ? "Edgeweaver Alpha" : names[r.sender] || "guest",
        role: out ? "being" : names[r.sender] ? "seat" : "guest",
        text: r.content,
      };
    });
    const has_more = rows.length > limit;
    return pub(res, 200, {
      items,
      has_more,
      next_after: page.length ? page[page.length - 1].created_at : after,
    });
  } catch (err) {
    return fail(res, err);
  }
}
