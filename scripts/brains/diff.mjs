// diff.mjs - compare a scratch brain against live (D15 / BRAINS.md evaluation aid): per-table
// row counts side by side, plus rows the scratch gained since its spawn (created_at >
// spawnedAt), which is "what the candidate lived". Operator tooling: reads both ends
// directly; the being's own recall still goes only through the scoped wrapper.
//   node scripts/brains/diff.mjs --name gen1-cand-a [--ddl brains/schema/ddl-v1.sql] [--dry-run]
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry, loadEnv } from "./profiles.mjs";
import { parseTables, countSql } from "./sql-gen.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const name = flag("name");
const ddlPath = flag("ddl") || join(ROOT, "brains", "schema", "ddl-v1.sql");
const dryRun = args.includes("--dry-run");
if (!name) { console.error("usage: diff.mjs --name <slug> [--ddl path] [--dry-run]"); process.exit(2); }

const reg = await loadRegistry(ROOT);
const row = reg.brains.find((b) => b.name === name && b.status === "active");
if (!row || row.kind !== "scratch") { console.error(`FAIL: "${name}" is not an active scratch`); process.exit(1); }

const tables = parseTables(await readFile(ddlPath, "utf8"));
if (dryRun) {
  console.log(`DRY RUN diff "${name}": count ${tables.length} tables in public (live) vs ${row.schema} (lab); then per-table rows with created_at > ${row.spawnedAt}`);
  process.exit(0);
}

const { query } = await import("./db.mjs");
const env = await loadEnv(ROOT);
if (!env.SUPABASE_DB_URL || !env.LAB_DB_URL) { console.error("FAIL: need SUPABASE_DB_URL + LAB_DB_URL in .env.local"); process.exit(1); }

const live = Object.fromEntries(query(env.SUPABASE_DB_URL, countSql("public", tables)));
const scratch = Object.fromEntries(query(env.LAB_DB_URL, countSql(row.schema, tables)));
console.log(`diff "${name}" (schema ${row.schema}, spawned ${row.spawnedAt}):`);
console.log("  table".padEnd(26) + "live".padEnd(10) + "scratch".padEnd(10) + "delta");
for (const t of tables) {
  const l = Number(live[t] ?? 0), s = Number(scratch[t] ?? 0);
  console.log(`  ${t.padEnd(24)}${String(l).padEnd(10)}${String(s).padEnd(10)}${s - l >= 0 ? "+" : ""}${s - l}`);
}
const q = (t) => `SELECT '${t}' AS tbl, count(*)::text FROM "${row.schema}"."${t}" WHERE created_at > '${row.spawnedAt}'`;
const withCreated = [];
for (const t of tables) {
  try { withCreated.push(query(env.LAB_DB_URL, q(t) + ";")[0]); } catch { /* table without created_at */ }
}
const lived = withCreated.filter(Boolean).filter(([, n]) => Number(n) > 0);
console.log(lived.length
  ? "  lived since spawn: " + lived.map(([t, n]) => `${t}+${n}`).join(", ")
  : "  lived since spawn: nothing yet");
