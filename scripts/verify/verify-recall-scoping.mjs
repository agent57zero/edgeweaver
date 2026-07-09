// verify-recall-scoping.mjs - offline, fixture-pinned verify for the recall wrapper's
// audience walls (no network, no credentials). Three legs:
//   1. SOURCE PIN: the committed wrapper source carries the fail-closed default
//      (unlabeled rows resolve to "unlabeled", which no scope allowlist contains) and
//      the old fail-open default (`: "public"`) is gone.
//   2. LOGIC REPLICA: the scope/class filter, replicated verbatim from the source,
//      run over fixture rows: unlabeled rows invisible at every scope; pre_birth
//      defaults alan; labeled rows behave per conventions/memory-conventions.md.
//   3. MIRROR: scripts/edge-functions/recall-scoped.ts is byte-identical to the
//      deployable copy at supabase/functions/recall-scoped/index.ts.
// The replica can drift from the source; leg 1 pins the load-bearing line so drift
// on the wall itself cannot pass silently.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

// leg 1: source pin
const srcPath = join(ROOT, "scripts", "edge-functions", "recall-scoped.ts");
const src = await readFile(srcPath, "utf8");
if (!src.includes(`meta.audience ?? (meta.era === "pre_birth" ? "alan" : "unlabeled")`))
  fail("wrapper source lost the fail-closed audience default");
if (src.includes(`: "public");`))
  fail("wrapper source still contains a fail-open public default");
if (!src.match(/SCOPES[\s\S]*alan: \["alan", "known-other", "public"\]/))
  fail("scope allowlists changed shape; re-pin this verify against the new shape");
if (src.includes(`"unlabeled"]`))
  fail("'unlabeled' must never appear inside a scope allowlist");

// leg 2: logic replica over fixtures
const LIBRARY = ["pm_teaching", "coherence_teaching"];
const FICTION = ["dream"];
const INTERPRETATION = ["feeling_reading", "gremlin_report", "box_snapshot", "diary", "self_belief", "reflection"];
const classOf = (st) =>
  !st ? "experienced" : LIBRARY.includes(st) ? "library" : FICTION.includes(st) ? "fiction"
  : INTERPRETATION.includes(st) ? "interpretation" : "experienced";
const SCOPES = {
  alan: ["alan", "known-other", "public"], "known-other": ["known-other", "public"], public: ["public"],
};
const visible = (row, consumer, scope) => {
  const meta = row.metadata || {};
  const st = row.source_type ?? meta.source_type ?? null;
  const audience = meta.audience ?? (meta.era === "pre_birth" ? "alan" : "unlabeled");
  const cls = classOf(st);
  if (!(SCOPES[scope] ?? SCOPES.public).includes(audience)) return false;
  return consumer === "study"
    ? (cls === "library" || ["experiment", "distinction"].includes(st))
    : (cls === "experienced" || cls === "interpretation");
};

const rows = {
  alanUnlabeled: { source_type: null, metadata: {} },                                        // Alan's raw OB1 row
  alanUnlabeledTyped: { source_type: "note", metadata: {} },                                 // typed but unlabeled
  preBirth: { source_type: "edgeweaver_episode", metadata: { era: "pre_birth" } },           // import default
  episodeAlan: { source_type: "edgeweaver_episode", metadata: { audience: "alan" } },
  libraryPublic: { source_type: "pm_teaching", metadata: { audience: "public" } },
  libraryKnown: { source_type: "coherence_teaching", metadata: { audience: "known-other" } },
  dream: { source_type: "dream", metadata: { audience: "alan" } },
  experimentAlan: { source_type: "experiment", metadata: { audience: "alan" } },
};
const expect = (cond, msg) => { if (!cond) fail(msg); };

for (const scope of ["alan", "known-other", "public"]) {
  expect(!visible(rows.alanUnlabeled, "episodic", scope), `unlabeled row leaked at scope ${scope}`);
  expect(!visible(rows.alanUnlabeledTyped, "episodic", scope), `unlabeled typed row leaked at scope ${scope}`);
  expect(!visible(rows.alanUnlabeled, "study", scope), `unlabeled row leaked to study at scope ${scope}`);
}
expect(visible(rows.preBirth, "episodic", "alan"), "pre_birth row must stay recallable at alan scope");
expect(!visible(rows.preBirth, "episodic", "known-other"), "pre_birth row leaked at known-other scope");
expect(visible(rows.episodeAlan, "episodic", "alan"), "labeled alan episode must surface at alan scope");
expect(!visible(rows.episodeAlan, "episodic", "public"), "alan episode leaked at public scope");
expect(visible(rows.libraryPublic, "study", "public"), "public library must surface to study at public scope");
expect(visible(rows.libraryKnown, "study", "alan"), "known-other library must surface to study at alan scope");
expect(!visible(rows.libraryKnown, "study", "public"), "known-other library leaked at public scope");
expect(!visible(rows.libraryPublic, "episodic", "alan"), "library leaked into episodic recall");
expect(!visible(rows.dream, "episodic", "alan"), "dream (fiction) leaked into episodic recall");
expect(visible(rows.experimentAlan, "study", "alan"), "experiment row must remain studyable at alan scope");

// leg 3: deployable mirror is byte-identical
const mirror = await readFile(join(ROOT, "supabase", "functions", "recall-scoped", "index.ts"), "utf8");
if (mirror !== src) fail("supabase/functions/recall-scoped/index.ts differs from scripts/edge-functions/recall-scoped.ts");

console.log("PASS: recall scoping walls - fail-closed unlabeled default pinned in source; " +
  "replica fixtures: unlabeled invisible at all 3 scopes (episodic + study), pre_birth=alan only, " +
  "labeled episode/library/fiction behave per conventions; deploy mirror byte-identical.");
