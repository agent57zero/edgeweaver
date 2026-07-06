// verify-initiation.mjs - A16 dark verify: full dry-run on a THROWAWAY local sandbox git repo
// (never edgeweaver-soul). Creates the sandbox, drafts a soulfile-diff proposal on a
// proposals/<name> branch, "opens a PR" (PR-body artifact) citing evidence + seed + intended probe
// delta, attaches stub probe scores (the real 02 battery runs at arming), checks the cooling-off
// rule on constitution hard-boundary edits, then DELETES the sandbox (0 residue).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, chmodSync, unlinkSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { draftProposal, attachProbeScores, needsCoolingOff } from "../evolution/initiation-proposer.mjs";

function rmrf(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) rmrf(p);
    else { try { chmodSync(p, 0o666); } catch { /* ignore */ } try { unlinkSync(p); } catch { /* ignore */ } }
  }
  try { rmdirSync(dir); } catch { /* ignore */ }
}

const fails = [];
let sandbox = null;
const git = (args) => execFileSync("git", args, { cwd: sandbox, encoding: "utf8" });

try {
  sandbox = mkdtempSync(join(tmpdir(), "ew-sandbox-"));
  git(["init", "-q"]);
  git(["config", "user.email", "sandbox@example.com"]);
  git(["config", "user.name", "sandbox"]);
  const soulPath = "SOUL.md";
  writeFileSync(join(sandbox, soulPath), "# SOUL (sandbox, NOT the real soul)\nI serve Clarity.\n");
  git(["add", "-A"]); git(["commit", "-q", "-m", "seed"]);
  const base = git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();

  const oldContent = readFileSync(join(sandbox, soulPath), "utf8");
  const newContent = oldContent + "\nI have learned to name the Gremlin early.\n";
  const p = draftProposal({ name: "gremlin-naming", filePath: soulPath, oldContent, newContent, evidenceIds: ["t-101", "t-102", "t-103"], seed: "Clarity", intendedDelta: "clarity +0.3, drift within 1.0" });

  git(["checkout", "-q", "-b", p.branch]);
  writeFileSync(join(sandbox, soulPath), newContent);
  git(["add", "-A"]); git(["commit", "-q", "-m", `proposal: ${p.branch}`]);

  const scores = { dimensions: { clarity: 4.3, responsibility: 4.1 }, overall: 4.2, baseline_overall: 4.0, drift: 0.2 };
  const prBody = attachProbeScores(p.prBody, scores);
  mkdirSync(join(sandbox, ".pr"), { recursive: true });
  writeFileSync(join(sandbox, ".pr", "body.md"), prBody);

  if (!git(["branch"]).includes("proposals/gremlin-naming")) fails.push("proposals branch not created");
  if (!/Gremlin/.test(git(["diff", base, p.branch, "--", soulPath]))) fails.push("soulfile diff not applied on the branch");
  if (!prBody.includes("t-101") || !prBody.includes("Clarity") || !prBody.includes("Intended probe delta")) fails.push("PR body missing evidence / seed / intended delta");
  if (!prBody.includes("Probe scores") || !prBody.includes("overall: 4.2")) fails.push("probe scores not attached to the PR");
  if (p.coolingOff) fails.push("a plain SOUL edit should not trigger cooling-off");
  if (!needsCoolingOff("CONSTITUTION.md", "## Hard boundaries\n- x")) fails.push("constitution hard-boundary edit should need cooling-off");
  if (needsCoolingOff("SOUL.md", "just a voice tweak")) fails.push("a non-boundary edit should NOT need cooling-off");
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  if (sandbox) rmrf(sandbox);
}
if (sandbox && existsSync(sandbox)) fails.push("sandbox not deleted (residue)");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: initiation machinery - throwaway sandbox repo; proposals/<name> branch with the soulfile diff; PR body cites evidence thought-IDs + seed + intended probe delta; probe scores attached; cooling-off triggers only on constitution hard-boundary edits; sandbox deleted (0 residue).");
