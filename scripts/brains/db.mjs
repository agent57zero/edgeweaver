// db.mjs - the side-effect half of the fleet tools: locate psql (PATH, then scoop shims),
// run SQL files/commands against a connection URL, run \copy pairs, and parse simple query
// output. Everything here takes explicit dbUrl arguments; profile resolution stays in
// profiles.mjs and SQL generation stays in sql-gen.mjs, so --dry-run paths never import a
// working psql. ON_ERROR_STOP everywhere: a failed statement fails the tool.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";

let PSQL = null;
export function psqlPath() {
  if (PSQL) return PSQL;
  const candidates = ["psql", join(homedir(), "scoop", "shims", "psql.exe"),
    join(homedir(), "scoop", "apps", "postgresql", "current", "bin", "psql.exe")];
  for (const c of candidates) {
    try { execFileSync(c, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); PSQL = c; return c; } catch { /* next */ }
  }
  throw new Error("psql not found (PATH or scoop shims). Install: scoop install postgresql");
}

// Connection URLs carry credentials: exec errors are rethrown with ONLY psql's own
// stderr/stdout, never the command line, and any URL that slips through is redacted.
const redact = (s) => String(s).replace(/postgres(ql)?:\/\/\S+/g, "postgresql://<redacted>");
function run(dbUrl, args, opts = {}) {
  try {
    return execFileSync(psqlPath(), ["-X", "-v", "ON_ERROR_STOP=1", "-d", dbUrl, ...args], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts,
    });
  } catch (e) {
    const detail = ((e.stderr || "") + (e.stdout || "")).trim() || "psql exited " + (e.status ?? "?");
    throw new Error("psql failed: " + redact(detail));
  }
}

export function runSqlFile(dbUrl, path) { return run(dbUrl, ["-q", "-f", path]); }

export function runSqlText(dbUrl, sql, label = "stmt") {
  const dir = mkdtempSync(join(tmpdir(), "ew-brains-"));
  const f = join(dir, label + ".sql");
  try { writeFileSync(f, sql, "utf8"); return runSqlFile(dbUrl, f); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

// -A -t: unaligned, tuples only. Returns array of rows, each an array of column strings.
export function query(dbUrl, sql) {
  const out = run(dbUrl, ["-A", "-t", "-c", sql]);
  return out.split(/\r?\n/).filter(Boolean).map((l) => l.split("|"));
}

export function runMeta(dbUrl, metaCommand) { return run(dbUrl, ["-q", "-c", metaCommand]); }

export function makeWorkDir() { return mkdtempSync(join(tmpdir(), "ew-spawn-")); }
export function cleanWorkDir(dir) { if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true }); }
