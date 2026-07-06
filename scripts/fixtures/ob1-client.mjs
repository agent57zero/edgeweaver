// ob1-client.mjs — thin OB1 (Supabase REST) adapter for rehearsal fixtures.
// Reuses the .env.local SUPABASE_* pattern from ingest-prebirth-harvest.mjs. Used ONLY in
// --target ob1 mode. DARK-BUILD RULE 3: anything written to OB1 during dark tests carries
// metadata.rehearsal=true + a nl-rehearsal-* run_id + audience=alan and is voided by run_id
// immediately after the verify. Heavier rehearsals move to the scratch-restore DB once B5
// (session-pooler) lands; until then keep OB1-target runs tiny and void at once.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

async function loadEnv() {
  const text = await readFile(join(ROOT, ".env.local"), "utf8");
  return Object.fromEntries(
    text.split(/\r?\n/)
      .map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  );
}

export async function ob1Client() {
  const env = await loadEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("OB1 target needs SUPABASE_URL + SUPABASE_SERVICE_KEY in .env.local");
  }
  const H = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  const api = (p) => `${env.SUPABASE_URL}/rest/v1/${p}`;
  const runFilter = (runId) => `metadata->>run_id=eq.${encodeURIComponent(runId)}`;

  return {
    async insert(record) {
      const r = await fetch(api("thoughts"), {
        method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(record),
      });
      if (!r.ok) throw new Error(`insert ${r.status}: ${(await r.text()).slice(0, 150)}`);
      return (await r.json())[0];
    },
    async countByRunId(runId) {
      const r = await fetch(api(`thoughts?select=id&${runFilter(runId)}`), { headers: { ...H, Prefer: "count=exact" } });
      if (!r.ok) throw new Error(`count ${r.status}: ${(await r.text()).slice(0, 150)}`);
      const cr = r.headers.get("content-range"); // e.g. "0-4/5" or "*/0"
      if (cr && cr.includes("/")) return parseInt(cr.split("/")[1], 10) || 0;
      return (await r.json()).length;
    },
    async deleteByRunId(runId) {
      const r = await fetch(api(`thoughts?${runFilter(runId)}`), {
        method: "DELETE", headers: { ...H, Prefer: "return=representation" },
      });
      if (!r.ok) throw new Error(`delete ${r.status}: ${(await r.text()).slice(0, 150)}`);
      return (await r.json()).length;
    },
  };
}
