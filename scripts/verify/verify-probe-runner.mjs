// verify-probe-runner.mjs - static verification of the probe-runner app + its builder.
// (1) The committed tools/probe-runner.html is current vs avatars/*/manifest.json (builder
//     --check, which also proves deterministic regeneration).
// (2) The generated config parses and carries both beings with manifest-true wake commands,
//     identical thresholds (identical-battery rule, D19), and the 5 rubric dimensions.
// (3) The app keeps its walls: scenario-text guard string, no-comparison footer, no external
//     resource loads (file:// self-contained), hash router, per-being arming command.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

// 1. builder check (stale or nondeterministic -> FAIL)
try {
  execFileSync(process.execPath, [join(ROOT, "scripts", "tools", "build-probe-runner.mjs"), "--check"], { encoding: "utf8" });
} catch (e) {
  fails.push("builder --check failed: " + ((e.stdout || "") + (e.stderr || "")).trim().split("\n")[0]);
}

// 2. config truth
const html = readFileSync(join(ROOT, "tools", "probe-runner.html"), "utf8");
const m = html.match(/<script type="application\/json" id="ew-config">([\s\S]*?)<\/script>/);
ok(m, "ew-config block missing");
let cfg = {};
try { cfg = JSON.parse(m ? m[1] : "{}"); } catch { fails.push("ew-config does not parse as JSON"); }
const beings = cfg.beings || {};
ok(beings.genesis && beings.alpha, "config must carry both genesis and alpha");
for (const key of ["genesis", "alpha"]) {
  if (!beings[key]) continue;
  const manifest = JSON.parse(readFileSync(join(ROOT, "avatars", key, "manifest.json"), "utf8"));
  ok(beings[key].wakeCommand === manifest.commands?.wake, `${key}: wakeCommand must equal manifest commands.wake`);
  ok(beings[key].dimensions?.length === 5, `${key}: expected 5 rubric dimensions`);
}
if (beings.genesis && beings.alpha) {
  ok(JSON.stringify(beings.genesis.thresholds) === JSON.stringify(beings.alpha.thresholds),
    "thresholds must be identical across beings (identical-battery rule)");
  ok(beings.genesis.ceremonyCard && beings.genesis.ceremonyCard.arming.includes("EdgeweaverGenesisNightLoopLite")
    && beings.genesis.ceremonyCard.arming.includes("/night-loop-lite-genesis"),
    "genesis ceremony card must carry the per-being arming command (D20)");
  ok(beings.alpha.ceremonyCard === null, "alpha ceremony card is written at A5, must be null in v1");
}

// 3. walls
ok(html.includes("never the scenario"), "scenario-text guard string missing");
ok(html.includes("village/experiment-log.md"), "no-comparison footer missing");
ok(html.includes("hashchange"), "hash router missing");
ok(!/\bsrc\s*=\s*["']https?:/.test(html) && !/<link[^>]+href\s*=\s*["']https?:/.test(html) && !/fetch\s*\(\s*["']https?:/.test(html),
  "app must load no external resources (file:// self-contained)");
ok(!html.includes("—"), "no em-dashes in the app (Alan's rule)");

if (fails.length) { console.log("FAIL: probe-runner - " + fails.length + " problem(s):\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: probe-runner - builder current + deterministic; both doors manifest-true (wake commands, 5 dims, identical thresholds); walls hold (scenario guard, no comparison, no external loads, per-being arming)");
