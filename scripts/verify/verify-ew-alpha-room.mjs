// verify-ew-alpha-room.mjs - dark verify for Alpha's brain-room builder (no database, no
// credentials): structural invariants of the generated SQL, the role-URL construction, and
// the live path's gate refusal. The lab rehearsal (a real wall test) is a separate sanctioned
// run of the tool itself; its result is recorded in ops-log, never assumed here. PASS/FAIL.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { roomSql, roleUrl } from "../brainrooms/ew-alpha-room.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const fails = [];
const sql = roomSql({ sourceTable: "public.thoughts", password: "PW_TEST" });

// The role is minimal-power and login-capable.
if (!/CREATE ROLE ew_alpha_runtime LOGIN/.test(sql)) fails.push("role not LOGIN");
for (const attr of ["NOSUPERUSER", "NOCREATEDB", "NOCREATEROLE", "NOREPLICATION", "NOBYPASSRLS"])
  if (!sql.includes(attr)) fails.push(`role missing ${attr}`);

// Grants are scoped to the room plus SELECT-only on the view; nothing grants the source.
if (!/GRANT USAGE ON SCHEMA ew_alpha TO ew_alpha_runtime/.test(sql)) fails.push("schema usage grant missing");
if (!/GRANT SELECT ON ew_alpha\.pm_corpus TO ew_alpha_runtime/.test(sql)) fails.push("view SELECT grant missing");
if (/GRANT\s+(?!SELECT ON ew_alpha\.pm_corpus)[^;]*public\.thoughts/i.test(sql)) fails.push("a grant touches the protected source");
if (/GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*pm_corpus/i.test(sql)) fails.push("view grant wider than SELECT (auto-updatable view breach)");
if (!/REVOKE ALL ON ew_alpha\.pm_corpus FROM ew_alpha_runtime;\s*\nGRANT SELECT ON ew_alpha\.pm_corpus/.test(sql)) fails.push("view privileges not revoke-then-narrowed (default privileges cover views; lab-caught breach)");
if (!/REVOKE CREATE ON SCHEMA public FROM ew_alpha_runtime/.test(sql)) fails.push("public CREATE not revoked");
if (!/GRANT ew_alpha_runtime TO /.test(sql)) fails.push("admin membership grant missing (non-superuser Supabase admin cannot manage the role without it)");
if (/GRANT ew_alpha_runtime TO CURRENT_USER/.test(sql)) fails.push("membership grant uses the CURRENT_USER keyword form (crashes the Supabase backend; use the dynamic form)");

// The view is an allowlist over library classes only, from the declared source.
if (!/WHERE source_type IN \('pm_teaching', 'coherence_teaching'\)/.test(sql)) fails.push("view filter is not the library allowlist");
if (!/FROM public\.thoughts/.test(sql)) fails.push("view does not read the declared source");
if (/NOT IN|!=|<>/.test(sql)) fails.push("a blocklist pattern appears (conventions: allowlists only)");
if (/SELECT \*/.test(sql)) fails.push("view uses SELECT * (column surface must be frozen explicitly)");

// Role URL keeps the Supabase pooler's user.projectref shape and swaps credentials.
const pooled = roleUrl("postgresql://postgres.abc123:oldpw@host:6543/postgres", "NEWPW");
if (!pooled.includes("ew_alpha_runtime.abc123")) fails.push("pooler role user shape wrong: " + pooled.split("@")[0].split("//")[1].split(":")[0]);
if (pooled.includes("oldpw")) fails.push("admin password leaked into the role URL");
const direct = roleUrl("postgresql://postgres:pw@db.host:5432/postgres", "NEWPW");
if (!direct.startsWith("postgresql://ew_alpha_runtime:")) fails.push("direct role user shape wrong");

// The live path refuses without the recorded gate reference (hard stop in code).
try {
  const out = execFileSync(process.execPath,
    [join(ROOT, "scripts", "brainrooms", "ew-alpha-room.mjs"), "--target", "live"],
    { encoding: "utf8", env: { ...process.env, EW_A2_GATE_REF: "" } });
  fails.push("live target did not refuse without a gate ref: " + out.split("\n")[0]);
} catch (e) {
  const out = (e.stdout || "") + (e.stderr || "");
  if (!/REFUSED/.test(out) || !/G19/.test(out)) fails.push("live refusal message wrong: " + out.split("\n")[0]);
  if (e.status !== 1) fails.push("live refusal exit code not 1");
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: ew_alpha room builder (dark) - minimal-power LOGIN role, room-scoped grants, SELECT-only library-allowlist view over the declared source, no blocklists, pooler-aware role URL without credential leaks, live target hard-refuses without the G19 gate ref.");
