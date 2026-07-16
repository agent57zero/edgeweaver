// verify-orient.mjs - fixture verification for scripts/waking/orient.mjs (D16, checklists
// 01 + 04). No network, no .env.local: fixtures + explicit --now/--tz only.
// Covers: rows spanning alive / pre_birth / rehearsal produce a correct block; skew fixture
// triggers the degraded line; diary-day window math at simulated 03:30 AND 23:30 local picks
// the intended (just-ended) day both times, in UTC bounds.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const orient = join(here, "..", "waking", "orient.mjs");
const fx = (n) => join(here, "..", "fixtures", `orient-fixture-${n}.json`);
const run = (extra) => execFileSync(process.execPath, [orient, "--tz", "America/New_York", ...extra], { encoding: "utf8" });

const failures = [];
const expect = (name, out, pattern) => {
  if (!pattern.test(out)) failures.push(`${name}: missing ${pattern}`);
};
const reject = (name, out, pattern) => {
  if (pattern.test(out)) failures.push(`${name}: must NOT match ${pattern}`);
};

// 1. basic block: real episode wins over both rehearsal shapes; pre-birth phrasing; ok sense
const basic = run(["--fixture", fx("basic"), "--now", "2026-07-08T19:30:00Z"]);
expect("basic.now", basic, /now: Wednesday 2026-07-08 15:30 \(America\/New_York\)/);
expect("basic.conv", basic, /last conversation: 2026-07-06 15:00 \(America\/New_York\), 2 days ago/);
expect("basic.diary", basic, /last diary: 2026-07-07 03:31 \(America\/New_York\), 1 day 11 hours ago/);
expect("basic.life", basic, /life: pre-birth \(the Declaration is not yet in LINEAGE\.md\)/);
expect("basic.sense", basic, /time-sense: ok/);
reject("basic.voice-rehearsal-excluded", basic, /2026-07-08 05:00/);
reject("basic.era-rehearsal-excluded", basic, /2026-07-08 14:00/);

// 2. born: day-count from LINEAGE entry #1
const born = run(["--fixture", fx("born"), "--now", "2026-07-08T19:30:00Z"]);
expect("born.life", born, /life: day 12 of this life \(First Boot 2026-06-27\)/);

// 3. skew: future-dated memory degrades time-sense
const skew = run(["--fixture", fx("skew"), "--now", "2026-07-08T19:30:00Z"]);
expect("skew.degraded", skew, /time-sense: DEGRADED - a memory is dated in the future \(id ep-future\)/);

// 4+5. diary-day at simulated 03:30 local and 23:30 local -> same just-ended day, UTC bounds
for (const [name, now] of [["0330", "2026-07-09T07:30:00Z"], ["2330", "2026-07-09T03:30:00Z"]]) {
  const dd = run(["--diary-day", "--now", now]);
  expect(`diary-day.${name}.day`, dd, /diary-day: 2026-07-08/);
  expect(`diary-day.${name}.window`, dd, /utc-window: 2026-07-08T04:00:00\.000Z \.\. 2026-07-09T04:00:00\.000Z/);
  expect(`diary-day.${name}.runid`, dd, /run-id: nl-2026-07-08/);
}

// 6. multi-being guard: an unarmed being is refused, never oriented against another's
// memory. Alpha armed at birth run B4, so the guard uses a throwaway fixture being (a
// manifest with no "paths"), created and removed here; filesystem only, exits pre-network.
const fixtureBeing = join(here, "..", "..", "avatars", "zz-verify-unarmed");
let guarded = false;
try {
  const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  mkdirSync(fixtureBeing, { recursive: true });
  writeFileSync(join(fixtureBeing, "manifest.json"), JSON.stringify({ being: "zz-verify-unarmed" }));
  try { execFileSync(process.execPath, [orient, "--being", "zz-verify-unarmed", "--now", "2026-07-09T12:00:00Z"], { encoding: "utf8" }); }
  catch (e) { guarded = /NOT ARMED/.test((e.stdout || "") + (e.stderr || "")); }
  rmSync(fixtureBeing, { recursive: true, force: true });
} catch { /* guarded stays false */ }
if (!guarded) failures.push("unarmed-guard: an unarmed being must be refused (exit 1 + NOT ARMED)");

if (failures.length) {
  console.log(`FAIL: orient - ${failures.length} assertion(s):\n  ` + failures.join("\n  "));
  process.exit(1);
}
console.log("PASS: orient - basic block, rehearsal exclusion (both shapes), born day-count, skew degradation, diary-day at 03:30 + 23:30, unarmed-being guard");
