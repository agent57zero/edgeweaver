// verify-dump-spawn.mjs - T3 dark verify for the past-brain spawn (D17 / BRAINS.md section 7).
// Hermetic: no connections, no credentials, no pg_restore (the fixture is a PLAIN dump). Builds a
// synthetic full plain-SQL pg_dump in a temp dir - SET/preamble, CREATE SCHEMA public, a
// CREATE EXTENSION, two FK-linked tables, an OWNER TO line, an hnsw index on a pgvector operator
// class, a function pinned to search_path 'public', and two COPY data blocks. One data row's
// content field carries the literal "public.thoughts CREATE POLICY SCHEMA public" - every token
// the DDL rewrite would touch - and MUST survive byte-identical.
//
// THE LOAD-BEARING ASSERTION: transformDumpSql rewrites DDL + COPY headers to the scratch schema
// while leaving every data byte untouched. We prove it by segmenting input and output the same
// way and asserting the data regions are byte-identical, then that the DDL around them was fully
// rewritten (headers, no public. residue, extensions + OWNER TO gone, search_path re-pinned, one
// header at the top). Then a spawn.mjs --from-dump --dry-run child must exit 0, name the plain
// format + both tables, and NOT write the registry. Finally verify-brains.mjs is run as a child
// and must still pass - proving the sql-gen rewriteDdl refactor kept transformDdl byte-identical.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRegistry } from "../brains/profiles.mjs";
import { schemaNameFor, parseTables } from "../brains/sql-gen.mjs";
import { transformDumpSql } from "../brains/dump-transform.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const node = process.execPath;
const fails = [];
const TAB = "\t";
const TARGET = schemaNameFor("verify-dump"); // s_verify_dump - what the child computes too

// The synthetic dump. Trailing "\n" so the file ends with a newline (real pg_dump output does).
const DUMP = [
  "--",
  "-- PostgreSQL database dump",
  "--",
  "",
  "SET statement_timeout = 0;",
  "SET client_encoding = 'UTF8';",
  "SELECT pg_catalog.set_config('search_path', '', false);",
  "",
  "CREATE SCHEMA public;",
  "",
  "COMMENT ON SCHEMA public IS 'standard public schema';",
  "",
  "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;",
  "",
  "CREATE TABLE public.thoughts (",
  "    id uuid NOT NULL,",
  "    content text,",
  "    metadata jsonb,",
  "    embedding public.vector(1536)",
  ");",
  "",
  "ALTER TABLE public.thoughts OWNER TO postgres;",
  "",
  "CREATE TABLE public.thought_edges (",
  "    id uuid NOT NULL,",
  "    from_id uuid,",
  "    to_id uuid,",
  "    CONSTRAINT thought_edges_from_fk FOREIGN KEY (from_id) REFERENCES public.thoughts(id)",
  ");",
  "",
  "ALTER TABLE public.thought_edges OWNER TO postgres;",
  "",
  "CREATE INDEX idx_emb ON public.thoughts USING hnsw (embedding public.vector_cosine_ops);",
  "",
  "CREATE FUNCTION public.match_thoughts() RETURNS void",
  "    LANGUAGE sql",
  "    SET search_path TO 'public'",
  "    AS $$ SELECT 1 $$;",
  "",
  "--",
  "-- Data for Name: thoughts; Type: TABLE DATA; Schema: public; Owner: -",
  "--",
  "",
  "COPY public.thoughts (id, content, metadata) FROM stdin;",
  "11111111-1111-1111-1111-111111111111" + TAB + "plain memory about the weather" + TAB + '{"type": "note"}',
  "22222222-2222-2222-2222-222222222222" + TAB + "public.thoughts CREATE POLICY SCHEMA public" + TAB + '{"type": "trap"}',
  "\\.",
  "",
  "--",
  "-- Data for Name: thought_edges; Type: TABLE DATA; Schema: public; Owner: -",
  "--",
  "",
  "COPY public.thought_edges (id, from_id, to_id) FROM stdin;",
  "33333333-3333-3333-3333-333333333333" + TAB + "11111111-1111-1111-1111-111111111111" + TAB + "22222222-2222-2222-2222-222222222222",
  "\\.",
  "",
  "--",
  "-- PostgreSQL database dump complete",
  "--",
  "",
].join("\n") + "\n";

