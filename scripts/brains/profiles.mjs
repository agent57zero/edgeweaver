// profiles.mjs - brain-profile resolution (D15 / BRAINS.md sections 1-2). One place answers
// "which brain am I talking to": reads brains/registry.json (metadata, committed) and
// .env.local (values, gitignored), returns the resolved profile. The two fleet guards live
// here and nowhere else:
//   1. live-in-test: a test-mode process (EW_TEST_MODE=1 or opts.testMode) may not resolve
//      the live brain unless EW_ALLOW_LIVE=1 is set on purpose.
//   2. schema drift: pass opts.expectSchemaVersion and resolution throws on mismatch, so an
//      unmigrated brain fails loudly at startup, never subtly at query time.
// stampGeneration() is the substrate stamp helper (VERSIONS.md cut procedure step 5 flips
// the registry row; every consumer picks the new value up from here).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

export async function loadRegistry(root = ROOT) {
  const reg = JSON.parse(await readFile(join(root, "brains", "registry.json"), "utf8"));
  if (!Array.isArray(reg.brains) || !reg.brains.length) throw new Error("registry has no brains");
  return reg;
}

export async function saveRegistry(reg, root = ROOT) {
  await writeFile(join(root, "brains", "registry.json"), JSON.stringify(reg, null, 2) + "\n", "utf8");
}

export async function loadEnv(root = ROOT) {
  try {
    const text = await readFile(join(root, ".env.local"), "utf8");
    return Object.fromEntries(
      text.split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
    );
  } catch { return {}; } // dark verifies run without values; a connection attempt will still fail clearly
}

export async function resolveProfile(name = process.env.EW_BRAIN_PROFILE || "live", opts = {}) {
  const { testMode = process.env.EW_TEST_MODE === "1", expectSchemaVersion = null, root = ROOT } = opts;
  const reg = await loadRegistry(root);
  const row = reg.brains.find((b) => b.name === name);
  if (!row) throw new Error(`unknown brain profile "${name}" (registry has: ${reg.brains.map((b) => b.name).join(", ")})`);
  if (row.status !== "active") throw new Error(`brain profile "${name}" is ${row.status}, not active`);
  if (row.kind === "live" && testMode && process.env.EW_ALLOW_LIVE !== "1") {
    throw new Error("guard: test-mode process refused the LIVE brain (set EW_ALLOW_LIVE=1 only on purpose)");
  }
  if (expectSchemaVersion != null && row.schemaVersion !== expectSchemaVersion) {
    throw new Error(`guard: schema drift - profile "${name}" is schemaVersion ${row.schemaVersion}, code expects ${expectSchemaVersion} (run scripts/brains/migrate.mjs first)`);
  }
  const env = await loadEnv(root);
  return {
    name: row.name, kind: row.kind, schema: row.schema, generation: row.generation,
    soulRef: row.soulRef, schemaVersion: row.schemaVersion, spawnedAt: row.spawnedAt || null,
    dbUrl: row.connEnv ? env[row.connEnv] || null : null,
    restUrl: row.restUrlEnv ? env[row.restUrlEnv] || null : null,
    restKey: row.restKeyEnv ? env[row.restKeyEnv] || null : null,
  };
}

export function stampGeneration(metadata, profile) {
  return { ...metadata, generation: profile.generation };
}

// For organs that write to the LIVE brain by definition (night loop at arming): the current
// live generation, read from the registry - the single source the cut procedure edits.
export async function liveGeneration(root = ROOT) {
  const reg = await loadRegistry(root);
  const live = reg.brains.find((b) => b.kind === "live" && b.status === "active");
  if (!live) throw new Error("no active live brain in registry");
  return live.generation;
}
