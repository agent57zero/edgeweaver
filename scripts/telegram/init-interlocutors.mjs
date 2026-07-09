// init-interlocutors.mjs - A8: build state/interlocutors.json (gitignored operational memory) from
// the state-schemas template + TELEGRAM_ALLOWED_USER_ID (if present in .env.local). Unpaired-safe:
// if the id is absent, writes a clearly-marked placeholder so config lints and the pairing runbook
// (avatars/genesis/handoff/telegram-pairing-runbook.md) can fill it at token arrival (B4). Never enables the
// channel; flags stay dark.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

async function loadEnv() {
  try {
    const t = await readFile(join(ROOT, ".env.local"), "utf8");
    return Object.fromEntries(
      t.split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
    );
  } catch { return {}; }
}

const env = await loadEnv();
const alanId = (env.TELEGRAM_ALLOWED_USER_ID || "").trim();

const doc = {
  telegram: {},
  default_unknown: { audience: "public", untrusted: true },
  _note: "A8 dark config. Alan-only until the village opens (GROWING §3). Pinned-sender enforced by scripts/telegram/channel-policy.mjs. Only is_confirmer:true may confirm lessons; tier changes additionally need out-of-band confirmation.",
};
if (alanId) doc.telegram[alanId] = { name: "Alan", audience: "alan", is_confirmer: true };
else doc.telegram["ALAN_ID_PENDING"] = { name: "Alan", audience: "alan", is_confirmer: true, _placeholder: true };

await mkdir(join(ROOT, "state"), { recursive: true });
await writeFile(join(ROOT, "state", "interlocutors.json"), JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`interlocutors.json written (${alanId ? "Alan id from .env.local" : "placeholder id - pairing pending B4"})`);
