// verify-brains.mjs - L1/L2 dark verify (D15 / BRAINS.md). No connections, no credentials:
// proves the registry shape, the two profile guards, the generation stamp helpers, the pure
// SQL generation on a fixture DDL (schema rewrite, extension strip, policy retention, FK
// copy order), and a hermetic spawn --dry-run child run. The live spawn/retire path proves
// itself at L3 (lab gate); this script is what run-all pins forever.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRegistry, resolveProfile, stampGeneration, liveGeneration } from "../brains/profiles.mjs";
import { schemaNameFor, transformDdl, parseTables, copyOrder, copyPlan, countSql } from "../brains/sql-gen.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const fails = [];
const savedEnv = { EW_TEST_MODE: process.env.EW_TEST_MODE, EW_ALLOW_LIVE: process.env.EW_ALLOW_LIVE, EW_BRAIN_PROFILE: process.env.EW_BRAIN_PROFILE };

const FIXTURE_DDL = `
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
COMMENT ON EXTENSION vector IS 'vector data type';
CREATE TABLE public.thoughts (
    id uuid NOT NULL,
    content text,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.thought_edges (
    id uuid NOT NULL,
    from_id uuid REFERENCES public.thoughts(id),
    to_id uuid
);
ALTER TABLE ONLY public.thought_edges
    ADD CONSTRAINT edges_to_fk FOREIGN KEY (to_id) REFERENCES public.thoughts(id);
CREATE INDEX idx_emb ON public.thoughts USING hnsw (embedding public.vector_cosine_ops);
CREATE POLICY read_all ON public.thoughts FOR SELECT USING (true);
GRANT SELECT ON public.thoughts TO service_role;
CREATE FUNCTION public.match_thoughts() RETURNS void
    LANGUAGE sql SET search_path TO 'public'
    AS $$ SELECT 1 $$;
`;

