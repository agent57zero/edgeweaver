// filter-edgeweaver-convos.mjs - A17: Phase 0a import filter (IMPLEMENTATION §3). From a ChatGPT
// export conversations.json, keep only Edgeweaver-relevant conversations - by gizmo_id (the custom
// GPT) OR a title whitelist - and report the kept count. The kept set becomes pre-birth episodic
// memory; everything else is dropped. At arming, Alan supplies the real gizmo_id(s) + titles.
import { readFile, writeFile } from "node:fs/promises";

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); if (i < 0) return d; const v = argv[i + 1]; return (v === undefined || v.startsWith("--")) ? true : v; };

export function filterConversations(convos, { gizmoIds = [], titlePatterns = [] } = {}) {
  const rx = titlePatterns.map((p) => new RegExp(p, "i"));
  const kept = convos.filter((c) => {
    const gid = c.gizmo_id || c.metadata?.gizmo_id || c.conversation_template_id;
    if (gid && gizmoIds.includes(gid)) return true;
    return rx.some((r) => r.test(c.title || ""));
  });
  return { kept, keptCount: kept.length, total: convos.length, dropped: convos.length - kept.length };
}

if (process.argv[1] && process.argv[1].endsWith("filter-edgeweaver-convos.mjs")) {
  const inp = opt("in", null), out = opt("out", null);
  const gizmoIds = (opt("gizmos", "") || "").split(",").filter(Boolean);
  const titlePatterns = (opt("titles", "") || "").split(",").filter(Boolean);
  const convos = JSON.parse(await readFile(inp, "utf8"));
  const r = filterConversations(convos, { gizmoIds, titlePatterns });
  if (out) await writeFile(out, JSON.stringify(r.kept, null, 2));
  console.log(`kept ${r.keptCount}/${r.total} (dropped ${r.dropped})`);
}
