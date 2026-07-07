// verify-mind-server.mjs - A3 dark verify. Default (repeatable, cheap, in run-all): a STUB backend,
// no live call - proves the machinery: frozen-prefix cache breakpoint + prefix order, speculative
// recall injected, streamed text out, a rehearsal-tagged VOICE episode written to a LOCAL store then
// voided (0 residue). With EW_MIND_BENCH=1: the real SUBSCRIPTION backend (one tiny `claude -p` call)
// runs and records the actual TTFT for the V3 latency decision (D12).
import { mindServer } from "../../voice/mind-server.mjs";
import { makeBackend } from "../../voice/claude-backend.mjs";
import { assemblePrompt } from "../../voice/prompt-assembly.mjs";
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const store = join(ROOT, "state", "_verify_mind");
const bench = !!process.env.EW_MIND_BENCH;
const fails = [];
const runId = `nl-rehearsal-mind-${Date.now()}`;

try {
  mkdirSync(store, { recursive: true });

  // prompt assembly: prefix order + cache breakpoint
  const a = assemblePrompt({ sessionContext: "theory-of-alan v0", recallBlock: "mem1", userText: "hello" });
  if (!a.system.includes("[[CACHE_BREAKPOINT]]")) fails.push("no cache breakpoint in the assembled prompt");
  if (a.prefixOrder[0] !== "CONSTITUTION" || a.prefixOrder[4] !== "PRACTICES") fails.push("frozen prefix order wrong");

  let recalled = false;
  const recall = async () => { recalled = true; return "REHEARSAL MEMORY: pacing over calendar"; };
  const writeback = async (ep) => { writeFileSync(join(store, "episode.json"), JSON.stringify(ep)); return { ...ep, id: "mind-1" }; };
  const backend = makeBackend(bench ? "subscription" : "stub", { model: "claude-sonnet-5" });
  const ms = mindServer({ backend, recall, writeback });

  const res = await ms.respond({ userText: "In one short sentence, what is a Box in Possibility Management?", runId });
  if (!res.text || res.text.length < 3) fails.push("no response text from the backend");
  if (!recalled) fails.push("speculative recall was not called");
  if (res.ttftMs == null) fails.push("TTFT field not recorded");

  const epPath = join(store, "episode.json");
  if (!existsSync(epPath)) fails.push("voice episode not written");
  else {
    const ep = JSON.parse(readFileSync(epPath, "utf8"));
    if (ep.metadata.rehearsal !== true || ep.metadata.run_id !== runId) fails.push("episode not rehearsal-tagged");
    if (ep.metadata.channel !== "voice") fails.push("episode not marked channel=voice");
    if (ep.source_type !== "edgeweaver_episode") fails.push("episode wrong source_type");
  }

  rmSync(store, { recursive: true, force: true });
  if (existsSync(store)) fails.push("rehearsal store not voided");

  if (bench) console.log(`  subscription-path bench: TTFT ${res.ttftMs}ms, total ${res.durationMs}ms (backend ${res.backend})`);
} catch (e) {
  fails.push("exception: " + e.message);
} finally {
  try { rmSync(store, { recursive: true, force: true }); } catch { /* best effort */ }
}

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log(`PASS: mind server - synthetic voice exchange (${bench ? "SUBSCRIPTION backend, real claude -p" : "stub backend"}); frozen-prefix cache breakpoint + prefix order + speculative recall + streamed text; rehearsal-tagged voice episode written then voided (0 residue); TTFT recorded${bench ? " (real subscription latency for the V3 decision)" : ""}.`);
