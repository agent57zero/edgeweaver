// live-mind.mjs - TEST MODE: persistent Claude Code session as a streaming voice mind on the
// SUBSCRIPTION (no API credits). One process per model stays alive across turns
// (--input-format stream-json); replies stream token-by-token (--include-partial-messages) and are
// emitted SENTENCE BY SENTENCE so TTS can start on sentence one while the rest generates.
// Latency levers (measured 2026-07-07, warm turns): --tools none + custom system prompt shrink the
// prompt ~22k -> ~360 tokens; MAX_THINKING_TOKENS=0 removes the think-before-speak delay.
// Result: first word ~0.9s (Haiku) / ~1.2s (Sonnet) on the subscription.
import { spawn } from "node:child_process";
import { resolveClaude } from "../../voice/claude-backend.mjs";

export class LiveMind {
  constructor(model, systemPrompt) {
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.proc = null;
    this.buf = "";
    this.current = null; // { gen, onSentence, resolve, reject, pending, full }
  }

  start() {
    if (this.proc) return;
    this.proc = spawn(resolveClaude(), [
      "-p", "--input-format", "stream-json", "--output-format", "stream-json",
      "--include-partial-messages", "--verbose",
      "--model", this.model,
      "--effort", "low",
      "--tools", "none",
      "--system-prompt", this.systemPrompt,
    ], { shell: false, env: { ...process.env, MAX_THINKING_TOKENS: "0" } });
    this.proc.stdout.on("data", (d) => this.#onData(d));
    this.proc.stderr.on("data", () => { /* keep quiet; errors surface via result events */ });
    this.proc.on("exit", () => { this.proc = null; if (this.current) { this.current.reject(new Error("mind session exited")); this.current = null; } });
    // warmup turn: pays the cold-start cost now so the first real turn is warm
    this.#send("(warmup) Reply with just: ok");
    this.current = { warmup: true, resolve: () => {}, reject: () => {}, onSentence: () => {}, pending: "", full: "" };
  }

  #send(text) {
    this.proc.stdin.write(JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text }] } }) + "\n");
  }

  #onData(d) {
    this.buf += d.toString();
    let idx;
    while ((idx = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, idx).trim();
      this.buf = this.buf.slice(idx + 1);
      if (!line) continue;
      let e; try { e = JSON.parse(line); } catch { continue; }
      const cur = this.current;
      if (!cur) continue;
      if (e.type === "stream_event" && e.event?.type === "content_block_delta" && e.event?.delta?.type === "text_delta") {
        cur.pending += e.event.delta.text;
        cur.full += e.event.delta.text;
        // flush complete sentences as they form
        let m;
        while ((m = cur.pending.match(/^(.*?[.!?])(\s+|$)/s))) {
          const sentence = m[1].trim();
          cur.pending = cur.pending.slice(m[0].length);
          if (sentence && !cur.warmup) cur.onSentence(sentence);
        }
      } else if (e.type === "result") {
        const tail = cur.pending.trim();
        if (tail && !cur.warmup) cur.onSentence(tail);
        cur.resolve(cur.full.trim());
        this.current = null;
      }
    }
  }

  // ask(text, onSentence) -> resolves with the full reply text. One turn in flight at a time; a new
  // ask while busy queues behind the CLI's own turn handling (the caller barge-guards with gen).
  ask(text, onSentence) {
    this.start();
    return new Promise((resolve, reject) => {
      const fire = () => {
        this.current = { onSentence, resolve, reject, pending: "", full: "" };
        this.#send(text);
      };
      if (this.current) {
        // wait for the in-flight turn (incl. warmup) to finish, then fire
        const prevResolve = this.current.resolve, prevReject = this.current.reject;
        this.current.resolve = (v) => { prevResolve(v); fire(); };
        this.current.reject = (err) => { prevReject(err); fire(); };
      } else fire();
    });
  }

  stop() { try { this.proc?.kill(); } catch { /* fine */ } this.proc = null; }
}
