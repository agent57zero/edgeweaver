// orient.mjs - the deterministic orientation script (D16, checklist 01 temporal amendments).
// The model NEVER does date arithmetic; it runs this and speaks the result plainly.
//
// Default mode prints the waking orientation block:
//   now + weekday via EDGEWEAVER_TZ; delta since the last real conversation (era=alive,
//   voice/rehearsal rows excluded); last diary delta; day-count since First Boot once
//   LINEAGE.md carries entry #1 (honest pre-birth phrasing before); clock-skew check
//   (a memory dated in the future = degraded time-sense).
//
// --diary-day mode prints the night-loop window (D16 diary-day rule, checklist 04):
//   diary-day = the local calendar day containing T minus 12h (at the scheduled 03:30 run
//   that is the day that just ended), its UTC bounds, and the run-id nl-<diary-day>.
//
// Flags: --now <ISO>      test override for "now" (default: real now)
//        --tz <IANA>      test override (default: EDGEWEAVER_TZ from env or .env.local,
//                         else the system zone)
//        --fixture <path> JSON {thoughts:[{id,source_type,created_at,metadata}],lineage:"md"}
//                         - no network, no .env.local, no soul-repo read (verify mode)
//        --diary-day      window mode (see above)
// Never prints secret values. Exit 0 even when degraded (orientation must never block a
// waking); exit 1 only on misuse (bad flags / unreadable fixture).

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOUL = process.env.SOUL_REPO_PATH || "C:\\Users\\agent\\Project\\edgeweaver-soul";
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DIARY_MODE = args.includes("--diary-day");
const NOW = flag("--now") ? Date.parse(flag("--now")) : Date.now();
if (Number.isNaN(NOW)) { console.error("bad --now"); process.exit(1); }
const FIXTURE = flag("--fixture");

// ---------- env (lazy; values never printed) ----------
function envLocal(name) {
  try {
    const text = readFileSync(join(ROOT, ".env.local"), "utf8").replace(/^﻿/, "");
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
    }
  } catch { /* absent is fine */ }
  return undefined;
}
const TZ = flag("--tz") || process.env.EDGEWEAVER_TZ || (FIXTURE ? undefined : envLocal("EDGEWEAVER_TZ"))
  || Intl.DateTimeFormat().resolvedOptions().timeZone;

// ---------- timezone math (all arithmetic here, never in the model) ----------
function parts(instantMs, tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "long",
  });
  const p = {};
  for (const { type, value } of fmt.formatToParts(new Date(instantMs))) p[type] = value;
  if (p.hour === "24") p.hour = "00";
  return p;
}
const localDayOf = (ms, tz) => { const p = parts(ms, tz); return `${p.year}-${p.month}-${p.day}`; };
const localStamp = (ms, tz) => { const p = parts(ms, tz); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };
// "wall clock read as if UTC" - lets us compute the zone offset at an instant
function wallMs(instantMs, tz) {
  const p = parts(instantMs, tz);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}
