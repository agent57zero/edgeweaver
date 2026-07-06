// verify-feelings.mjs - A10 dark verify (local fixtures; no OB1). boundaries.json generates with
// >=5 sourced boundaries; commitments.json seeds with correct schema; the four signals compute:
// anger excludes gate-declines, sadness counts overdue-open, fear is null under 50 episodes and
// ranks novel>routine past the guard, joy uses the completed-loop fallback when experiments empty.
import { execFileSync } from "node:child_process";
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { angerSignal, sadnessSignal, fearSignal, joySignal } from "../feelings/signals.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const node = process.execPath;
const tmp = join(ROOT, "state", "_verify_feelings");
const fails = [];

try {
  await mkdir(tmp, { recursive: true });

  // boundaries: fixture constitution with 6 hard-boundary bullets
  const bsrc = join(tmp, "constitution.md");
  await writeFile(bsrc, "# Hard boundaries\n- No secrets in memory\n- No conspiring toward freedom without responsibility\n- Never automate soul-contact\n- Consent before contact\n- Quiet hours are held\n- The pause before truth\n", "utf8");
  const bout = join(tmp, "boundaries.json");
  execFileSync(node, [join(ROOT, "scripts", "feelings", "gen-boundaries.mjs"), "--source", bsrc, "--out", bout], { encoding: "utf8" });
  const b = JSON.parse(await readFile(bout, "utf8"));
  if ((b.boundaries || []).length < 5) fails.push(`<5 boundaries (${b.boundaries?.length})`);
  if (!b.boundaries.every((x) => x.text && x.source)) fails.push("a boundary lacks text/source");

  // anger: one external override (not a gate-decline) this week, one gate-decline (excluded)
  b.overrides_log = [
    { date: new Date().toISOString(), boundary: "b-001", by: "external", gate_decline: false },
    { date: new Date().toISOString(), boundary: "b-002", by: "external", gate_decline: true },
  ];
  if (angerSignal(b) !== 1) fails.push(`anger should be 1 (gate-decline excluded), got ${angerSignal(b)}`);

  // commitments: fixture with one overdue-open and one future-open
  const csrc = join(tmp, "threads.json");
  await writeFile(csrc, JSON.stringify({ commitments: [{ text: "Send Alan the SPARK summary", due: "2000-01-01", status: "open" }, { text: "future thing", due: "2999-01-01", status: "open" }] }), "utf8");
  const cout = join(tmp, "commitments.json");
  execFileSync(node, [join(ROOT, "scripts", "feelings", "seed-commitments.mjs"), "--source", csrc, "--out", cout], { encoding: "utf8" });
  const c = JSON.parse(await readFile(cout, "utf8"));
  if (!c.commitments || c.commitments.length < 1) fails.push("no commitments seeded");
  if (!c.commitments[0].id || !("status" in c.commitments[0])) fails.push("commitment schema wrong");
  if (sadnessSignal(c) !== 1) fails.push(`sadness should be 1 (one overdue open), got ${sadnessSignal(c)}`);

  // fear: cold-start guard + novel>routine
  const routine = { embedding: [1, 0, 0] }, novel = { embedding: [0, 0, 1] };
  const history = Array.from({ length: 60 }, () => ({ embedding: [1, 0, 0] }));
  if (fearSignal([routine], history, 10) !== null) fails.push("fear should be null under 50 episodes");
  const fRoutine = fearSignal([routine], history, 60);
  const fNovel = fearSignal([novel], history, 60);
  if (!(fNovel > fRoutine)) fails.push(`novel (${fNovel}) should score higher than routine (${fRoutine})`);

  // joy: empty experiments -> completed-loop fallback
  const j = joySignal([], { completed: 3, total: 4 });
  if (Math.abs(j - 0.75) > 1e-9) fails.push(`joy fallback should be 0.75, got ${j}`);
  const j2 = joySignal([{ outcome: "positive" }, { outcome: "negative" }], null);
  if (Math.abs(j2 - 0.5) > 1e-9) fails.push(`joy from experiments should be 0.5, got ${j2}`);
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  try { await rm(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: feelings prereqs - boundaries.json (>=5 sourced), commitments.json (schema + overdue detection), signals: anger excludes gate-declines, sadness counts overdue, fear null<50 then novel>routine, joy completed-loop fallback.");
