// verify-ab-run.mjs - L4 dark verify for the A/B runner (D15 / BRAINS.md). Hermetic: no
// connections, no credentials, no model calls. Writes a 2-question fixture to a temp dir and
// exercises ab-run.mjs --dry-run as a child. The load-bearing assertion: a dry-run that NAMES
// the live profile still exits 0 and prints its schema from the registry - which is only
// possible if dry-run never resolved the live brain (resolveProfile in test mode would trip
// guard 1 and abort non-zero). Also pins the usage-error exit codes (2) for a missing and a
// malformed --candidates. This is what run-all pins forever; the live A/B path proves itself
// at the lab gate with Alan present.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "..", "..");
const AB = join(ROOT, "scripts", "brains", "ab-run.mjs");
const node = process.execPath;
const fails = [];

// Run ab-run.mjs as a child; return { code, out }. EW_ALLOW_LIVE is forced off and EW_TEST_MODE
// on, so IF a dry-run ever regressed into resolving the live brain, guard 1 would fire and this
// child would exit non-zero with no plan - turning the test red exactly when it should.
function runChild(argv) {
  const env = { ...process.env, EW_TEST_MODE: "1", EW_ALLOW_LIVE: "" };
  // Pipe (capture) both streams so the intentional usage-error stderr below never leaks into
  // the parent's / run-all's console; we read it from the thrown error instead.
  const opts = { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] };
  try {
    const out = execFileSync(node, [AB, ...argv], opts);
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 1 : e.status, out: (e.stdout || "") + (e.stderr || "") };
  }
}

const dir = mkdtempSync(join(tmpdir(), "ew-verify-ab-"));
try {
  const qfile = join(dir, "q.json");
  writeFileSync(qfile, JSON.stringify([
    { id: "q1", text: "What is the Box in Possibility Management?" },
    { id: "q2", text: "Name your three seed Bright Principles." },
  ]), "utf8");
  const liveCandidates = JSON.stringify([{ profile: "live", model: "claude-sonnet-5" }]);

  // 1. dry-run naming the LIVE profile: must exit 0 WITHOUT connecting/resolving credentials.
  const r1 = runChild(["--candidates", liveCandidates, "--questions", qfile, "--dry-run"]);
  if (r1.code !== 0) fails.push("dry-run for the live profile did not exit 0 (did it try to resolve/connect?): " + r1.out.trim());
  if (!/DRY RUN/.test(r1.out)) fails.push("dry-run did not print a plan");
  if (!/\bpublic\b/.test(r1.out)) fails.push("dry-run plan missing the live schema (public) from the registry");
  if (!/\blive\b/.test(r1.out)) fails.push("dry-run plan missing the candidate profile name");

  // 2. the questions fixture count (2) appears in the plan output.
  if (!/questions:\s*2\b/.test(r1.out)) fails.push("dry-run plan did not surface the 2-question fixture count");

  // 3. missing --candidates is a usage error (exit 2).
  const r2 = runChild(["--questions", qfile, "--dry-run"]);
  if (r2.code !== 2) fails.push("missing --candidates should exit 2, got " + r2.code);

  // 4. malformed --candidates json fails cleanly (exit 2), not a stack-trace crash (exit 1).
  const r3 = runChild(["--candidates", "{not valid json", "--questions", qfile, "--dry-run"]);
  if (r3.code !== 2) fails.push("malformed --candidates json should exit 2, got " + r3.code);

  // 5. well-formed json but wrong shape (missing model) is also a usage error (exit 2).
  const r4 = runChild(["--candidates", JSON.stringify([{ profile: "live" }]), "--questions", qfile, "--dry-run"]);
  if (r4.code !== 2) fails.push("candidate missing 'model' should exit 2, got " + r4.code);
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: A/B runner dark verify - dry-run naming the LIVE profile prints its registry schema and exits 0 (proves no credential resolution / no connection: guard 1 would abort otherwise); 2-question fixture count surfaced in the plan; usage errors exit 2 (missing --candidates, malformed json, wrong shape). No connections, no credentials, no model calls.");
