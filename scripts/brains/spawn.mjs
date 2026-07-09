// spawn.mjs - clone a brain into a fresh scratch schema in the lab (D15 / D17 / BRAINS.md).
//   node scripts/brains/spawn.mjs --name gen1-cand-a --generation 1 [--purpose "..."]
//        [--ddl brains/schema/ddl-v1.sql] [--dry-run]                       (live-copy mode)
//   node scripts/brains/spawn.mjs --name past-brain --generation 0 --from-dump <file> [--dry-run]
//                                                                           (past-brain mode)
// LIVE-COPY (default): source is the LIVE brain READ-ONLY (SELECT only; hygiene rule 3). Steps:
// transform DDL to the scratch schema, check the vector extension exists in the lab, apply DDL,
// stream-copy every table in FK order via CSV, verify per-table count parity source-vs-scratch,
// register. --dry-run prints the plan and generated SQL head with NO connections / NO registry
// write.
// PAST-BRAIN (--from-dump, D17 / BRAINS.md section 7): source is a DECRYPTED nightly backup (a
// full plain-SQL pg_dump; a custom-format "PGDMP" file is converted with pg_restore -f first).
// The dump itself is the source of truth, so there is NO live parity check - the schema rewrite
// runs ONLY over DDL and COPY header lines, never over data (dump-transform.mjs, fixture-pinned).
// Decryption needs Alan's age key, so this mode is Alan-present, never automated. The two modes
// are mutually exclusive: --from-dump ignores --ddl. --dry-run works for both.
import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { loadRegistry, saveRegistry, loadEnv } from "./profiles.mjs";
import { schemaNameFor, transformDdl, parseTables, copyOrder, copyPlan, countSql } from "./sql-gen.mjs";
import { transformDumpSql } from "./dump-transform.mjs";

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
const fromDump = flag("from-dump"); // past-brain mode: path to a DECRYPTED nightly dump

if (!name || generation == null || Number.isNaN(generation)) {
  console.error("usage: spawn.mjs --name <slug> --generation <N> [--purpose s] [--ddl path | --from-dump file] [--dry-run] [--force-clean]");
  process.exit(2);
}

const schema = schemaNameFor(name);

// ---- PAST-BRAIN mode (--from-dump): restore a decrypted nightly dump into the scratch, dark.
// Self-contained: it handles its own dry-run and real apply and exits, so control never reaches
// the live-copy path below. The plain-dump dry-run touches no db.mjs (hermetic); only a custom
// dump reaches for pg_restore, and only the real apply connects to the lab.
if (fromDump) {
  const rawDump = await readFile(fromDump); // Buffer: sniff the format magic before decoding
  const isCustom = rawDump.length >= 5 && rawDump.subarray(0, 5).toString("latin1") === "PGDMP";
  let plain, format;
  if (isCustom) {
    format = "custom";
    try {
      const { pgRestoreToPlain } = await import("./db.mjs"); // pg_restore -f, no connection
      plain = pgRestoreToPlain(fromDump);
    } catch (e) {
      console.error("FAIL: " + e.message + " (--from-dump is a PGDMP custom archive; needs pg_restore and a valid, fully-decrypted dump)");
      process.exit(1);
    }
  } else {
    format = "plain";
    plain = rawDump.toString("utf8");
  }
  const dumpTables = parseTables(plain);
  if (!dumpTables.length) { console.error(`FAIL: no CREATE TABLE public.* found in ${fromDump} (is it a full ${format} dump of the brain?)`); process.exit(1); }
  const transformedDump = transformDumpSql(plain, schema, { extSchema });
  const dumpName = basename(fromDump);

  if (dryRun) {
    console.log(`DRY RUN spawn --from-dump "${name}" -> lab schema ${schema} (generation ${generation})`);
    console.log(`  dump: ${fromDump}`);
    console.log(`  format detected: ${format} (${dumpTables.length} tables)`);
    console.log(`  tables: ${dumpTables.join(", ")}`);
    console.log(`  plan: check vector extension in lab; apply transformed dump (DDL + COPY data) to ${schema}; per-table row counts from the scratch (NO live parity - the dump is the source of truth; compared to this night's restore-points.jsonl map line at the age-key rehearsal); registry row (status active, sourceDump ${dumpName}, era for writebacks: rehearsal)`);
    console.log("  transformed head:\n" + transformedDump.split("\n").slice(0, 12).map((l) => "    " + l).join("\n"));
    process.exit(0);
  }

  const { runSqlText, query } = await import("./db.mjs");
  const env = await loadEnv(ROOT);
  const labUrl = env.LAB_DB_URL;
  if (!labUrl) { console.error("FAIL: need LAB_DB_URL in .env.local (lab gate - BRAINS.md section 6)"); process.exit(1); }

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
  console.log(`spawn --from-dump "${name}" (${dumpName}, ${format}) -> ${schema}: applying transformed dump (${dumpTables.length} tables)...`);
  runSqlText(labUrl, transformedDump, "dump-" + schema); // temp file + runSqlFile, ON_ERROR_STOP
  const counts = Object.fromEntries(query(labUrl, countSql(schema, dumpTables)));
  const total = dumpTables.reduce((a, t) => a + Number(counts[t] || 0), 0);
  console.log("  per-table row counts in " + schema + " (from the dump; no live parity by design):");
  for (const t of dumpTables) console.log(`    ${t}: ${counts[t] ?? "0"}`);
  console.log("  note: compare these to this night's restore-points.jsonl map line at the age-key rehearsal (BRAINS.md section 7 STOP).");
  reg.brains.push({
    name, kind: "scratch", schema, connEnv: "LAB_DB_URL", restUrlEnv: null, restKeyEnv: null,
    schemaVersion: reg.schemaVersionCurrent, soulRef: "main", generation,
    created: spawnedAt.slice(0, 10), spawnedAt, retired: null, status: "active", purpose,
    sourceDump: dumpName,
  });
  await saveRegistry(reg, ROOT);
  console.log(`PASS: past-brain "${name}" live in lab schema ${schema}; ${dumpTables.length} tables, ${total} rows from ${dumpName}. Registered (sourceDump ${dumpName}).`);
  process.exit(0);
}

// ---- LIVE-COPY mode (default; unchanged) ----
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
