// run-all.mjs — run every scripts/verify/verify-*.mjs and summarize (fixed-ropes convention:
// each phase ships verify scripts printing PASS/FAIL). Exit 0 iff all pass.
// Usage: node scripts/verify/run-all.mjs
import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const here = import.meta.dirname;
const node = process.execPath;
const files = (await readdir(here)).filter((f) => /^verify-.*\.mjs$/.test(f)).sort();

let allPass = true;
const rows = [];
for (const f of files) {
  let out = "", ok = true;
  try { out = execFileSync(node, [join(here, f)], { encoding: "utf8" }); }
  catch (e) { ok = false; out = (e.stdout || "") + (e.stderr || ""); }
  const line = out.trim().split("\n")[0] || "(no output)";
  if (!ok || /^FAIL/.test(out.trim())) { allPass = false; rows.push(`  FAIL  ${f}: ${line.replace(/^FAIL:?\s*/, "")}`); }
  else rows.push(`  PASS  ${f}: ${line.replace(/^PASS:?\s*/, "")}`);
}

console.log(`\nDark verify — ${files.length} scripts:\n` + rows.join("\n"));
console.log(`\n${allPass ? "ALL PASS" : "SOME FAILED"}`);
process.exit(allPass ? 0 : 1);
