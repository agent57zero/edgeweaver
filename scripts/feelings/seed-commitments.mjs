// seed-commitments.mjs - A10: seed state/commitments.json (sadness-signal tracker; state-schemas)
// from current open threads. Night-loop step 11 feeds it nightly thereafter. DARK: seeds from a
// --source json of open threads; at arming, open threads come from OB1. Renegotiated != overdue
// (declare-then-do allows renegotiation; silently dropping does not) - enforced in signals.mjs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); if (i < 0) return d; const v = argv[i + 1]; return (v === undefined || v.startsWith("--")) ? true : v; };
const sourcePath = opt("source", null);
const out = opt("out", join(ROOT, "state", "commitments.json"));

let commitments = [];
if (sourcePath && existsSync(sourcePath)) {
  const j = JSON.parse(await readFile(sourcePath, "utf8"));
  commitments = (j.commitments || j).map((c, i) => ({
    id: c.id || `c-${String(i + 1).padStart(3, "0")}`,
    text: c.text,
    made: c.made || new Date().toISOString().slice(0, 10),
    due: c.due || null,
    status: c.status || "open",
    source_thought: c.source_thought || null,
  }));
}
await mkdir(join(ROOT, "state"), { recursive: true });
await writeFile(out, JSON.stringify({ commitments }, null, 2) + "\n", "utf8");
console.log(`commitments.json written: ${commitments.length} commitment(s) -> ${out}`);
