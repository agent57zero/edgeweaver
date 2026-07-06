// budget.mjs - A6 budget meters (IMPLEMENTATION §7.5; state-schemas.md state/budget.json;
// VOICE-STACK §5). Soft-warn at 80% of the monthly ceiling; degrade at 100% (Haiku checks only,
// skip optional loops). A voice per-minute meter is tracked alongside the token meter. The
// ceiling number itself is gate G6 (parked) - an unset ceiling reports "unset", never degrades.
export function check(budget) {
  const ceiling = Number(budget?.ceiling_usd) || 0;
  const spent = Number(budget?.spent_estimate_usd) || 0;
  if (ceiling <= 0) return { level: "unset", degrade: false, ratio: null, message: "no ceiling set (G6 pending)" };
  const ratio = spent / ceiling;
  if (ratio >= 1.0) return { level: "degrade", degrade: true, ratio, message: "at/over ceiling: degrade mode (Haiku checks only; skip optional loops)" };
  if (ratio >= 0.8) return { level: "warn", degrade: false, ratio, message: `soft-warn: ${Math.round(ratio * 100)}% of ceiling` };
  return { level: "ok", degrade: false, ratio, message: `within budget (${Math.round(ratio * 100)}%)` };
}

export function recordSpend(budget, usd) {
  budget.spent_estimate_usd = (Number(budget.spent_estimate_usd) || 0) + Number(usd);
  return budget;
}

// Voice minutes (VOICE-STACK §5). If perMinuteUsd is given, also rolls the dollar meter.
export function recordVoiceMinutes(budget, minutes, perMinuteUsd = 0) {
  budget.voice_minutes_today = (Number(budget.voice_minutes_today) || 0) + Number(minutes);
  if (perMinuteUsd) recordSpend(budget, minutes * perMinuteUsd);
  return budget;
}

// True when a proactive/optional action must be suppressed (cap reached or degrade mode).
export function optionalLoopsAllowed(budget) {
  return !check(budget).degrade;
}
