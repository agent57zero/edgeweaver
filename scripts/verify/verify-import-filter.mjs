// verify-import-filter.mjs - A17 dark verify: a synthetic conversations.json fixture filters to the
// Edgeweaver conversations by gizmo_id OR title whitelist, with a correct kept-count; unrelated
// conversations are dropped.
import { filterConversations } from "../filter-edgeweaver-convos.mjs";

const fails = [];
const convos = [
  { title: "Edgeweaver kickoff", gizmo_id: "g-edgeweaver" },
  { title: "Possibility Management chat", gizmo_id: "g-other" },
  { title: "random recipe ideas", gizmo_id: "g-other" },
  { title: "grocery list" },
];
const r = filterConversations(convos, { gizmoIds: ["g-edgeweaver"], titlePatterns: ["possibility"] });
if (r.keptCount !== 2) fails.push(`expected 2 kept, got ${r.keptCount}`);
if (!r.kept.some((c) => c.gizmo_id === "g-edgeweaver")) fails.push("gizmo_id match not kept");
if (!r.kept.some((c) => /possibility/i.test(c.title))) fails.push("title match not kept");
if (r.kept.some((c) => c.title === "grocery list")) fails.push("unrelated conversation kept");
if (r.dropped !== 2) fails.push(`expected 2 dropped, got ${r.dropped}`);

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: 0a import filter - kept ${r.keptCount}/${r.total} by gizmo_id + title whitelist (dropped ${r.dropped} unrelated).`);
