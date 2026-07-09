// sql-gen.mjs - PURE SQL generation for the brain fleet (D15 / BRAINS.md). No connections in
// this file: spawn/migrate/diff feed these strings to psql (or print them under --dry-run),
// and verify-brains.mjs pins the behavior on a fixture DDL. Transform policy for scratch
// schemas: keep tables, indexes, sequences, constraints, functions, triggers, policies and
// grants (the lab is a Supabase project, so the auth schema and standard roles exist); strip
// only extension statements (extensions are project-level in the lab, checked once by spawn)
// and rewrite every schema reference from public to the target. The rewrite is regex-based
// over pg_dump text output (which fully qualifies names); a DDL that embeds the literal
// string "public." inside a function body would need hand review - acceptable for v1 and
// pinned by the fixture verify.

export function schemaNameFor(name) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`bad scratch name "${name}" (lowercase letters, digits, hyphens)`);
  if (name === "live") throw new Error('"live" is not a spawnable name');
  return "s_" + name.replace(/-/g, "_");
}

// Double-quote a Postgres identifier (exported so dump-transform.mjs prepends a byte-identical
// CREATE SCHEMA header). q stays the internal alias so the rest of this file reads unchanged.
export function quoteIdent(ident) { return '"' + ident.replace(/"/g, '""') + '"'; }
const q = quoteIdent;

// rewriteDdl - the SHARED schema-rewrite primitive, over pg_dump DDL/metadata text (no data).
// transformDdl (live-copy spawn, schema-only DDL) and transformDumpSql (past-brain spawn, full
// nightly dump) both call it, so the transform POLICY is defined in exactly one place:
//   - CREATE EXTENSION / COMMENT ON EXTENSION stripped (extensions are project-level in the lab).
//   - extTypes: extension-owned identifier PREFIX families that must keep pointing at the schema
//     the extension lives in - on THIS live brain that is public (embedding public.vector(1536)).
//     The family covers the bare types (vector), the index operator classes (vector_cosine_ops,
//     hnsw/ivfflat), and helper functions (vector_dims), so the whole prefix is protected, not
//     just the exact type name (the ` EXT_$1 ` sentinel shields it from the public. rewrite, then
//     it is restored to extSchema).
//   - Function-level `SET search_path TO 'public'` pins (OB1 rpc functions) are re-pinned to the
//     scratch schema so their unqualified references resolve inside the scratch.
//   - The dump's own CREATE SCHEMA statement is made idempotent - it would collide with the
//     prepended header otherwise (the G2 restore fought this same entry).
// This function does NOT prepend the CREATE SCHEMA header: the caller owns that (once), so it is
// safe to run rewriteDdl over MANY DDL segments of one dump without emitting the header per
// segment. stripDumpMeta (transformDumpSql only) additionally drops lines that a full-database
// dump may carry but the schema-only ddl-v1 never did: OWNER TO (roles differ in the lab),
// \connect, and CREATE/DROP DATABASE. transformDdl leaves stripDumpMeta off, so its observable
// behavior is byte-identical to before this refactor (verify-brains.mjs pins it).
export function rewriteDdl(ddl, targetSchema, { extTypes = ["vector", "halfvec", "sparsevec"], extSchema = "public", stripDumpMeta = false } = {}) {
  const lines = ddl.split(/\r?\n/).filter((l) => {
    const t = l.trim().toUpperCase();
    if (t.startsWith("CREATE EXTENSION") || t.startsWith("COMMENT ON EXTENSION")) return false;
    if (stripDumpMeta) {
      if (t.startsWith("\\CONNECT")) return false;                          // psql \connect <db>
      if (t.startsWith("CREATE DATABASE") || t.startsWith("DROP DATABASE")) return false; // pg_dump --create
      if (/\bOWNER TO\b/i.test(l)) return false;                            // ALTER ... OWNER TO <role>
    }
    return true;
  });
  let out = lines.join("\n");
  for (const t of extTypes) out = out.replace(new RegExp("\\bpublic\\.(" + t + "[A-Za-z0-9_]*)\\b", "g"), " EXT_$1 ");
  out = out.replace(/\bCREATE SCHEMA public\b/g, "CREATE SCHEMA IF NOT EXISTS public");
  out = out.replace(/\bSCHEMA public\b/g, "SCHEMA " + q(targetSchema));
  out = out.replace(/\bpublic\./g, q(targetSchema) + ".");
  out = out.replace(/\bSET search_path TO 'public'/g, "SET search_path TO '" + targetSchema + "'");
  out = out.replace(/ EXT_([A-Za-z0-9_]+) /g, extSchema + ".$1");
  return out;
}

// transformDdl - schema-only DDL (brains/schema/ddl-v1.sql) rewritten to a scratch schema, with
// the CREATE SCHEMA header prepended once. Thin wrapper over rewriteDdl; behavior unchanged.
export function transformDdl(ddl, targetSchema, opts = {}) {
  return "CREATE SCHEMA IF NOT EXISTS " + q(targetSchema) + ";\n\n" + rewriteDdl(ddl, targetSchema, opts);
}

// Table names in pg_dump text output appear as: CREATE TABLE public."name" | public.name
export function parseTables(ddl) {
  const names = [];
  const re = /^CREATE TABLE (?:IF NOT EXISTS )?public\.("?)([A-Za-z0-9_]+)\1/gm;
  let m;
  while ((m = re.exec(ddl))) names.push(m[2]);
  return names;
}

// Foreign-key order: parse REFERENCES public.<t> inside each CREATE TABLE block plus ALTER
// TABLE ... FOREIGN KEY lines, then topo-sort so referenced tables copy first. Cycles fall
// back to the original order for the cycle members (copy would then need constraint
// deferral; none exist in the current brain).
export function copyOrder(ddl) {
  const tables = parseTables(ddl);
  const deps = Object.fromEntries(tables.map((t) => [t, new Set()]));
  const refRe = /ALTER TABLE (?:ONLY )?public\.("?)([A-Za-z0-9_]+)\1[\s\S]{0,400}?REFERENCES public\.("?)([A-Za-z0-9_]+)\3|CREATE TABLE (?:IF NOT EXISTS )?public\.("?)([A-Za-z0-9_]+)\5[\s\S]*?REFERENCES public\.("?)([A-Za-z0-9_]+)\7/g;
  let m;
  while ((m = refRe.exec(ddl))) {
    const from = m[2] || m[6], to = m[4] || m[8];
    if (from && to && from !== to && deps[from]) deps[from].add(to);
  }
  const ordered = [], seen = new Set();
  const visit = (t, stack) => {
    if (seen.has(t) || stack.has(t)) return;
    stack.add(t);
    for (const d of deps[t] || []) visit(d, stack);
    stack.delete(t);
    if (!seen.has(t)) { seen.add(t); ordered.push(t); }
  };
  for (const t of tables) visit(t, new Set());
  return ordered;
}

// The \copy pair per table (psql meta-commands; absolute file paths with forward slashes).
export function copyPlan(tables, targetSchema, dir) {
  const fwd = dir.replace(/\\/g, "/");
  return tables.map((t) => ({
    table: t,
    file: fwd + "/" + t + ".csv",
    out: "\\copy (SELECT * FROM public." + q(t) + ") TO '" + fwd + "/" + t + ".csv' WITH (FORMAT csv)",
    in: "\\copy " + q(targetSchema) + "." + q(t) + " FROM '" + fwd + "/" + t + ".csv' WITH (FORMAT csv)",
  }));
}

export function countSql(schema, tables) {
  return tables.map((t) => "SELECT '" + t + "' AS tbl, count(*)::text AS n FROM " + q(schema) + "." + q(t)).join("\nUNION ALL\n") + ";";
}
