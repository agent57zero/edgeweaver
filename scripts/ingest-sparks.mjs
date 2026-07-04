// ingest-sparks.mjs — insert parsed SPARKs into OB1 as pm_teaching thoughts (Phase 0b).
// STAGED: requires SUPABASE_SERVICE_KEY in .env.local (queued from Alan). Exits 2 if absent.
// Per conventions/memory-conventions.md: source_type=pm_teaching (library class),
// audience=public, license+attribution on every row; parent per SPARK + child per experiment
// with derived_from edges (tolerates missing thought_edges table with a warning).
// Idempotent: skips SPARKs whose matrix_code already exists.
// EMBEDDINGS: this inserts rows only. Check how the instance embeds (server trigger vs
// scripted backfill — see OB1 recipes) and run the backfill if search misses these rows.
// Usage: node scripts/ingest-sparks.mjs [--limit N]
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const env = Object.fromEntries(
  (await readFile(join(ROOT, ".env.local"), "utf8")).split(/\r?\n/)
    .map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
);
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = env;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing from .env.local");
if (!SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_KEY missing — ingestion is STAGED until Alan provides it (decisions.md queue).");
  process.exit(2);
}
const H = {
  apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};
const api = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

const rows = (await readFile(join(ROOT, "corpus", "sparks-parsed.jsonl"), "utf8"))
  .split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
console.log(`loaded ${rows.length} parsed SPARKs`);

let useColumn = true; // source_type as column; fall back to metadata if the column 400s
let edgesOk = true;
let inserted = 0, children = 0, skipped = 0;

async function insertThought(content, meta) {
  const base = { content, metadata: meta };
  let body = useColumn ? { ...base, source_type: "pm_teaching" } : { ...base, metadata: { ...meta, source_type: "pm_teaching" } };
  let r = await fetch(api("thoughts"), { method: "POST", headers: H, body: JSON.stringify(body) });
  if (r.status === 400 && useColumn) {
    useColumn = false;
    console.warn("  source_type column rejected — falling back to metadata.source_type");
    return insertThought(content, meta);
  }
  if (!r.ok) throw new Error(`thoughts POST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json())[0];
}

for (const s of rows.slice(0, LIMIT)) {
  // idempotency probe by matrix_code
  const q = await fetch(api(`thoughts?select=id&metadata->>matrix_code=eq.${s.matrix_code}&limit=1`), { headers: H });
  if (q.ok && (await q.json()).length) { skipped++; continue; }

  const meta = {
    kind: "spark", spark_number: s.spark, matrix_code: s.matrix_code, section: "distinction+notes",
    audience: "public", license: s.license, attribution: s.attribution,
    source_url: s.source_url, parse_status: s.parse_status,
  };
  const content = `SPARK ${s.spark}\n\nDISTINCTION: ${s.distinction}\n\nNOTES: ${s.notes}`.slice(0, 12000);
  const parent = await insertThought(content, meta);
  inserted++;

  for (const e of s.experiments) {
    const child = await insertThought(`SPARK ${s.spark} EXPERIMENT ${e.code}\n\n${e.text}`.slice(0, 8000),
      { ...meta, section: "experiment", matrix_code: e.code });
    children++;
    if (edgesOk) {
      const er = await fetch(api("thought_edges"), {
        method: "POST", headers: { ...H, Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({ from_thought_id: child.id, to_thought_id: parent.id, relation: "derived_from" }),
      });
      if (er.status === 404) { edgesOk = false; console.warn("  thought_edges table absent — edges skipped (OB1 KG migration not applied; non-fatal)"); }
    }
    await sleep(120);
  }
  await sleep(150);
  if (inserted % 25 === 0) console.log(`  ${inserted} SPARKs in (${children} experiments)...`);
}
console.log(`done: ${inserted} parents, ${children} experiment children, ${skipped} already present, edges=${edgesOk ? "written" : "skipped"}`);
console.log("NEXT: verify counts + run the retrieval-scoping tests (checklist 00); check embedding backfill.");
