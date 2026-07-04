// ingest-library.mjs — insert the Distinctionary (pm_teaching) and the Coherence shelf
// (coherence_teaching) into OB1. STAGED: requires SUPABASE_SERVICE_KEY (exits 2 if absent).
// Idempotent by metadata.term / metadata.chunk_id. Same conventions as ingest-sparks.mjs.
// Usage: node scripts/ingest-library.mjs [--only distinctionary|coherence] [--limit N]
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const env = Object.fromEntries(
  (await readFile(join(ROOT, ".env.local"), "utf8")).split(/\r?\n/)
    .map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
);
if (!env.SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_KEY missing — ingestion STAGED (decisions.md queue).");
  process.exit(2);
}
const H = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json", Prefer: "return=representation" };
const api = (p) => `${env.SUPABASE_URL}/rest/v1/${p}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const LIMIT = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1], 10) : Infinity;

let useColumn = true;
async function insertThought(content, sourceType, meta) {
  const base = { content: content.slice(0, 12000), metadata: meta };
  const body = useColumn ? { ...base, source_type: sourceType }
                         : { ...base, metadata: { ...meta, source_type: sourceType } };
  const r = await fetch(api("thoughts"), { method: "POST", headers: H, body: JSON.stringify(body) });
  if (r.status === 400 && useColumn) { useColumn = false; console.warn("  source_type column rejected — metadata fallback"); return insertThought(content, sourceType, meta); }
  if (!r.ok) throw new Error(`POST thoughts ${r.status}: ${(await r.text()).slice(0, 180)}`);
  return (await r.json())[0];
}
async function exists(field, value) {
  const q = await fetch(api(`thoughts?select=id&metadata->>${field}=eq.${encodeURIComponent(value)}&limit=1`), { headers: H });
  return q.ok && (await q.json()).length > 0;
}
const loadJsonl = async (p) => (await readFile(join(ROOT, p), "utf8")).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));

if (!only || only === "distinctionary") {
  const rows = await loadJsonl("corpus/distinctionary-parsed.jsonl");
  console.log(`distinctionary: ${rows.length} entries`);
  let n = 0, skip = 0;
  for (const r of rows.slice(0, LIMIT)) {
    if (await exists("term", r.term)) { skip++; continue; }
    await insertThought(`DISTINCTION: ${r.term}\n\n${r.definition}`, "pm_teaching", {
      kind: "distinction_gloss", term: r.term, see_also: r.see_also, bubble_url: r.bubble_url,
      audience: "public", license: r.license, attribution: r.attribution, source_url: r.source_url });
    n++; if (n % 50 === 0) console.log(`  ${n}...`);
    await sleep(120);
  }
  console.log(`distinctionary done: ${n} inserted, ${skip} already present`);
}

if (!only || only === "coherence") {
  const rows = await loadJsonl("corpus/coherence-parsed.jsonl");
  console.log(`coherence shelf: ${rows.length} chunks`);
  let n = 0, skip = 0;
  for (const r of rows.slice(0, LIMIT)) {
    if (await exists("chunk_id", r.chunk_id)) { skip++; continue; }
    await insertThought(`${r.title}\n\n${r.content}`, "coherence_teaching", {
      kind: r.kind, chunk_id: r.chunk_id, title: r.title, principle: r.principle,
      scan_pages: r.scan_pages, audience: r.audience, license: r.license, attribution: r.attribution });
    n++; if (n % 25 === 0) console.log(`  ${n}...`);
    await sleep(120);
  }
  console.log(`coherence done: ${n} inserted, ${skip} already present`);
}
console.log("NEXT: retrieval-scoping verifies (checklist 00) + embedding backfill check.");