try {
  // 1. registry shape
  const reg = await loadRegistry(ROOT);
  const lives = reg.brains.filter((b) => b.kind === "live" && b.status === "active");
  if (lives.length !== 1) fails.push(`expected exactly 1 active live brain, found ${lives.length}`);
  const live = lives[0] || {};
  if (live.schema !== "public") fails.push(`live schema is ${live.schema}, expected public`);
  if (live.generation !== 0) fails.push(`live generation is ${live.generation}, expected 0 (Genesis)`);
  if (live.schemaVersion !== reg.schemaVersionCurrent) fails.push("live schemaVersion != schemaVersionCurrent");
  if (!live.connEnv || /postgres(ql)?:\/\//i.test(live.connEnv)) fails.push("live connEnv must be an env NAME, never a value (iron rule)");

  // 2. guard 1: live-in-test refused without EW_ALLOW_LIVE
  process.env.EW_TEST_MODE = "1"; delete process.env.EW_ALLOW_LIVE;
  let threw = false;
  try { await resolveProfile("live"); } catch { threw = true; }
  if (!threw) fails.push("guard 1 broken: test-mode process resolved the live brain");
  process.env.EW_ALLOW_LIVE = "1";
  try { await resolveProfile("live"); } catch (e) { fails.push("guard 1 over-broad: EW_ALLOW_LIVE=1 still refused: " + e.message); }
  delete process.env.EW_TEST_MODE; delete process.env.EW_ALLOW_LIVE;

  // 3. guard 2: schema drift refused; unknown profile refused
  threw = false;
  try { await resolveProfile("live", { expectSchemaVersion: 999 }); } catch { threw = true; }
  if (!threw) fails.push("guard 2 broken: schemaVersion mismatch did not throw");
  threw = false;
  try { await resolveProfile("no-such-brain"); } catch { threw = true; }
  if (!threw) fails.push("unknown profile did not throw");

  // 4. stamps
  const prof = await resolveProfile("live");
  const meta = stampGeneration({ era: "rehearsal" }, prof);
  if (meta.generation !== 0 || meta.era !== "rehearsal") fails.push("stampGeneration wrong: " + JSON.stringify(meta));
  if ((await liveGeneration(ROOT)) !== 0) fails.push("liveGeneration != 0");

  // 5. pure SQL generation on the fixture
  if (schemaNameFor("gen1-cand-a") !== "s_gen1_cand_a") fails.push("schemaNameFor mangled the name");
  threw = false; try { schemaNameFor("live"); } catch { threw = true; }
  if (!threw) fails.push('schemaNameFor accepted "live"');
  const t = transformDdl(FIXTURE_DDL, "s_test");
  if (!t.startsWith('CREATE SCHEMA IF NOT EXISTS "s_test";')) fails.push("transformDdl missing CREATE SCHEMA header");
  if (/\bpublic\.(?!(?:vector|halfvec|sparsevec)[A-Za-z0-9_]*\b)/.test(t)) fails.push("transformDdl left a non-extension public. reference");
  if (/CREATE EXTENSION/i.test(t) || /COMMENT ON EXTENSION/i.test(t)) fails.push("transformDdl kept an extension statement");
  if (!/CREATE POLICY read_all ON "s_test"\.thoughts/.test(t)) fails.push("transformDdl lost or failed to rewrite the policy");
  if (!/public\.vector\(1536\)/.test(t) || /"s_test"\.vector\(/.test(t)) fails.push("extension type reference was schema-rewritten (must keep pointing at the extension's schema)");
  if (!/ON "s_test"\.thoughts USING hnsw \(embedding public\.vector_cosine_ops\)/.test(t)) fails.push("hnsw operator class was schema-rewritten (extension prefix family must be protected)");
  if (!/SET search_path TO 's_test'/.test(t) || /SET search_path TO 'public'/.test(t)) fails.push("function search_path pin not re-pinned to the scratch schema");
  const bareCreates = (t.match(/CREATE SCHEMA "s_test";/g) || []).length;
  if (bareCreates !== 0) fails.push("dump's CREATE SCHEMA was rewritten without IF NOT EXISTS (collides with the header - the G2 lesson)");
  const tables = parseTables(FIXTURE_DDL);
  if (tables.join(",") !== "thoughts,thought_edges") fails.push("parseTables wrong: " + tables.join(","));
  const order = copyOrder(FIXTURE_DDL);
  if (order.indexOf("thoughts") > order.indexOf("thought_edges")) fails.push("copyOrder ignored the FK (edges before thoughts)");
  const plan = copyPlan(order, "s_test", "C:\\tmp\\x");
  if (plan.length !== 2 || !plan[0].out.includes("FORMAT csv") || !plan[0].in.includes('"s_test".')) fails.push("copyPlan malformed");
  if (plan[0].out.includes("\\\\") || plan[0].file.includes("\\")) fails.push("copyPlan kept backslash paths");
  const cs = countSql("s_test", tables);
  if (!cs.includes('FROM "s_test"."thoughts"') || !cs.trim().endsWith(";")) fails.push("countSql malformed");

  // 6. hermetic spawn --dry-run (child process; fixture DDL from a temp file; no env, no db)
  const dir = mkdtempSync(join(tmpdir(), "ew-verify-brains-"));
  try {
    const f = join(dir, "fixture.sql");
    writeFileSync(f, FIXTURE_DDL, "utf8");
    const out = execFileSync(process.execPath, [join(ROOT, "scripts", "brains", "spawn.mjs"),
      "--name", "verify-dry", "--generation", "1", "--ddl", f, "--dry-run"], { encoding: "utf8" });
    if (!/DRY RUN spawn "verify-dry" -> lab schema s_verify_dry \(generation 1\)/.test(out)) fails.push("spawn dry-run header wrong");
    if (!/copy order: thoughts, thought_edges/.test(out)) fails.push("spawn dry-run copy order wrong");
    const reg2 = await loadRegistry(ROOT);
    if (reg2.brains.some((b) => b.name === "verify-dry")) fails.push("spawn dry-run WROTE the registry");
    const retireOut = execFileSync(process.execPath, [join(ROOT, "scripts", "brains", "list.mjs")], { encoding: "utf8" });
    if (!/live\s+live\s+schema=public/.test(retireOut)) fails.push("list.mjs did not print the live row");
  } finally { rmSync(dir, { recursive: true, force: true }); }
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  for (const [k, v] of Object.entries(savedEnv)) { if (v == null) delete process.env[k]; else process.env[k] = v; }
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: brain fleet dark verify - registry shape (1 live, gen 0, names-only conn); guard 1 (live-in-test refused / EW_ALLOW_LIVE honored) + guard 2 (schema drift throws); generation stamps; DDL transform (schema rewrite, extensions stripped, policies kept, no public. residue); FK-aware copy order + csv copy plan; hermetic spawn --dry-run (no registry write) + list output. No connections, no credentials.");
