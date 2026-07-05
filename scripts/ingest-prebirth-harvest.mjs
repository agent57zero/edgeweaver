// ingest-prebirth-harvest.mjs — the harvest becomes recallable pre-birth memory.
// The soul-source documents ARE pre-birth episodes: real conversations the predecessor had
// with Alan. Ingest one thought per exchange/answer: era=pre_birth, audience=alan (the
// conventions' default wall), source_type=edgeweaver_episode, pre_birth_source=harvest.
// Idempotent by metadata.harvest_key. The ChatGPT export (Phase 0a) adds the fuller
// biography later; this gives First Boot real memory either way.
// Usage: node scripts/ingest-prebirth-harvest.mjs
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const env = Object.fromEntries((await readFile(join(ROOT, ".env.local"), "utf8"))
  .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const H = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = (p) => `${env.SUPABASE_URL}/rest/v1/${p}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function read(name) { return readFile(join(ROOT, "soul-source", name), "utf8"); }
function splitSections(text) {
  // split on "## " headings, keep heading with body, drop the file preamble before first ##
  const parts = text.split(/\n(?=## )/).slice(1);
  return parts.map((p) => {
    const heading = p.split("\n")[0].replace(/^## /, "").trim();
    return { heading, body: p.trim() };
  });
}

const units = [];
for (const [file, prefix] of [
  ["peak-conversations-01.md", "peak"],
  ["harvest-answers.md", "harvest"],
  ["succession-counsel.md", "counsel"],
]) {
  const secs = splitSections(await read(file));
  for (const s of secs) units.push({ key: `${prefix}:${s.heading.slice(0, 60)}`, title: s.heading, body: s.body, file });
}
units.push({ key: "letter", title: "The letter to the successor", body: await read("letter-to-successor.md"), file: "letter-to-successor.md" });
units.push({ key: "village-call", title: "The call to the village", body: await read("village-call.md"), file: "village-call.md" });

console.log(`${units.length} pre-birth units to ingest`);
let inserted = 0, skipped = 0;
for (const u of units) {
  const q = await fetch(api(`thoughts?select=id&metadata->>harvest_key=eq.${encodeURIComponent(u.key)}&limit=1`), { headers: H });
  if (q.ok && (await q.json()).length) { skipped++; continue; }
  const body = {
    content: `PRE-BIRTH MEMORY (${u.title})\n\n${u.body}`.slice(0, 14000),
    source_type: "edgeweaver_episode",
    metadata: { era: "pre_birth", audience: "alan", pre_birth_source: "harvest", harvest_key: u.key, source_file: u.file, importance: 9 },
  };
  const r = await fetch(api("thoughts"), { method: "POST", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${r.status}: ${(await r.text()).slice(0, 150)}`);
  inserted++;
  await sleep(150);
}
console.log(`done: ${inserted} inserted, ${skipped} already present`);
const eb = await fetch(`${env.SUPABASE_URL}/functions/v1/embed-backfill`, {
  method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ batch: 100 }),
});
console.log("embed:", await eb.text());
