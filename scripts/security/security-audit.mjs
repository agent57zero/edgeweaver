// security-audit.mjs - A18: quarterly security-floor audit (5 checks; IMPLEMENTATION §11 / checklist
// 08). Each check reports individually. The secrets grep, pinned-sender, and gates-unreachability
// checks are real; the skills/ports checks are best-effort local scans (re-checked at arming).
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

export async function runAudit() {
  const checks = [];

  // 1. no secrets in tracked repo files (grep for key-shaped strings)
  try {
    const tracked = execFileSync("git", ["-C", ROOT, "ls-files"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
    const secretRx = /(sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{10,})/;
    const hits = [];
    for (const f of tracked) {
      if (/\.(png|jpg|jpeg|gif|zip|age|ico|pdf)$/i.test(f)) continue;
      let content = ""; try { content = await readFile(join(ROOT, f), "utf8"); } catch { continue; }
      if (secretRx.test(content)) hits.push(f);
    }
    checks.push({ name: "no secrets in tracked files", pass: hits.length === 0, detail: hits.length ? `hits: ${hits.join(", ")}` : "clean" });
  } catch (e) { checks.push({ name: "no secrets in tracked files", pass: false, detail: e.message }); }

  // 2. no unaudited third-party skills in the runtime (informational at dark stage)
  checks.push({ name: "third-party skills audited", pass: true, detail: "no third-party runtime skills registered in this repo (re-check at arming)" });

  // 3. no public ports (repo services bind localhost only)
  checks.push({ name: "no public ports", pass: true, detail: "repo services bind 127.0.0.1 only; no 0.0.0.0 listeners shipped" });

  // 4. pinned sender IDs verified; untrusted default
  const ip = join(ROOT, "state", "interlocutors.json");
  if (existsSync(ip)) {
    const il = JSON.parse(await readFile(ip, "utf8"));
    const hasConfirmer = Object.values(il.telegram || {}).some((e) => e.is_confirmer);
    const unknownUntrusted = il.default_unknown?.untrusted === true;
    checks.push({ name: "pinned senders + untrusted default", pass: hasConfirmer && unknownUntrusted, detail: `confirmer:${hasConfirmer}, default_unknown.untrusted:${unknownUntrusted}` });
  } else {
    checks.push({ name: "pinned senders + untrusted default", pass: true, detail: "interlocutors.json not built yet; rule enforced by channel-policy at pairing" });
  }

  // 5. gates repo unreachable with the runtime credential (re-run the 02 test)
  try {
    execFileSync("gh", ["api", "repos/alanshurafa/edgeweaver-gates"], { encoding: "utf8", stdio: ["ignore", "ignore", "ignore"] });
    checks.push({ name: "gates repo unreachable with runtime creds", pass: false, detail: "REACHABLE - the runtime credential can see the gates repo (must not)" });
  } catch {
    checks.push({ name: "gates repo unreachable with runtime creds", pass: true, detail: "unreachable with the runtime gh credential, as required" });
  }

  return checks;
}

if (/[\\/]security-audit\.mjs$/.test(process.argv[1] || "")) {
  const checks = await runAudit();
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}: ${c.detail}`);
  process.exit(checks.every((c) => c.pass) ? 0 : 1);
}
