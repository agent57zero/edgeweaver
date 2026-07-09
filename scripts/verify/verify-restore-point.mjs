// verify-restore-point.mjs - D17 dark verify (BRAINS.md section 7, plan box T2). Hermetic: no
// network, no real gh/git exec. Injects canned gh/git functions into gatherRestorePoint and
// checks the record shape, the rows-from-body parse (present and absent), the UTC date format,
// and that the injected functions (not a real shell-out) produced it. Then exercises the
// upsert-into-jsonl helper directly in a temp dir for append-then-replace idempotency and a
// JSON.parse round trip. Finally runs the CLI itself as a child: no args must exit 2, and
// --dry-run against a fresh temp root (no map file yet) must print "no map yet" and exit 0
// without ever shelling out to gh (the child runs with PATH/Path blanked, so a bare "gh" exec
// would fail loudly - proven separately, see below - rather than silently succeeding).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRegistry } from "../brains/profiles.mjs";
import { gatherRestorePoint, parseRowsFromBody, readRestorePoints, upsertRestorePoint } from "../brains/restore-point.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const RESTORE_POINT = join(ROOT, "scripts", "brains", "restore-point.mjs");
const node = process.execPath;
const fails = [];

// Fake gh/git: record every call (args array) so "were the injected functions actually called"
// is a real assertion, not an assumption. Args are matched the same way the real gh subcommands
// are shaped (release list / release view / api), never a real execFileSync underneath.
function makeFakeGh({ tag, body, soulShaFull }) {
  const calls = [];
  const fn = (a) => {
    calls.push(a);
    if (a[0] === "release" && a[1] === "list") return JSON.stringify([{ tagName: tag }]);
    if (a[0] === "release" && a[1] === "view") return JSON.stringify({ body });
    if (a[0] === "api") return soulShaFull + "\n";
    throw new Error("fake gh received an unexpected call: " + JSON.stringify(a));
  };
  return { fn, calls };
}
function makeFakeGit(shortSha) {
  const calls = [];
  const fn = (a) => { calls.push(a); return shortSha + "\n"; };
  return { fn, calls };
}

