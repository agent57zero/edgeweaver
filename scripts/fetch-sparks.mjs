// fetch-sparks.mjs — download the English SPARK archive (checklist 00, Phase 0b)
// Scrapes the index (never hand-enumerates the lettered range), downloads politely at
// <=1 req/sec, idempotent (skips files already on disk). Node 18+ (built-in fetch).
// Usage: node scripts/fetch-sparks.mjs
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const INDEX = "https://sparks.nextculture.org/";
const OUT = join(import.meta.dirname, "..", "corpus", "sparks");
const DELAY_MS = 1100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(INDEX, { headers: { "User-Agent": "edgeweaver-corpus-fetch (CC-BY-SA reuse; contact: repo owner)" } });
if (!res.ok) throw new Error(`index fetch failed: HTTP ${res.status}`);
const html = await res.text();

const names = [...new Set(
  [...html.matchAll(/res\/sparks\/(Spark-[A-Za-z0-9]+-en\.pdf)/g)].map((m) => m[1])
)].sort();
console.log(`index lists ${names.length} English SPARK PDFs`);
if (names.length < 250) console.warn("WARN: expected ~311; index may have changed — proceeding anyway");

await mkdir(OUT, { recursive: true });
let downloaded = 0, skipped = 0, failed = [];
for (const name of names) {
  const dest = join(OUT, name);
  try { await access(dest); skipped++; continue; } catch {}
  try {
    const r = await fetch(`https://sparks.nextculture.org/res/sparks/${name}`, {
      headers: { "User-Agent": "edgeweaver-corpus-fetch (CC-BY-SA reuse)" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error(`suspiciously small (${buf.length} bytes)`);
    await writeFile(dest, buf);
    downloaded++;
    if (downloaded % 25 === 0) console.log(`  ${downloaded} downloaded...`);
  } catch (e) {
    failed.push(`${name}: ${e.message}`);
  }
  await sleep(DELAY_MS);
}
console.log(`done: ${downloaded} downloaded, ${skipped} already present, ${failed.length} failed`);
if (failed.length) { console.log("failures:"); failed.forEach((f) => console.log("  " + f)); }
