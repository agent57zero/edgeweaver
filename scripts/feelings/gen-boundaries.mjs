// gen-boundaries.mjs - A10: generate state/boundaries.json (anger-signal registry; state-schemas)
// from a constitution hard-boundaries source (+ confirmed agent_memories prefs at arming). DARK:
// reads a --source markdown/json of hard-boundary lines and writes the registry. The real
// CONSTITUTION.md is a soulfile (never touched during the dark build); arming points --source at
// it. Anger signal (computed in signals.mjs) excludes Alan's legitimate gate declines via
// overrides_log.gate_decline.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); if (i < 0) return d; const v = argv[i + 1]; return (v === undefined || v.startsWith("--")) ? true : v; };
const sourcePath = opt("source", null);
const out = opt("out", join(ROOT, "state", "boundaries.json"));

function parseBullets(text) {
  return text.split(/\r?\n/).map((l) => l.match(/^\s*[-*]\s+(.+)$/)).filter(Boolean).map((m) => m[1].trim());
}

let texts = [];
const sources = [];
if (sourcePath && existsSync(sourcePath)) {
  const t = await readFile(sourcePath, "utf8");
  texts = sourcePath.endsWith(".json") ? (JSON.parse(t).boundaries || JSON.parse(t)) : parseBullets(t);
  sources.push("constitution:" + sourcePath);
}

const boundaries = texts.map((x, i) => ({ id: `b-${String(i + 1).padStart(3, "0")}`, text: typeof x === "string" ? x : x.text, source: (typeof x === "object" && x.source) || "constitution" }));

const doc = {
  generated_from: sources.length ? sources : ["(no source provided; arming wires CONSTITUTION.md hard boundaries + confirmed agent_memories prefs)"],
  generated_at: new Date().toISOString(),
  boundaries,
  overrides_log: [],
};
await mkdir(join(ROOT, "state"), { recursive: true });
await writeFile(out, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`boundaries.json written: ${boundaries.length} boundaries -> ${out}`);
