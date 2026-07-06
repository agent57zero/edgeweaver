// wal.mjs - A4 WAL / degraded-mode buffer (IMPLEMENTATION §11; state-schemas.md).
// All OB1 writes go through this append-first write-ahead log so a brain outage never loses a
// write and never makes the being guess. state/wal/<YYYY-MM-DD>.jsonl, one JSON object per line:
// {ts, kind, payload, fingerprint}. Replay dedupes by fingerprint (OB1 core also does
// content-fingerprint dedupe) and moves the drained file to state/wal/replayed/. On read failure
// the caller reports memory as degraded rather than guessing.
import { createHash } from "node:crypto";
import { appendFile, mkdir, readdir, readFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const WAL_DIR = join(ROOT, "state", "wal");

export function fingerprint(payload) {
  const basis = typeof payload?.content === "string"
    ? payload.content
    : JSON.stringify(payload, Object.keys(payload || {}).sort());
  return "sha256-" + createHash("sha256").update(basis).digest("hex");
}

// append(kind, payload) -> the buffered record. opts.dir/opts.now for tests.
export async function append(kind, payload, opts = {}) {
  const dir = opts.dir || WAL_DIR;
  const now = opts.now || new Date();
  await mkdir(dir, { recursive: true });
  const rec = { ts: now.toISOString(), kind, payload, fingerprint: fingerprint(payload) };
  await appendFile(join(dir, `${now.toISOString().slice(0, 10)}.jsonl`), JSON.stringify(rec) + "\n", "utf8");
  return rec;
}

// replay(sink): sink(rec) => Promise. Returns {replayed, deduped, files}. Drained files move to replayed/.
export async function replay(sink, opts = {}) {
  const dir = opts.dir || WAL_DIR;
  if (!existsSync(dir)) return { replayed: 0, deduped: 0, files: 0 };
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort();
  const seen = new Set();
  let replayed = 0, deduped = 0;
  for (const f of files) {
    const lines = (await readFile(join(dir, f), "utf8")).split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      const rec = JSON.parse(l);
      if (seen.has(rec.fingerprint)) { deduped++; continue; }
      seen.add(rec.fingerprint);
      await sink(rec);
      replayed++;
    }
    const rdir = join(dir, "replayed");
    await mkdir(rdir, { recursive: true });
    await rename(join(dir, f), join(rdir, f));
  }
  return { replayed, deduped, files: files.length };
}

// healthCheck(ping): ping() => Promise<bool reachable>. Returns {ok, degraded, message}.
export async function healthCheck(ping) {
  let reachable = false;
  try { reachable = await ping(); } catch { reachable = false; }
  return reachable
    ? { ok: true, degraded: false, message: "OB1 reachable" }
    : { ok: false, degraded: true, message: "memory is degraded: OB1 unreachable - buffering writes to the WAL; recall is provisional, not guessed" };
}
