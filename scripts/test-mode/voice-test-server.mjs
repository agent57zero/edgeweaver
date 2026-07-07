// voice-test-server.mjs - TEST MODE: live voice hardware loop on 127.0.0.1 (never public).
// Mic (browser) -> Deepgram STT -> mind server as the DUMMY "Testweaver" persona (explicitly not
// Edgeweaver; placeholder voice per VOICE-STACK rails) -> Cartesia or ElevenLabs TTS -> speakers.
// Proves every voice credential + the real audio hardware end to end. No OB1 writes; turns live in
// memory only and die with the process. Mind modes: "stub" (instant canned reply; tests the pure
// audio path) and "claude" (real subscription mind-server call; expect 3-8s thinking time).
// Usage: node scripts/test-mode/voice-test-server.mjs   then open http://127.0.0.1:8798
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { mindServer } from "../../voice/mind-server.mjs";
import { makeBackend } from "../../voice/claude-backend.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const PORT = 8798;
const env = Object.fromEntries((await readFile(join(ROOT, ".env.local"), "utf8"))
  .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));

const TESTWEAVER_PREFIX = "[TEST MODE - you are Testweaver, a hardware-test persona, explicitly NOT Edgeweaver.] Reply warmly in ONE short sentence (this is spoken aloud, keep it under 25 words). If asked who you are, say you are Testweaver, a temporary test voice.";

const minds = {
  stub: mindServer({ backend: makeBackend("stub", { text: "Loud and clear - the ears, mind, and mouth are all wired; this is Testweaver, your test voice." }), recall: async () => "", writeback: async (e) => e, soulPrefix: TESTWEAVER_PREFIX }),
  claude: mindServer({ backend: makeBackend("subscription", { model: "claude-sonnet-5" }), recall: async () => "", writeback: async (e) => e, soulPrefix: TESTWEAVER_PREFIX }),
};

// ---- providers ----
async function sttDeepgram(audioBuf, mime) {
  const r = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
    method: "POST", headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": mime || "audio/webm" }, body: audioBuf,
  });
  if (!r.ok) throw new Error(`Deepgram ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const j = await r.json();
  return j.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

let cartesiaVoice = null;
async function ttsCartesia(text) {
  if (!cartesiaVoice) {
    const r = await fetch("https://api.cartesia.ai/voices", { headers: { "X-API-Key": env.CARTESIA_API_KEY, "Cartesia-Version": "2024-11-13" } });
    const j = await r.json();
    const list = Array.isArray(j) ? j : j.data || [];
    cartesiaVoice = list[0]?.id;
    if (!cartesiaVoice) throw new Error("no Cartesia voices available");
  }
  const r = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: { "X-API-Key": env.CARTESIA_API_KEY, "Cartesia-Version": "2024-11-13", "Content-Type": "application/json" },
    body: JSON.stringify({ model_id: "sonic-2", transcript: text, voice: { mode: "id", id: cartesiaVoice }, output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 } }),
  });
  if (!r.ok) throw new Error(`Cartesia ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return Buffer.from(await r.arrayBuffer());
}

