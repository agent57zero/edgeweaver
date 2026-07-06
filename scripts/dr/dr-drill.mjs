// dr-drill.mjs - A19 disaster-recovery drill (arms by being done). Simulates the machine-dies
// recovery of the buildable machinery: clone the repo into a scratch dir from git alone (no
// .env.local, no secrets), run the full dark-verify suite there, and record time-to-recover. Proves
// the repo + verifies are recoverable from version control. The full runbook (soul repo, OB1
// restore, task re-registration, acceptance test) is templates/disaster-recovery.md, run at arming.
import { execFileSync } from "node:child_process";
import { mkdtempSync, existsSync, readdirSync, chmodSync, unlinkSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "..", "..");

function rmrf(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) rmrf(p);
    else { try { chmodSync(p, 0o666); } catch { /* ignore */ } try { unlinkSync(p); } catch { /* ignore */ } }
  }
  try { rmdirSync(dir); } catch { /* ignore */ }
}

export function runDrill() {
  const scratch = mkdtempSync(join(tmpdir(), "ew-dr-"));
  const start = Date.now();
  try {
    execFileSync("git", ["clone", "-q", ROOT, scratch], { encoding: "utf8" });
    // EW_DR_DRILL guards the nested verify-dr against recursing (it would re-clone forever)
    const out = execFileSync(process.execPath, [join(scratch, "scripts", "verify", "run-all.mjs")], { encoding: "utf8", env: { ...process.env, EW_DR_DRILL: "1" } });
    return { pass: /ALL PASS/.test(out), seconds: (Date.now() - start) / 1000, out };
  } finally {
    rmrf(scratch);
  }
}

if (process.argv[1] && process.argv[1].endsWith("dr-drill.mjs")) {
  const r = runDrill();
  console.log(`DR drill: ${r.pass ? "RECOVERED" : "FAILED"} in ${r.seconds.toFixed(1)}s (cloned repo to scratch, ran full verify suite)`);
  process.exit(r.pass ? 0 : 1);
}