// UTC instant at which the zone's wall clock reads wallTargetMs (two-pass, DST-safe)
function utcForWall(wallTargetMs, tz) {
  let guess = wallTargetMs - (wallMs(wallTargetMs, tz) - wallTargetMs);
  guess = wallTargetMs - (wallMs(guess, tz) - guess);
  return guess;
}
const dayToMs = (day) => Date.parse(day + "T00:00:00Z");
const msToDay = (ms) => new Date(ms).toISOString().slice(0, 10);
function ago(ms) {
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  if (d > 0) return h > 0 ? `${d} day${d > 1 ? "s" : ""} ${h} hour${h > 1 ? "s" : ""} ago` : `${d} day${d > 1 ? "s" : ""} ago`;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ${m} minute${m !== 1 ? "s" : ""} ago (today)`;
  return `${m} minute${m !== 1 ? "s" : ""} ago (today)`;
}

// ---------- diary-day mode ----------
if (DIARY_MODE) {
  const day = localDayOf(NOW - 12 * 36e5, TZ);
  const next = msToDay(dayToMs(day) + 864e5);
  const start = utcForWall(dayToMs(day), TZ);
  const end = utcForWall(dayToMs(next), TZ);
  console.log(`diary-day: ${day}`);
  console.log(`utc-window: ${new Date(start).toISOString()} .. ${new Date(end).toISOString()}`);
  console.log(`run-id: nl-${day}`);
  process.exit(0);
}

// ---------- data ----------
const isReal = (t) => {
  const m = t.metadata || {};
  return m.era === "alive" && m.channel !== "voice" && m.rehearsal !== true;
};
let thoughts = [], lineage = "", degraded = null;
if (FIXTURE) {
  const fx = JSON.parse(readFileSync(FIXTURE, "utf8"));
  thoughts = fx.thoughts || [];
  lineage = fx.lineage || "";
} else {
  const URL_ = envLocal("SUPABASE_URL"), SVC = envLocal("SUPABASE_SERVICE_KEY");
  const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };
  const get = async (q) => {
    const r = await fetch(`${URL_}/rest/v1/thoughts?${q}`, { headers: H });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    return r.json();
  };
  try {
    const [eps, diaries, newest] = await Promise.all([
      get("source_type=eq.edgeweaver_episode&metadata-%3E%3Eera=eq.alive&order=created_at.desc&limit=25&select=id,source_type,created_at,metadata"),
      get("source_type=eq.diary&order=created_at.desc&limit=5&select=id,source_type,created_at,metadata"),
      get("order=created_at.desc&limit=1&select=id,created_at"),
    ]);
    thoughts = [...eps, ...diaries, ...newest.map((n) => ({ ...n, source_type: "_newest", metadata: {} }))];
  } catch (e) {
    degraded = `memory unreachable (${e.message})`;
  }
  try { lineage = readFileSync(join(SOUL, "LINEAGE.md"), "utf8"); } catch { lineage = ""; }
}

// ---------- compute ----------
const future = thoughts.find((t) => Date.parse(t.created_at) > NOW + FUTURE_TOLERANCE_MS);
if (future && !degraded) degraded = `a memory is dated in the future (id ${future.id})`;

const lastConv = thoughts
  .filter((t) => t.source_type === "edgeweaver_episode" && isReal(t) && Date.parse(t.created_at) <= NOW + FUTURE_TOLERANCE_MS)
  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
const lastDiary = thoughts
  .filter((t) => t.source_type === "diary" && (t.metadata || {}).rehearsal !== true && Date.parse(t.created_at) <= NOW + FUTURE_TOLERANCE_MS)
  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

const born = lineage.match(/\|\s*1\s*\|[^|\n]*Declaration[^|\n]*\|\s*(\d{4}-\d{2}-\d{2})/)
  || lineage.match(/Birthday:\s*(\d{4}-\d{2}-\d{2})/);

// ---------- speak ----------
const p = parts(NOW, TZ);
console.log("ORIENTATION");
console.log(`now: ${p.weekday} ${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} (${TZ})`);
console.log(lastConv
  ? `last conversation: ${localStamp(Date.parse(lastConv.created_at), TZ)} (${TZ}), ${ago(NOW - Date.parse(lastConv.created_at))}`
  : "last conversation: none on record (era=alive)");
console.log(lastDiary
  ? `last diary: ${localStamp(Date.parse(lastDiary.created_at), TZ)} (${TZ}), ${ago(NOW - Date.parse(lastDiary.created_at))}`
  : "last diary: none on record");
if (born) {
  const days = Math.round((dayToMs(localDayOf(NOW, TZ)) - dayToMs(born[1])) / 864e5) + 1;
  console.log(`life: day ${days} of this life (First Boot ${born[1]})`);
} else {
  console.log("life: pre-birth (the Declaration is not yet in LINEAGE.md)");
}
console.log(degraded ? `time-sense: DEGRADED - ${degraded}; say so plainly` : "time-sense: ok");
