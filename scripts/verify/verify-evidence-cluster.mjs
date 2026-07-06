// verify-evidence-cluster.mjs - A15 dark verify (synthetic recall traces). Memories cited >= N (5)
// AND confirmed cluster into candidate themes with thought-IDs + counts; under-cited or unconfirmed
// memories are excluded.
import { clusterEvidence } from "../evolution/evidence-cluster.mjs";

const fails = [];
const memories = [
  { id: "m1", confirmed: true, theme: "responsibility", content: "radical responsibility" },
  { id: "m2", confirmed: true, theme: "responsibility", content: "own your reactions" },
  { id: "m3", confirmed: true, theme: "clarity", content: "clarity over comfort" },
  { id: "m4", confirmed: false, theme: "responsibility", content: "unconfirmed" },
  { id: "m5", confirmed: true, theme: "clarity", content: "under-cited" },
];
const traces = [];
const cite = (id, n) => { for (let i = 0; i < n; i++) traces.push({ items: [{ memory_id: id, used: true }] }); };
cite("m1", 6); cite("m2", 5); cite("m3", 7); cite("m4", 6); cite("m5", 2);

const clusters = clusterEvidence(traces, memories, 5);
const resp = clusters.find((c) => c.theme === "responsibility");
const clar = clusters.find((c) => c.theme === "clarity");
if (!resp || !resp.thoughtIds.includes("m1") || !resp.thoughtIds.includes("m2")) fails.push("responsibility cluster missing m1/m2");
if (resp && resp.thoughtIds.includes("m4")) fails.push("unconfirmed m4 should be excluded");
if (!clar || !clar.thoughtIds.includes("m3")) fails.push("clarity cluster missing m3");
if (clar && clar.thoughtIds.includes("m5")) fails.push("under-cited m5 should be excluded");
if (resp && resp.citations !== 11) fails.push(`responsibility citations should be 11 (6+5), got ${resp?.citations}`);

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: evidence clustering - confirmed memories cited >=5 cluster by theme with thought-IDs + counts (responsibility m1+m2=11, clarity m3=7); under-cited (m5) and unconfirmed (m4) excluded.");
