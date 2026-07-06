// waking-policy.mjs - A5 waking-policy engine (PLAN §2.3; IMPLEMENTATION §7.3; checklist 03).
// Reads expectations (state/expectations.md, written nightly from Phase 4; a static starter until
// then), scores observations, and decides whether to make proactive contact: ONLY on a listed
// surprise, a contradiction, or budgeted relevance; holds during quiet hours; decrements the daily
// attention budget. Dark-build note: production scoring is ultimately an LLM judgment; this is the
// deterministic gate around it (keyword overlap on the expectations file's SURPRISING-IF line).
const STOP = new Set(["alan", "will", "that", "this", "with", "from", "your", "have", "been", "also", "when", "then", "than", "them", "they", "past", "into", "onto"]);

function contentTokens(phrase) {
  return (phrase.toLowerCase().match(/[a-z0-9:]+/g) || []).filter((w) => w.length >= 4 && !STOP.has(w));
}

export function parseExpectations(md) {
  const surprises = [], expected = [];
  for (const raw of String(md).split(/\r?\n/)) {
    const line = raw.trim();
    if (/^SURPRISING IF:/i.test(line)) {
      surprises.push(...line.replace(/^SURPRISING IF:/i, "").split(/;|,/).map((s) => s.trim()).filter(Boolean));
    } else if (/^-\s/.test(line)) {
      expected.push(line.replace(/^-\s/, "").trim());
    }
  }
  return { surprises, expected };
}

function inQuietHours(now, quiet) {
  const [start, end] = quiet;
  const hm = now.toTimeString().slice(0, 5);
  return start <= end ? (hm >= start && hm < end) : (hm >= start || hm < end);
}

// scoreObservation(obs, expectations) -> {surprising, reason}
export function scoreObservation(obs, expectations) {
  if (obs.contradiction) return { surprising: true, reason: "contradiction" };
  const text = (obs.text || "").toLowerCase();
  for (const s of expectations.surprises || []) {
    const toks = contentTokens(s);
    if (!toks.length) continue;
    const need = toks.length >= 2 ? 2 : 1;
    const hits = toks.filter((t) => text.includes(t)).length;
    if (hits >= need) return { surprising: true, reason: `matched surprise trigger: ${s}` };
  }
  return { surprising: false, reason: "consistent with expectations / no news" };
}

// decideWake({observations, expectations, now, budget}) -> {act, sends[], held[]}
// Mutates budget.proactive_sent_today for each send (attention-budget decrement).
export function decideWake({ observations, expectations, now, budget }) {
  const sends = [], held = [];
  const quiet = (budget && budget.quiet_hours) || ["22:00", "07:00"];
  for (const obs of observations) {
    const s = scoreObservation(obs, expectations);
    if (!s.surprising) { held.push({ obs, reason: s.reason }); continue; }
    if (inQuietHours(now, quiet)) { held.push({ obs, reason: "quiet hours" }); continue; }
    const cap = Number(budget?.daily_proactive_cap ?? Infinity);
    if (Number(budget?.proactive_sent_today || 0) >= cap) { held.push({ obs, reason: "daily proactive cap reached" }); continue; }
    sends.push({ obs, reason: s.reason });
    if (budget) budget.proactive_sent_today = (Number(budget.proactive_sent_today) || 0) + 1;
  }
  return { act: sends.length > 0, sends, held };
}
