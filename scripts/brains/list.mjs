// list.mjs - print the brain registry (D15 / BRAINS.md). Metadata only; no connections.
//   node scripts/brains/list.mjs [--all]   (--all includes retired rows)
import { loadRegistry } from "./profiles.mjs";

const all = process.argv.includes("--all");
const reg = await loadRegistry();
const rows = reg.brains.filter((b) => all || b.status === "active");
console.log(`brains (schemaVersionCurrent ${reg.schemaVersionCurrent}):`);
for (const b of rows) {
  console.log(
    `  ${b.name.padEnd(16)} ${b.kind.padEnd(8)} schema=${b.schema.padEnd(20)} gen=${String(b.generation).padEnd(3)} ` +
    `sv=${String(b.schemaVersion).padEnd(3)} ${b.status.padEnd(8)} created=${b.created}${b.retired ? " retired=" + b.retired : ""}  ${b.purpose}`
  );
}
if (!rows.length) console.log("  (none)");
