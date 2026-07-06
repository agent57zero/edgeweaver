// verify-waking.mjs - A5 dark verify (fixture expectations). A contradiction wakes/acts; a no-news
// observation sends nothing; a genuine surprise during quiet hours is held; the attention budget
// decrements on send. PASS/FAIL; exit 0/1.
import { parseExpectations, decideWake } from "../waking/waking-policy.mjs";

const fails = [];
const md = `# Expectations for 2026-07-06
- [pattern] Likely OB1 work in the morning.
- [thread] Awaiting Alan's reply on the village roster.
SURPRISING IF: a new person messages; calendar event cancelled; Alan works past 23:00.`;
const exp = parseExpectations(md);
if (exp.surprises.length < 3) fails.push(`expected 3 surprise triggers, parsed ${exp.surprises.length}`);

const day = new Date("2026-07-06T10:00:00");
const night = new Date("2026-07-06T23:30:00");
const budget = { daily_proactive_cap: 3, proactive_sent_today: 0, quiet_hours: ["22:00", "07:00"] };

// contradiction -> act
let r = decideWake({ observations: [{ text: "the dentist appointment was cancelled", contradiction: true }], expectations: exp, now: day, budget });
if (!r.act) fails.push("contradiction should wake/act");
if (budget.proactive_sent_today !== 1) fails.push("attention budget did not decrement on send");

// no-news -> send nothing
r = decideWake({ observations: [{ text: "Alan did OB1 work this morning, as most weekdays" }], expectations: exp, now: day, budget });
if (r.act || r.sends.length) fails.push("no-news should send nothing (matched 'Alan' must NOT trigger)");

// genuine surprise but quiet hours -> hold
r = decideWake({ observations: [{ text: "a brand new person messages the bot" }], expectations: exp, now: night, budget });
if (r.act) fails.push("quiet hours should hold even a surprise");
if (!r.held.some((h) => h.reason === "quiet hours")) fails.push("expected a quiet-hours hold reason");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: waking policy - contradiction wakes, no-news sends nothing, quiet hours hold a surprise, attention budget decrements on send.");
