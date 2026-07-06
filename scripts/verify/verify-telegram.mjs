// verify-telegram.mjs - A8 dark verify (unpaired; no token, no live channel). interlocutors.json
// builds and parses; the channel policy replies to the pinned Alan id only and defers every other
// sender (logged, untrusted, never treated as Alan); lesson-confirm is gated to the pinned
// confirmer. PASS/FAIL; exit 0/1.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { classifySender, canConfirmLesson, DEFERRAL_MESSAGE } from "../telegram/channel-policy.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const fails = [];

try {
  execFileSync(process.execPath, [join(ROOT, "scripts", "telegram", "init-interlocutors.mjs")], { encoding: "utf8" });
  const p = join(ROOT, "state", "interlocutors.json");
  if (!existsSync(p)) fails.push("interlocutors.json not created");
  const doc = JSON.parse(await readFile(p, "utf8")); // parses (jq-equivalent)
  if (typeof doc.default_unknown !== "object") fails.push("default_unknown missing from interlocutors.json");
  if (!doc.telegram || !Object.keys(doc.telegram).length) fails.push("telegram map empty");

  // policy fixture (independent of whatever id is on this machine)
  const interloc = {
    telegram: { "111": { name: "Alan", audience: "alan", is_confirmer: true }, "222": { name: "Ali", audience: "known-other" } },
    default_unknown: { audience: "public", untrusted: true },
  };
  const alan = classifySender("111", interloc);
  if (!alan.is_alan || alan.action !== "reply") fails.push("pinned Alan not classified as reply");
  const known = classifySender("222", interloc);
  if (known.is_alan || known.action !== "defer" || known.deferral !== DEFERRAL_MESSAGE) fails.push("known-other not deferred");
  const unknown = classifySender("999", interloc);
  if (unknown.is_alan || !unknown.untrusted || unknown.action !== "defer") fails.push("unknown sender not deferred+untrusted");
  if (!canConfirmLesson("111", interloc)) fails.push("pinned confirmer cannot confirm");
  if (canConfirmLesson("222", interloc)) fails.push("non-confirmer able to confirm a lesson");
  if (canConfirmLesson("999", interloc)) fails.push("unknown sender able to confirm a lesson");
} catch (e) {
  fails.push("exception: " + e.message);
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: Telegram config (unpaired) - interlocutors.json builds+parses; Alan replies, all others deferred+logged+untrusted; lesson-confirm gated to the pinned confirmer.");
