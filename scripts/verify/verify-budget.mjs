// verify-budget.mjs - A6 dark verify. Simulated 85% spend logs a warning; simulated 100% flips
// degrade mode (Haiku checks / skip optional loops); the voice-minute meter accumulates; an unset
// ceiling stays "unset" (G6 pending). PASS/FAIL; exit 0/1.
import { check, recordSpend, recordVoiceMinutes, optionalLoopsAllowed } from "../budget/budget.mjs";

const fails = [];
const b = { month: "2026-07", ceiling_usd: 100, spent_estimate_usd: 0, daily_proactive_cap: 3, proactive_sent_today: 0, quiet_hours: ["22:00", "07:00"], voice_minutes_today: 0 };

recordSpend(b, 85);
let r = check(b);
if (r.level !== "warn") fails.push(`85% should warn, got ${r.level}`);
if (r.degrade) fails.push("85% should not degrade");
if (!optionalLoopsAllowed(b)) fails.push("optional loops should still run at 85%");

recordSpend(b, 15); // 100
r = check(b);
if (!r.degrade || r.level !== "degrade") fails.push(`100% should degrade, got ${r.level}`);
if (optionalLoopsAllowed(b)) fails.push("optional loops should be suppressed at 100%");

recordVoiceMinutes(b, 12, 0.07);
if (b.voice_minutes_today !== 12) fails.push("voice minutes not accumulated");

const unset = check({ ceiling_usd: 0, spent_estimate_usd: 5 });
if (unset.level !== "unset" || unset.degrade) fails.push("zero ceiling should be 'unset' and never degrade (G6 pending)");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: budget meters - 85% warns, 100% flips degrade (skip optional loops), voice-minute meter accumulates, unset ceiling handled (G6 pending).");