function runChild(argv, env) {
  try {
    const out = execFileSync(node, [RESTORE_POINT, ...argv], { encoding: "utf8", env: env || process.env, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 1 : e.status, out: (e.stdout || "") + (e.stderr || "") };
  }
}

try {
  // --- 1. record shape, rows parsing, date format, call attribution ---
  const gh1 = makeFakeGh({ tag: "backup-2026-07-08", body: "18 tables, 1,946 rows dumped, zero drift", soulShaFull: "0123456789abcdef0123456789abcdef01234567" });
  const git1 = makeFakeGit("deadbee");
  const rec = await gatherRestorePoint({ gh: gh1.fn, git: git1.fn, root: ROOT });

  const expectedKeys = ["date", "backupTag", "rows", "soulHead", "bodyHead", "generation", "schemaVersion", "stateArchive"];
  const keys = Object.keys(rec);
  if (keys.length !== 8) fails.push(`record has ${keys.length} keys, expected exactly 8: ${keys.join(", ")}`);
  for (const k of expectedKeys) if (!(k in rec)) fails.push(`record missing key "${k}"`);

  if (typeof rec.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) fails.push(`date is not YYYY-MM-DD: ${rec.date}`);
  if (rec.date !== new Date().toISOString().slice(0, 10)) fails.push(`date is not today's UTC date: ${rec.date}`);
  if (rec.backupTag !== "backup-2026-07-08") fails.push(`backupTag mismatch: ${rec.backupTag}`);
  if (rec.rows !== 1946) fails.push(`rows did not parse "1,946 rows" correctly: ${rec.rows}`);
  if (rec.soulHead !== "0123456") fails.push(`soulHead is not the 7-char truncation: ${rec.soulHead}`);
  if (rec.bodyHead !== "deadbee") fails.push(`bodyHead mismatch: ${rec.bodyHead}`);
  if (rec.stateArchive !== null) fails.push(`stateArchive is not null: ${JSON.stringify(rec.stateArchive)}`);

  const reg = await loadRegistry(ROOT);
  const live = reg.brains.find((b) => b.kind === "live" && b.status === "active");
  if (rec.generation !== live.generation) fails.push(`generation ${rec.generation} != live registry generation ${live.generation}`);
  if (rec.schemaVersion !== live.schemaVersion) fails.push(`schemaVersion ${rec.schemaVersion} != live registry schemaVersion ${live.schemaVersion}`);

  // the injected functions were actually called (no accidental real exec: these are plain
  // closures over an array, never execFileSync) - assert count AND shape of each call.
  if (gh1.calls.length !== 3) fails.push(`expected gh to be called 3 times (release list, release view, api), got ${gh1.calls.length}`);
  if (!gh1.calls[0] || gh1.calls[0][0] !== "release" || gh1.calls[0][1] !== "list") fails.push("gh call 1 was not 'release list'");
  if (!gh1.calls[1] || gh1.calls[1][0] !== "release" || gh1.calls[1][1] !== "view") fails.push("gh call 2 was not 'release view'");
  if (!gh1.calls[2] || gh1.calls[2][0] !== "api") fails.push("gh call 3 was not 'api'");
  if (git1.calls.length !== 1) fails.push(`expected git to be called 1 time, got ${git1.calls.length}`);
  if (!git1.calls[0] || git1.calls[0][0] !== "rev-parse") fails.push("git call was not 'rev-parse'");

  // --- 2. rows absent from the body -> null, never a guess ---
  const gh2 = makeFakeGh({ tag: "backup-2026-06-30", body: "Nightly backup completed successfully.", soulShaFull: "fedcba9876543210fedcba9876543210fedcba98" });
  const git2 = makeFakeGit("f00d123");
  const recNoRows = await gatherRestorePoint({ gh: gh2.fn, git: git2.fn, root: ROOT });
  if (recNoRows.rows !== null) fails.push(`rows should be null with no "<N> rows" phrase in the body, got ${recNoRows.rows}`);
  if (parseRowsFromBody("no figure here") !== null) fails.push("parseRowsFromBody did not return null for a figure-free body");
  if (parseRowsFromBody("18 tables, 1,946 rows dumped") !== 1946) fails.push("parseRowsFromBody did not parse a comma-thousands figure");

  // --- 3. append-then-replace idempotency + JSON.parse round trip, in a temp dir ---
  const idemDir = mkdtempSync(join(tmpdir(), "ew-verify-restore-idem-"));
  try {
    const mapPath = join(idemDir, "restore-points.jsonl");

    // two gathers, same real UTC date (gatherRestorePoint always stamps "today"): must leave ONE line.
    const gatherA1 = await gatherRestorePoint({ gh: gh1.fn, git: git1.fn, root: ROOT });
    upsertRestorePoint(mapPath, gatherA1);
    let raw = readFileSync(mapPath, "utf8").split(/\r?\n/).filter(Boolean);
    if (raw.length !== 1) fails.push(`after 1 gather, expected 1 line in the map, got ${raw.length}`);

    const gatherA2 = await gatherRestorePoint({ gh: gh1.fn, git: git1.fn, root: ROOT }); // same date again
    upsertRestorePoint(mapPath, gatherA2);
    raw = readFileSync(mapPath, "utf8").split(/\r?\n/).filter(Boolean);
    if (raw.length !== 1) fails.push(`after 2 gathers on the same date, expected the line REPLACED (still 1), got ${raw.length}`);

    // a different date must append, not replace.
    const recDifferentDay = { ...gatherA2, date: "2026-01-01" };
    upsertRestorePoint(mapPath, recDifferentDay);
    raw = readFileSync(mapPath, "utf8").split(/\r?\n/).filter(Boolean);
    if (raw.length !== 2) fails.push(`after a different-date record, expected 2 lines (appended), got ${raw.length}`);

    // file round-trips through JSON.parse per line (the GLOBAL JSON.parse, on the raw bytes on
    // disk - not trusting the module's own reader for this specific assertion).
    let allParsed = true;
    const parsedDates = [];
    for (const line of raw) {
      try { parsedDates.push(JSON.parse(line).date); } catch { allParsed = false; }
    }
    if (!allParsed) fails.push("a line in restore-points.jsonl did not round-trip through JSON.parse");
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (JSON.stringify(parsedDates.sort()) !== JSON.stringify(["2026-01-01", todayUtc].sort())) {
      fails.push(`unexpected dates in the map after upserts: ${parsedDates.join(", ")}`);
    }

    // the module's own reader agrees with the independent raw read above.
    const viaReader = readRestorePoints(mapPath);
    if (viaReader.length !== 2) fails.push(`readRestorePoints returned ${viaReader.length} records, expected 2`);
  } finally {
    rmSync(idemDir, { recursive: true, force: true });
  }

  // --- 4. CLI: no args -> usage, exit 2 ---
  const rUsage = runChild([]);
  if (rUsage.code !== 2) fails.push(`no-args CLI run should exit 2, got ${rUsage.code}: ${rUsage.out.trim()}`);

  // --- 5. CLI: --dry-run against a fresh temp root (no map file) -> "no map yet", exit 0, and
  // never touches gh. PATH/Path are blanked (not merely deleted: deleting them lets Node's
  // Windows spawn fall back to the real process PATH, verified empirically) so that IF this
  // code path ever regressed into calling gh, the child would fail loudly instead of silently
  // reaching the real network. ---
  const dryDir = mkdtempSync(join(tmpdir(), "ew-verify-restore-dry-"));
  try {
    const strippedEnv = { ...process.env, PATH: "", Path: "" };
    const rDry = runChild(["--dry-run", "--root", dryDir], strippedEnv);
    if (rDry.code !== 0) fails.push(`--dry-run on an empty root should exit 0, got ${rDry.code}: ${rDry.out.trim()}`);
    if (!/no map yet/.test(rDry.out)) fails.push(`--dry-run on an empty root should print "no map yet", got: ${rDry.out.trim()}`);
  } finally {
    rmSync(dryDir, { recursive: true, force: true });
  }
} catch (e) {
  fails.push("exception: " + e.message);
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: restore-point map dark verify - record shape (all 8 keys, right types); rows parsed from \"1,946 rows\" body text (1946) and null when absent; date is today's UTC YYYY-MM-DD; generation/schemaVersion match the live registry row; injected gh (3 calls: release list, release view, api) and git (1 call: rev-parse) were the only calls made; append-then-replace idempotency (two gathers same date -> 1 line, a different date -> 2 lines) with a JSON.parse round trip on the raw file; CLI no-args exits 2; CLI --dry-run on an empty temp root prints \"no map yet\" and exits 0 with PATH blanked (no gh reachable). No network, no real gh/git exec.");
