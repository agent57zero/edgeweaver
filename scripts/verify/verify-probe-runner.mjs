// verify-probe-runner.mjs - static verification of the repository-backed probe runner.
// It pins generated configuration, per-target walls, repository save/resume, and version
// metadata without opening or reading any protected gates repository.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

try {
  execFileSync(process.execPath, [join(ROOT, "scripts", "tools", "build-probe-runner.mjs"), "--check"], { encoding: "utf8" });
} catch (e) {
  fails.push("builder --check failed: " + ((e.stdout || "") + (e.stderr || "")).trim().split("\n")[0]);
}

const html = readFileSync(join(ROOT, "tools", "probe-runner.html"), "utf8");
const registry = JSON.parse(readFileSync(join(ROOT, "tools", "probe-runner-targets.json"), "utf8"));
const m = html.match(/<script type="application\/json" id="ew-config">([\s\S]*?)<\/script>/);
ok(m, "ew-config block missing");
let cfg = {};
try { cfg = JSON.parse(m ? m[1] : "{}"); } catch { fails.push("ew-config does not parse as JSON"); }
const beings = cfg.beings || {};

ok(cfg.version === 2, "runner config must be version 2");
ok(registry.schemaVersion === 1, "target registry schema version must be 1");
ok(Object.keys(registry.targets || {}).length >= 2, "target registry must carry Genesis and Alpha");
ok(beings.genesis && beings.alpha, "generated config must carry Genesis and Alpha");

for (const key of ["genesis", "alpha"]) {
  if (!beings[key]) continue;
  const target = registry.targets[key];
  const manifest = JSON.parse(readFileSync(join(ROOT, target.manifest), "utf8"));
  ok(beings[key].wakeCommand === manifest.commands?.wake, `${key}: wakeCommand must equal manifest commands.wake`);
  ok(beings[key].dimensions?.length === 5, `${key}: expected 5 rubric dimensions`);
  ok(beings[key].manifest === target.manifest, `${key}: generated config must retain its manifest pointer`);
}
if (beings.genesis && beings.alpha) {
  ok(JSON.stringify(beings.genesis.thresholds) === JSON.stringify(beings.alpha.thresholds),
    "thresholds must be identical across beings (identical-battery rule)");
  ok(beings.genesis.ceremonyCard && beings.genesis.ceremonyCard.arming.includes("EdgeweaverGenesisNightLoopLite")
    && beings.genesis.ceremonyCard.arming.includes("/night-loop-lite-genesis"),
    "Genesis ceremony card must carry the per-being arming command (D20)");
  ok(beings.alpha.ceremonyCard === null, "Alpha ceremony card is written at A5 and must remain null");
}

ok(html.includes("showDirectoryPicker"), "direct local-repository save is missing");
ok(html.includes("run.json") && html.includes("importRepositoryBundle"), "repository run save/resume bundle is missing");
ok(html.includes("version_label") && html.includes("generation"), "generation/version metadata is missing from exports");
ok(html.includes("Do not select the main Edgeweaver repository"), "main-repo protected-data warning is missing");
ok(html.includes("probe-runner-targets.json"), "committed multi-target registry is not named in the app");

ok(html.includes("never the scenario"), "scenario-text guard string missing");
ok(html.includes("village/experiment-log.md"), "no-comparison footer missing");
ok(html.includes("hashchange"), "hash router missing");
ok(!/\bsrc\s*=\s*["']https?:/.test(html) && !/<link[^>]+href\s*=\s*["']https?:/.test(html) && !/fetch\s*\(\s*["']https?:/.test(html),
  "app must load no external resources");
ok(!html.includes("â€”"), "no em-dashes in the app (Alan's rule)");

if (fails.length) { console.log("FAIL: probe-runner - " + fails.length + " problem(s):\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: probe-runner - registry current; Genesis/Alpha manifest-true; repository save/resume and generation labels present; walls hold");
