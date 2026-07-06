// generate-synthetic-day.mjs — A1 fixtures: a plausible synthetic day of rehearsal records
// (episodes, intentions, calendar items) shaped exactly like OB1 thoughts. Every record carries
// metadata.rehearsal=true, a shared run_id ("nl-rehearsal-<ts>"), audience=alan, synthetic=true.
//
// Default target is a LOCAL store: state/rehearsal/<run_id>/day.jsonl — safe, no OB1 writes.
//   node scripts/fixtures/generate-synthetic-day.mjs [--run-id <id>]
// OB1 target writes rehearsal-tagged thoughts to the brain (rule 3: tiny + void immediately):
//   node scripts/fixtures/generate-synthetic-day.mjs --target ob1 [--run-id <id>]
// Prints one JSON line: { target, run_id, written, episodes, intentions, calendar }.
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ob1Client } from "./ob1-client.mjs";

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return (v === undefined || v.startsWith("--")) ? true : v;
};

const target = opt("target", "local");
const runId = opt("run-id", `nl-rehearsal-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const ROOT = join(import.meta.dirname, "..", "..");
const base = (extra) => ({ rehearsal: true, synthetic: true, run_id: runId, audience: "alan", era: "rehearsal", ...extra });

const episodes = [
  "Morning: Alan reviewed the OB1 embedding-backfill numbers and asked about drift.",
  "Midday: worked the SPARK matrix-code duplicates — three archive-file pairs to reconcile.",
  "Afternoon: talked through the voice-stack latency budget and the ChatGPT-voice quality bar.",
  "Evening: Alan mentioned the village roster and the open initiation-holder seat.",
  "Late: a short reflective exchange about pacing — build capacity, not calendar.",
].map((content, i) => ({
  content: `REHEARSAL EPISODE — ${content}`,
  source_type: "edgeweaver_episode",
  metadata: base({ fixture_kind: "episode", importance: 4 + (i % 4), seq: i + 1, ts_local: `2026-07-05T${String(8 + i * 3).padStart(2, "0")}:15:00` }),
}));

const intentions = [
  "Follow up with Alan on arming the session-pooler backups once the string lands.",
  "Prepare the coherence-panel v0 snapshot inputs.",
].map((content, i) => ({
  content: `REHEARSAL INTENTION — ${content}`,
  source_type: "edgeweaver_episode",
  metadata: base({ fixture_kind: "intention", importance: 6, seq: i + 1 }),
}));

const calendar = [
  { c: "REHEARSAL CALENDAR — Possibility Team circle (90 min).", when: "2026-07-06T17:00:00" },
  { c: "REHEARSAL CALENDAR — Dentist 14:00; expect low afternoon responsiveness.", when: "2026-07-07T14:00:00" },
].map((x, i) => ({
  content: x.c,
  source_type: "edgeweaver_episode",
  metadata: base({ fixture_kind: "calendar", when: x.when, seq: i + 1 }),
}));

const all = [...episodes, ...intentions, ...calendar];
const summary = { target, run_id: runId, written: all.length, episodes: episodes.length, intentions: intentions.length, calendar: calendar.length };

if (target === "ob1") {
  const ob1 = await ob1Client();
  let n = 0;
  for (const rec of all) { await ob1.insert(rec); n++; }
  summary.written = n;
  console.log(JSON.stringify(summary));
} else {
  const dir = join(ROOT, "state", "rehearsal", runId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "day.jsonl"), all.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  summary.path = `state/rehearsal/${runId}/day.jsonl`;
  console.log(JSON.stringify(summary));
}
