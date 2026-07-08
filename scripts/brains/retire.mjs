// retire.mjs - drop a scratch brain's schema in the lab and mark its registry row retired
// (the row stays as history; BRAINS.md hygiene rule 1). Never touches live: refuses any
// profile whose kind is not "scratch".
//   node scripts/brains/retire.mjs --name gen1-cand-a [--dry-run]
import { join } from "node:path";
import { loadRegistry, saveRegistry, loadEnv } from "./profiles.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const name = flag("name");
const dryRun = args.includes("--dry-run");
if (!name) { console.error("usage: retire.mjs --name <slug> [--dry-run]"); process.exit(2); }

const reg = await loadRegistry(ROOT);
const row = reg.brains.find((b) => b.name === name);
if (!row) { console.error(`FAIL: no profile "${name}"`); process.exit(1); }
if (row.kind !== "scratch") { console.error(`FAIL: refusing - "${name}" is kind=${row.kind}, only scratches retire`); process.exit(1); }
if (row.status !== "active") { console.error(`FAIL: "${name}" already ${row.status}`); process.exit(1); }

const sql = `DROP SCHEMA "${row.schema.replace(/"/g, '""')}" CASCADE;`;
if (dryRun) { console.log(`DRY RUN retire "${name}": ${sql} then registry status=retired`); process.exit(0); }

const { runSqlText } = await import("./db.mjs");
const env = await loadEnv(ROOT);
if (!env.LAB_DB_URL) { console.error("FAIL: LAB_DB_URL missing from .env.local"); process.exit(1); }
runSqlText(env.LAB_DB_URL, sql, "retire-" + row.schema);
row.status = "retired";
row.retired = new Date().toISOString().slice(0, 10);
await saveRegistry(reg, ROOT);
console.log(`PASS: scratch "${name}" retired; schema ${row.schema} dropped; registry row kept as history.`);