// Independent (not the production module's) segmenter, so it cross-checks rather than echoes:
// returns the non-data text (DDL + COPY headers) and each data block's DATA region (the rows plus
// the "\." terminator, header excluded), with exact EOL bytes preserved.
function partition(text) {
  const parts = text.split(/(\r\n|\n|\r)/);
  const COPY = /^COPY\s+[^\s(]+\s*\([^)]*\)\s+FROM\s+stdin;\s*$/;
  let inData = false, cur = "";
  const outside = [], blocks = [];
  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i], eol = parts[i + 1] || "";
    if (inData) {
      cur += content + eol;
      if (content === "\\.") { blocks.push(cur); cur = ""; inData = false; }
      continue;
    }
    outside.push(content + eol);
    if (COPY.test(content)) inData = true;
  }
  return { outside: outside.join(""), blocks };
}

// Run a script as a child; return { code, out }. Pipe both streams so an intentional non-zero
// exit never leaks into run-all's console.
function runChild(script, argv, extraEnv = {}) {
  const env = { ...process.env, EW_TEST_MODE: "1", EW_ALLOW_LIVE: "", ...extraEnv };
  try {
    const out = execFileSync(node, [script, ...argv], { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 1 : e.status, out: (e.stdout || "") + (e.stderr || "") };
  }
}

const dir = mkdtempSync(join(tmpdir(), "ew-verify-dump-"));
try {
  const out = transformDumpSql(DUMP, TARGET, {});

  // 1. tables parse from the plain dump.
  const tables = parseTables(DUMP);
  if (tables.join(",") !== "thoughts,thought_edges") fails.push("parseTables on the dump wrong: " + tables.join(","));

  // 2. DATA IS BYTE-IDENTICAL: same block count, same bytes per block.
  const inP = partition(DUMP), outP = partition(out);
  if (inP.blocks.length !== 2) fails.push("fixture is malformed: expected 2 data blocks, found " + inP.blocks.length);
  if (outP.blocks.length !== inP.blocks.length) fails.push(`data block count changed: in ${inP.blocks.length} vs out ${outP.blocks.length}`);
  for (let i = 0; i < Math.min(inP.blocks.length, outP.blocks.length); i++) {
    if (inP.blocks[i] !== outP.blocks[i]) fails.push(`data block ${i} was NOT byte-identical after transform (the rewrite touched a data line)`);
  }
  // and the exact trap string survives verbatim somewhere in the output.
  if (!out.includes("public.thoughts CREATE POLICY SCHEMA public")) fails.push("the trap data row (literal 'public.thoughts CREATE POLICY SCHEMA public') did not survive byte-identical");

  // 3. COPY headers rewritten to the target schema.
  if (!outP.outside.includes(`COPY "${TARGET}".thoughts (id, content, metadata) FROM stdin;`)) fails.push("COPY header for thoughts not rewritten to the target schema");
  if (!outP.outside.includes(`COPY "${TARGET}".thought_edges (id, from_id, to_id) FROM stdin;`)) fails.push("COPY header for thought_edges not rewritten to the target schema");

  // 4. no non-extension public. residue OUTSIDE data blocks (data may say public. freely).
  if (/\bpublic\.(?!(?:vector|halfvec|sparsevec)[A-Za-z0-9_]*\b)/.test(outP.outside)) fails.push("non-extension public. residue left outside data blocks");
  // extension prefix families kept pointing at their extension schema (public here).
  if (!out.includes("public.vector(1536)") || out.includes(`"${TARGET}".vector(`)) fails.push("pgvector type reference was schema-rewritten (must stay at the extension schema)");
  if (!/USING hnsw \(embedding public\.vector_cosine_ops\)/.test(out)) fails.push("hnsw operator class was schema-rewritten (extension prefix family must be protected)");

  // 5. OWNER TO + extension statements gone (DDL-segment strips).
  if (/\bOWNER TO\b/.test(outP.outside)) fails.push("OWNER TO line was not stripped");
  if (/CREATE EXTENSION/i.test(out) || /COMMENT ON EXTENSION/i.test(out)) fails.push("an extension statement survived the transform");

  // 6. exactly one CREATE SCHEMA IF NOT EXISTS "<target>", and it is at the very top.
  if (!out.startsWith(`CREATE SCHEMA IF NOT EXISTS "${TARGET}";\n\n`)) fails.push("transformDumpSql missing the CREATE SCHEMA header at the top");
  const headerCount = out.split(`CREATE SCHEMA IF NOT EXISTS "${TARGET}"`).length - 1;
  if (headerCount !== 1) fails.push(`expected exactly 1 CREATE SCHEMA IF NOT EXISTS "${TARGET}", found ${headerCount}`);
  // the dump's own CREATE SCHEMA public was made idempotent, not duplicated as a bare create.
  if (/\bCREATE SCHEMA public;/.test(out)) fails.push("dump's CREATE SCHEMA public was not made idempotent (the G2 lesson)");
  // the preamble set_config line is preserved untouched.
  if (!out.includes("SELECT pg_catalog.set_config('search_path', '', false);")) fails.push("preamble set_config search_path line was altered or lost");

  // 7. the function search_path pin re-pinned to the scratch schema.
  if (!out.includes(`SET search_path TO '${TARGET}'`) || /SET search_path TO 'public'/.test(out)) fails.push("function search_path pin not re-pinned to the scratch schema");

  // 8. spawn.mjs --from-dump --dry-run child: exit 0, plain format + both tables, NO registry write.
  const fixturePath = join(dir, "brain-dump.sql");
  writeFileSync(fixturePath, DUMP, "utf8");
  const child = runChild(join(ROOT, "scripts", "brains", "spawn.mjs"),
    ["--from-dump", fixturePath, "--name", "verify-dump", "--generation", "0", "--dry-run"]);
  if (child.code !== 0) fails.push("spawn --from-dump --dry-run did not exit 0 (did it connect?): " + child.out.trim());
  if (!/DRY RUN spawn --from-dump "verify-dump" -> lab schema s_verify_dump \(generation 0\)/.test(child.out)) fails.push("spawn --from-dump dry-run header wrong");
  if (!/format detected: plain/.test(child.out)) fails.push("spawn --from-dump dry-run did not report the plain format");
  if (!/\bthoughts\b/.test(child.out) || !/thought_edges/.test(child.out)) fails.push("spawn --from-dump dry-run did not name both tables");
  const reg2 = await loadRegistry(ROOT);
  if (reg2.brains.some((b) => b.name === "verify-dump")) fails.push("spawn --from-dump dry-run WROTE the registry");

  // 9. verify-brains.mjs still passes unchanged (proves the rewriteDdl refactor kept transformDdl
  //    byte-identical - it pins transformDdl on its own fixture).
  const brains = runChild(join(ROOT, "scripts", "verify", "verify-brains.mjs"), []);
  if (brains.code !== 0 || !/^PASS/.test(brains.out.trim())) fails.push("verify-brains.mjs no longer passes after the sql-gen refactor: " + brains.out.trim().split("\n")[0]);
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: past-brain spawn dark verify - full plain dump transformed to a scratch schema with data BYTE-IDENTICAL (the 'public.thoughts CREATE POLICY SCHEMA public' trap row survived verbatim; both data blocks unchanged); COPY headers rewritten, no non-extension public. residue, pgvector prefix families kept at their extension schema, OWNER TO + extension lines stripped, one CREATE SCHEMA header at the top, dump's CREATE SCHEMA made idempotent, function search_path re-pinned; spawn --from-dump --dry-run exits 0 naming the plain format + both tables with no registry write; verify-brains.mjs still green (rewriteDdl refactor kept transformDdl identical). No connections, no credentials.");
