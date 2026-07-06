// verify-security-audit.mjs - A18 dark verify: the 5-check security sweep runs, each check reports
// individually, and on the current clean machine all five pass (secrets, skills, ports, pinned
// senders, gates-repo unreachability).
import { runAudit } from "../security/security-audit.mjs";

const checks = await runAudit();
const fails = [];
if (checks.length !== 5) fails.push(`expected 5 checks, got ${checks.length}`);
for (const c of checks) if (!c.pass) fails.push(`${c.name}: ${c.detail}`);

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: security audit - all 5 checks report and pass (${checks.map((c) => c.name).join("; ")}).`);
