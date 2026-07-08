// spawn.mjs - clone the live brain into a fresh scratch schema in the lab (D15 / BRAINS.md).
//   node scripts/brains/spawn.mjs --name gen1-cand-a --generation 1 [--purpose "..."]
//        [--ddl brains/schema/ddl-v1.sql] [--dry-run]
// Source is the LIVE brain READ-ONLY (SELECT only; hygiene rule 3); target is the lab
// project (LAB_DB_URL in .env.local). Steps: transform DDL to the scratch schema, check the
// vector extension exists in the lab, apply DDL, stream-copy every table in FK order via
// CSV, verify per-table count parity source-vs-scratch, register the profile. --dry-run
// prints the full plan and generated SQL head with NO connections and NO registry write.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry, saveRegistry, loadEnv } from "./profiles.mjs";
import { schemaNameFor, transformDdl, parseTables, copyOrder, copyPlan, countSql } from "./sql-gen.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const has = (n) => args.includes("--" + n);

const name = flag("name");
const generation = flag("generation") != null ? Number(flag("generation")) : null;
const purpose = flag("purpose") || "unstated (set --purpose)";
const ddlPath = flag("ddl") || join(ROOT, "brains", "schema", "ddl-v1.sql");
const extSchema = flag("ext-schema") || "public"; // where the lab's vector extension lives
const dryRun = has("dry-run");

if (!name || generation == null || Number.isNaN(generation)) {
  console.error("usage: spawn.mjs --name <slug> --generation <N> [--purpose s] [--ddl path] [--dry-run]");
  process.exit(2);
}

const schema = schemaNameFor(name);
const ddl = await readFile(ddlPath, "utf8");
const tables = parseTables(ddl);
if (!tables.length) { console.error(`FAIL: no CREATE TABLE public.* found in ${ddlPath}`); process.exit(1); }
const ordered = copyOrder(ddl);
const transformed = transformDdl(ddl, schema, { extSchema });

if (dryRun) {
  console.log(`DRY RUN spawn "${name}" -> lab schema ${schema} (generation ${generation})`);
  console.log(`  ddl: ${ddlPath} (${tables.length} tables)`);
  console.log(`  copy order: ${ordered.join(", ")}`);
  console.log(`  plan: check vector extension in lab; apply transformed DDL; \\copy ${ordered.length} tables live->lab; count parity check; registry row (status active, era for writebacks: rehearsal)`);
  console.log("  transformed DDL head:\n" + transformed.split("\n").slice(0, 12).map((l) => "    " + l).join("\n"));
  process.exit(0);
}

const { runSqlText, query, runMeta, makeWorkDir, cleanWorkDir } = await import("./db.mjs");
const env = await loadEnv(ROOT);
const liveUrl = env.SUPABASE_DB_URL, labUrl = env.LAB_DB_URL;
if (!liveUrl || !labUrl) { console.error("FAIL: need SUPABASE_DB_URL and LAB_DB_URL in .env.local (lab gate - BRAINS.md section 6)"); process.exit(1); }

const reg = await loadRegistry(ROOT);
if (reg.brains.some((b) => b.name === name && b.status === "active")) { console.error(`FAIL: active profile "${name}" already exists`); process.exit(1); }

const vector = query(labUrl, "SELECT 1 FROM pg_extension WHERE extname='vector';");
if (!vector.length) { console.error("FAIL: lab project lacks the vector extension (run CREATE EXTENSION vector; once in the lab SQL editor)"); process.exit(1); }

// a failed spawn leaves an UNREGISTERED partial schema that retire cannot see - detect it
const residue = query(labUrl, "SELECT 1 FROM information_schema.schemata WHERE schema_name='" + schema + "';");
if (residue.length) {
  if (!has("force-clean")) { console.error("FAIL: lab schema " + schema + " already exists (residue of a failed spawn?). Re-run with --force-clean to drop it and respawn."); process.exit(1); }
  console.log("  --force-clean: dropping existing " + schema + " ...");
  runSqlText(labUrl, 'DROP SCHEMA "' + schema + '" CASCADE;', "clean-" + schema);
}

const spawnedAt = new Date().toISOString();
console.log(`spawn "${name}" -> ${schema}: applying DDL (${tables.length} tables)...`);
runSqlText(labUrl, transformed, "ddl-" + schema);

const work = makeWorkDir();
try {
  const plan = copyPlan(ordered, schema, work);
  for (const p of plan) {
    process.stdout.write(`  copy ${p.table} ... `);
    runMeta(liveUrl, p.out);
    runMeta(labUrl, p.in);
    console.log("ok");
  }
  const src = Object.fromEntries(query(liveUrl, countSql("public", ordered)));
  const dst = Object.fromEntries(query(labUrl, countSql(schema, ordered)));
  const drift = ordered.filter((t) => src[t] !== dst[t]);
  if (drift.length) {
    console.error("FAIL: count drift on " + drift.map((t) => `${t} (live ${src[t]} vs scratch ${dst[t]})`).join(", "));
    console.error("scratch left in place for inspection; retire it with retire.mjs when done");
    process.exit(1);
  }
  reg.brains.push({
    name, kind: "scratch", schema, connEnv: "LAB_DB_URL", restUrlEnv: null, restKeyEnv: null,
    schemaVersion: reg.schemaVersionCurrent, soulRef: "main", generation,
    created: spawnedAt.slice(0, 10), spawnedAt, retired: null, status: "active", purpose,
  });
  await saveRegistry(reg, ROOT);
  console.log(`PASS: scratch "${name}" live in lab schema ${schema}; ${ordered.length} tables, counts match (${Object.values(src).reduce((a, n) => a + Number(n), 0)} rows). Registered.`);
} finally {
  cleanWorkDir(work);
}
