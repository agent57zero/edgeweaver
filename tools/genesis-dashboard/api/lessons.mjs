// GET /api/lessons
// Genesis's lessons from public.agent_memories (workspace edgeweaver):
// confirmed rules first, then pending candidates. Read-only display;
// confirmation itself stays with Alan (D19: only Alan's confirmation can set
// can_use_as_instruction), never this dashboard.
import { withRoom, json, fail } from "./_lib/db.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });
  try {
    const items = await withRoom(async (c) =>
      (await c.query(
        `SELECT id, summary, content, confidence, can_use_as_instruction, created_at
           FROM public.agent_memories
          WHERE workspace_id = 'edgeweaver'
            AND lifecycle_status = 'active' AND memory_type = 'lesson'
          ORDER BY can_use_as_instruction DESC, created_at DESC
          LIMIT 200`
      )).rows
    );
    return json(res, 200, { items });
  } catch (err) {
    return fail(res, err);
  }
}
