// migrate.mjs - apply schema migrations across the fleet (D15 / BRAINS.md propagation:
// schema changes have ONE source, brains/schema/migrations/NNNN-*.sql, applied in order).
//   node scripts/brains/migrate.mjs --to <N> (--profile <name> | --all) [--dry-run]
// --all order is scratches first, live LAST (hygiene rule 4). For a scratch the migration
// SQL is schema-rewritten exactly like spawn's DDL transform; live applies as written
// (public). Each success bumps the row's schemaVersion; when every active row reaches N,
// schemaVersionCurrent bumps too.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry, saveRegistry, loadEnv } from "./profiles.mjs";
import { transformDdl } from "./sql-gen.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const MIG = join(ROOT, "brains", "schema", "migrations");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const to = flag("to") != null ? Number(flag("to")) : null;
const profileName = flag("profile");
const all = args.includes("--all");
const dryRun = args.includes("--dry-run");

if (to == null || Number.isNaN(to) || (!profileName && !all)) {
  console.error("usage: migrate.mjs --to <N> (--profile <name> | --all) [--dry-run]");
  process.exit(2);
}

const files = (await readdir(MIG).catch(() => []))
  .filter((f) => /^\d{4}-.*\.sql$/.test(f)).sort();
const version = (f) => Number(f.slice(0, 4));

const reg = await loadRegistry(ROOT);
let targets = all ? reg.brains.filter((b) => b.status === "active") : reg.brains.filter((b) => b.name === profileName && b.status === "active");
if (!targets.length) { console.error(`FAIL: no active target${profileName ? ` "${profileName}"` : "s"}`); process.exit(1); }
targets = [...targets.filter((b) => b.kind === "scratch"), ...targets.filter((b) => b.kind !== "scratch")]; // live last

let touched = false;
for (const b of targets) {
  const pending = files.filter((f) => version(f) > b.schemaVersion && version(f) <= to);
  const missing = [];
  for (let v = b.schemaVersion + 1; v <= to; v++) if (!files.some((f) => version(f) === v)) missing.push(v);
  if (missing.length) { console.error(`FAIL: ${b.name}: no migration file for version(s) ${missing.join(", ")} in brains/schema/migrations/`); process.exit(1); }
  if (!pending.length) { console.log(`  ${b.name}: already at ${b.schemaVersion} (>= ${to})`); continue; }

  for (const f of pending) {
    const raw = await readFile(join(MIG, f), "utf8");
    const sql = b.schema === "public" ? raw : transformDdl(raw, b.schema).replace(/^CREATE SCHEMA IF NOT EXISTS[^\n]*\n\n/, "");
    if (dryRun) { console.log(`  DRY RUN ${b.name}: would apply ${f} to schema ${b.schema}`); continue; }
    const { runSqlText } = await import("./db.mjs");
    const env = await loadEnv(ROOT);
    const url = env[b.connEnv];
    if (!url) { console.error(`FAIL: ${b.connEnv} missing from .env.local`); process.exit(1); }
    process.stdout.write(`  ${b.name}: applying ${f} to ${b.schema} ... `);
    runSqlText(url, sql, f.replace(/\.sql$/, "") + "-" + b.schema);
    console.log("ok");
    b.schemaVersion = version(f);
    touched = true;
    await saveRegistry(reg, ROOT);
  }
}

if (!dryRun && touched && reg.brains.filter((b) => b.status === "active").every((b) => b.schemaVersion >= to)) {
  reg.schemaVersionCurrent = to;
  await saveRegistry(reg, ROOT);
}
console.log(dryRun ? "DRY RUN complete" : `PASS: fleet at schemaVersion ${reg.schemaVersionCurrent} (targets migrated to ${to})`);
