// claude-backend.mjs - A3/W1: PLUGGABLE Claude backend for the mind server (D12 amended 2026-07-06).
// Default = SUBSCRIPTION path via `claude -p` (draws from Alan's Pro/Max plan, zero API credits;
// `claude -p --output-format stream-json --verbose` reports ttft_ms + duration_ms directly). The
// raw-SDK path (sub-second, needs API credits) is a stub, wired at V3 if the measured subscription
// latency misses the ChatGPT-voice bar. A stub backend serves the cheap repeatable verify.
// respond({system, turn, model}) -> { text, ttftMs, durationMs, backend }.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

// Resolve the real claude executable. On Windows `claude` is an npm shim that Node's spawn cannot
// exec without a shell; the native claude.exe can be spawned directly (shell:false), which keeps
// args (including angle brackets) safe from cmd parsing. Override with EW_CLAUDE_BIN.
export function resolveClaude() {
  if (process.env.EW_CLAUDE_BIN) return process.env.EW_CLAUDE_BIN;
  const win = "C:\\ProgramData\\npm-global\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe";
  if (existsSync(win)) return win;
  return "claude";
}

export function subscriptionBackend({ model = "claude-sonnet-5" } = {}) {
  return {
    name: "subscription",
    respond({ system, turn, model: m } = {}) {
      const args = ["-p", turn || "", "--output-format", "stream-json", "--verbose", "--model", m || model];
      if (system) args.push("--append-system-prompt", system);
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const p = spawn(resolveClaude(), args, { shell: false });
        let out = "", err = "";
        p.stdout.on("data", (d) => { out += d; });
        p.stderr.on("data", (d) => { err += d; });
        p.on("error", reject);
        p.on("close", (code) => {
          const lines = out.split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
          const result = lines.find((e) => e.type === "result");
          if (code !== 0 && !result) return reject(new Error(`claude -p exit ${code}: ${err.slice(0, 200)}`));
          const text = result?.result ?? lines.filter((e) => e.type === "assistant").flatMap((e) => (e.message?.content || []).filter((c) => c.type === "text").map((c) => c.text)).join("");
          resolve({ text, ttftMs: result?.ttft_ms ?? null, durationMs: result?.duration_ms ?? (Date.now() - start), backend: "subscription" });
        });
      });
    },
  };
}

export function rawSdkBackend() {
  return { name: "raw-sdk", async respond() { throw new Error("raw-sdk backend not wired in the dark build (needs API credits); enable at V3 per the D12 amendment"); } };
}

export function stubBackend({ text = "A Box is a fixed self-image you defend instead of staying present." } = {}) {
  return { name: "stub", async respond() { return { text, ttftMs: 0, durationMs: 0, backend: "stub" }; } };
}

export function makeBackend(kind = "subscription", opts) {
  if (kind === "raw-sdk") return rawSdkBackend(opts);
  if (kind === "stub") return stubBackend(opts);
  return subscriptionBackend(opts);
}