let elevenVoice = null;
async function ttsEleven(text) {
  if (!elevenVoice) {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": env.ELEVENLABS_API_KEY } });
    const j = await r.json();
    elevenVoice = j.voices?.[0]?.voice_id;
    if (!elevenVoice) throw new Error("no ElevenLabs voices available");
  }
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}`, {
    method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return Buffer.from(await r.arrayBuffer());
}

async function runTurn({ userText, mind, tts }) {
  const t0 = Date.now();
  const m = minds[mind] || minds.stub;
  const res = await m.respond({ userText, runId: `testmode-${Date.now()}` });
  const mindMs = Date.now() - t0;
  const t1 = Date.now();
  const audio = await (tts === "elevenlabs" ? ttsEleven(res.text) : ttsCartesia(res.text));
  return { transcript: userText, reply: res.text, mindMs, ttsMs: Date.now() - t1, backend: res.backend, audioB64: audio.toString("base64") };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Testweaver voice test</title>
<style>body{font:16px system-ui,Segoe UI,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#111}
.banner{background:#fff3cd;border:1px solid #e0c76a;border-radius:8px;padding:.7rem 1rem;font-size:14px}
button#talk{width:100%;padding:1.2rem;font-size:20px;border:0;border-radius:12px;background:#b3261e;color:#fff;margin:1rem 0;cursor:pointer}
button#talk.rec{background:#1b6e20}
.row{display:flex;gap:1rem;margin:.5rem 0}select,input[type=text]{padding:.5rem;border-radius:6px;border:1px solid #bbb;font-size:14px}
input[type=text]{flex:1}.log{border:1px solid #ddd;border-radius:8px;padding:1rem;min-height:120px;font-size:14.5px}
.you{color:#0b57d0}.tw{color:#1b6e20}.meta{color:#888;font-size:12px}</style></head><body>
<h2>Testweaver - voice hardware test</h2>
<div class="banner">TEST MODE: this is <b>Testweaver</b>, a throwaway test persona - <b>not Edgeweaver</b>. Nothing here is remembered.</div>
<div class="row">
  <label>mind <select id="mind"><option value="stub">instant (audio-path test)</option><option value="claude">real Claude (3-8s)</option></select></label>
  <label>mouth <select id="tts"><option value="cartesia">Cartesia</option><option value="elevenlabs">ElevenLabs</option></select></label>
</div>
<button id="talk">Hold to talk (or click to start/stop)</button>
<div class="row"><input type="text" id="typed" placeholder="or type here to skip the mic" /><button id="send">Send</button></div>
<div class="log" id="log">Waiting. Allow the microphone when asked.</div>
<script>
const logEl = document.getElementById('log');
function log(html){ logEl.innerHTML += '<div>'+html+'</div>'; logEl.scrollTop = logEl.scrollHeight; }
let rec = null, chunks = [], recording = false;
async function ensureRec(){
  if (rec) return;
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  rec = new MediaRecorder(stream, {mimeType:'audio/webm'});
  rec.ondataavailable = e => chunks.push(e.data);
  rec.onstop = async () => {
    const blob = new Blob(chunks, {type:'audio/webm'}); chunks = [];
    log('<span class="meta">heard '+Math.round(blob.size/1024)+' KB - transcribing...</span>');
    const r = await fetch('/api/turn?mind='+mind.value+'&tts='+tts.value, {method:'POST', headers:{'Content-Type':'audio/webm'}, body: blob});
    handle(await r.json());
  };
}
function handle(j){
  if (j.error){ log('<b style="color:#b3261e">error:</b> '+j.error); return; }
  log('<span class="you"><b>you:</b> '+(j.transcript||'(nothing heard)')+'</span>');
  log('<span class="tw"><b>Testweaver:</b> '+j.reply+'</span> <span class="meta">mind '+j.mindMs+'ms ('+j.backend+') - tts '+j.ttsMs+'ms</span>');
  new Audio('data:audio/mpeg;base64,'+j.audioB64).play();
}
const btn = document.getElementById('talk'), mind = document.getElementById('mind'), tts = document.getElementById('tts');
btn.onclick = async () => {
  await ensureRec();
  if (!recording){ rec.start(); recording = true; btn.classList.add('rec'); btn.textContent = 'Listening... click to stop'; }
  else { rec.stop(); recording = false; btn.classList.remove('rec'); btn.textContent = 'Hold to talk (or click to start/stop)'; }
};
document.getElementById('send').onclick = async () => {
  const t = document.getElementById('typed').value.trim(); if (!t) return;
  document.getElementById('typed').value = '';
  const r = await fetch('/api/text-turn?mind='+mind.value+'&tts='+tts.value, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text:t})});
  handle(await r.json());
};
</script></body></html>`;

createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const q = Object.fromEntries(url.searchParams);
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(PAGE);
    }
    if (req.method === "POST" && url.pathname === "/api/turn") {
      const bufs = []; for await (const c of req) bufs.push(c);
      const transcript = await sttDeepgram(Buffer.concat(bufs), req.headers["content-type"]);
      if (!transcript) { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: "Deepgram heard nothing - try speaking longer/louder" })); }
      const out = await runTurn({ userText: transcript, mind: q.mind, tts: q.tts });
      console.log(`turn: "${out.transcript.slice(0, 60)}" -> "${out.reply.slice(0, 60)}" (mind ${out.mindMs}ms, tts ${out.ttsMs}ms)`);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(out));
    }
    if (req.method === "POST" && url.pathname === "/api/text-turn") {
      const bufs = []; for await (const c of req) bufs.push(c);
      const { text } = JSON.parse(Buffer.concat(bufs).toString("utf8"));
      const out = await runTurn({ userText: text, mind: q.mind, tts: q.tts });
      console.log(`turn(typed): "${text.slice(0, 60)}" -> "${out.reply.slice(0, 60)}"`);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(out));
    }
    res.writeHead(404); res.end("not found");
  } catch (e) {
    console.error("turn error:", e.message);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Testweaver voice test: http://127.0.0.1:${PORT} (local only; Ctrl+C to close)`));
