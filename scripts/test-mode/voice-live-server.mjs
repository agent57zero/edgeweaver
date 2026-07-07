// voice-live-server.mjs - TEST MODE: W2-lite STREAMING interruptible voice loop (Testweaver).
// The real-time pipeline shape from VOICE-STACK (streaming ears, sentence-streamed mouth, barge-in,
// open mic) with localhost WebSocket as the transport stand-in for LiveKit. Explicitly NOT
// Edgeweaver: dummy persona, no OB1 writes, dies with the process.
//   browser mic (open, echo-cancelled) --webm chunks--> this server --relay--> Deepgram streaming
//   interim transcripts stream back live; on end-of-turn (Deepgram endpointing) the mind runs
//   (stub = instant echo persona, claude = real subscription call), the reply is split into
//   sentences and each sentence's TTS audio streams to the browser AS IT IS SYNTHESIZED.
//   BARGE-IN: if you speak while it talks, playback stops instantly and the pipeline cancels.
// Usage: node scripts/test-mode/voice-live-server.mjs   then open http://127.0.0.1:8796
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { makeBackend } from "../../voice/claude-backend.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const PORT = 8796;
const env = Object.fromEntries((await readFile(join(ROOT, ".env.local"), "utf8"))
  .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));

const TESTWEAVER = "[TEST MODE - you are Testweaver, a hardware-test persona, explicitly NOT Edgeweaver.] You are in a spoken conversation. Reply in ONE short conversational sentence (under 22 words, it is spoken aloud). If asked who you are: Testweaver, a temporary test voice.";
const claudeMind = makeBackend("subscription", { model: "claude-sonnet-5" });

// ---- TTS (per sentence; first sentence plays while later ones synthesize) ----
let cartesiaVoice = null;
async function ttsCartesia(text, signal) {
  if (!cartesiaVoice) {
    const r = await fetch("https://api.cartesia.ai/voices", { headers: { "X-API-Key": env.CARTESIA_API_KEY, "Cartesia-Version": "2024-11-13" } });
    const j = await r.json();
    cartesiaVoice = (Array.isArray(j) ? j : j.data || [])[0]?.id;
  }
  const r = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST", signal,
    headers: { "X-API-Key": env.CARTESIA_API_KEY, "Cartesia-Version": "2024-11-13", "Content-Type": "application/json" },
    body: JSON.stringify({ model_id: "sonic-2", transcript: text, voice: { mode: "id", id: cartesiaVoice }, output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 } }),
  });
  if (!r.ok) throw new Error(`Cartesia ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
let elevenVoice = null;
async function ttsEleven(text, signal) {
  if (!elevenVoice) {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": env.ELEVENLABS_API_KEY } });
    elevenVoice = (await r.json()).voices?.[0]?.voice_id;
  }
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}?optimize_streaming_latency=3`, {
    method: "POST", signal,
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const sentences = (text) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

// ---- per-connection session ----
function session(ws) {
  let dg = null;               // Deepgram socket
  let state = "listening";     // listening | thinking | speaking
  let turnBuf = [];            // finalized transcript fragments for the current turn
  let gen = 0;                 // generation counter; bumping it cancels in-flight work
  let opts = { mind: "stub", tts: "cartesia" };
  let aborter = null;
  const send = (o) => { try { ws.send(JSON.stringify(o)); } catch { /* closed */ } };

  function connectDeepgram() {
    const q = "model=nova-2&interim_results=true&smart_format=true&endpointing=300&utterance_end_ms=1200&vad_events=true";
    dg = new WebSocket(`wss://api.deepgram.com/v1/listen?${q}`, ["token", env.DEEPGRAM_API_KEY]);
    dg.onopen = () => send({ type: "ready" });
    dg.onerror = () => send({ type: "error", error: "Deepgram socket error" });
    dg.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === "Results") {
        const alt = m.channel?.alternatives?.[0];
        const text = (alt?.transcript || "").trim();
        if (text && state === "speaking") bargeIn("voice detected");
        if (!text && !m.speech_final) return;
        if (m.is_final) {
          if (text) turnBuf.push(text);
          send({ type: "transcript", text: turnBuf.join(" "), final: false });
          if (m.speech_final && turnBuf.length) endOfTurn();
        } else if (text) {
          send({ type: "transcript", text: [...turnBuf, text].join(" "), final: false });
        }
      } else if (m.type === "UtteranceEnd") {
        if (turnBuf.length && state === "listening") endOfTurn();
      }
    };
  }

  function bargeIn(reason) {
    gen++;
    if (aborter) { try { aborter.abort(); } catch { /* fine */ } }
    state = "listening";
    send({ type: "barge", reason });
  }

  async function endOfTurn() {
    const userText = turnBuf.join(" ").trim();
    turnBuf = [];
    if (!userText) return;
    const myGen = ++gen;
    state = "thinking";
    const tSpeechEnd = Date.now();
    send({ type: "transcript", text: userText, final: true });
    send({ type: "state", state: "thinking" });

    try {
      // mind
      let reply;
      if (opts.mind === "claude") {
        const r = await claudeMind.respond({ system: TESTWEAVER, turn: userText });
        reply = r.text;
      } else {
        reply = stubReply(userText);
      }
      if (myGen !== gen) return; // barged during thinking
      const tMind = Date.now();
      send({ type: "reply", text: reply, mindMs: tMind - tSpeechEnd });

      // mouth: per-sentence, streamed as synthesized
      state = "speaking";
      send({ type: "state", state: "speaking" });
      aborter = new AbortController();
      const parts = sentences(reply);
      let first = true;
      for (const s of parts) {
        if (myGen !== gen) return;
        const audio = await (opts.tts === "elevenlabs" ? ttsEleven(s, aborter.signal) : ttsCartesia(s, aborter.signal));
        if (myGen !== gen) return;
        send({ type: "audio", b64: audio.toString("base64"), sentence: s, ttsFirstMs: first ? Date.now() - tMind : undefined, sinceSpeechEndMs: first ? Date.now() - tSpeechEnd : undefined });
        first = false;
      }
      if (myGen === gen) { send({ type: "speaking-done" }); }
    } catch (e) {
      if (myGen === gen) send({ type: "error", error: e.message });
    } finally {
      if (myGen === gen) { state = "listening"; send({ type: "state", state: "listening" }); }
    }
  }

  function stubReply(userText) {
    const canned = [
      `Loud and clear, I heard: ${userText}`,
      `Testweaver here. You said: ${userText}`,
      `Got it. That came through as: ${userText}`,
    ];
    return canned[Math.floor(Math.random() * canned.length)];
  }

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      if (dg && dg.readyState === WebSocket.OPEN) dg.send(data);
      return;
    }
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    if (m.type === "start") { opts = { ...opts, ...m.opts }; connectDeepgram(); }
    else if (m.type === "opts") { opts = { ...opts, ...m.opts }; }
    else if (m.type === "barge") { bargeIn("client"); }
    else if (m.type === "playing") { /* browser started playback; reserved for metrics */ }
  });
  ws.on("close", () => { gen++; try { dg?.close(); } catch { /* fine */ } });
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Testweaver live voice</title>
<style>body{font:16px system-ui,Segoe UI,sans-serif;max-width:680px;margin:1.5rem auto;padding:0 1rem;color:#111}
.banner{background:#fff3cd;border:1px solid #e0c76a;border-radius:8px;padding:.6rem 1rem;font-size:13.5px}
.state{display:inline-block;padding:.25rem .9rem;border-radius:99px;font-weight:600;margin:.6rem 0}
.listening{background:#d7ecd9}.thinking{background:#ffe2b8}.speaking{background:#cfe3ff}.off{background:#eee}
button#go{width:100%;padding:1rem;font-size:19px;border:0;border-radius:12px;background:#0b57d0;color:#fff;cursor:pointer;margin:.4rem 0}
.row{display:flex;gap:1rem;align-items:center;margin:.4rem 0;font-size:14px}
.log{border:1px solid #ddd;border-radius:8px;padding:.8rem 1rem;min-height:180px;font-size:14.5px;max-height:45vh;overflow-y:auto}
.you{color:#0b57d0}.tw{color:#1b6e20}.meta{color:#888;font-size:12px}.interim{color:#999;font-style:italic}</style></head><body>
<h2>Testweaver - live voice (streaming + barge-in)</h2>
<div class="banner">TEST MODE: <b>Testweaver</b>, not Edgeweaver. Open mic - just talk. <b>Interrupt it mid-sentence</b> by speaking. Nothing is remembered.</div>
<div class="row">
  <label>mind <select id="mind"><option value="stub">instant echo (feel test)</option><option value="claude">real Claude (slow mind, fast mouth)</option></select></label>
  <label>mouth <select id="tts"><option value="cartesia">Cartesia</option><option value="elevenlabs">ElevenLabs</option></select></label>
</div>
<button id="go">Start conversation</button>
<div><span id="state" class="state off">off</span> <span id="lat" class="meta"></span></div>
<div class="log" id="log"></div>
<script>
const logEl=document.getElementById('log'), stateEl=document.getElementById('state'), latEl=document.getElementById('lat');
let ws, rec, audioQ=[], playing=null, interimEl=null, running=false;
function log(html){const d=document.createElement('div');d.innerHTML=html;logEl.appendChild(d);logEl.scrollTop=logEl.scrollHeight;return d}
function setState(s){stateEl.className='state '+s;stateEl.textContent=s}
function stopPlayback(){audioQ=[];if(playing){playing.pause();playing=null}}
function playNext(){if(playing||!audioQ.length)return;const b=audioQ.shift();playing=new Audio(URL.createObjectURL(b));playing.onended=()=>{playing=null;playNext()};playing.play().catch(()=>{playing=null})}
document.getElementById('mind').onchange=e=>ws&&ws.send(JSON.stringify({type:'opts',opts:{mind:e.target.value}}));
document.getElementById('tts').onchange=e=>ws&&ws.send(JSON.stringify({type:'opts',opts:{tts:e.target.value}}));
document.getElementById('go').onclick=async()=>{
  if(running)return;
  running=true;document.getElementById('go').textContent='Live - just talk (reload page to stop)';
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  ws=new WebSocket('ws://127.0.0.1:${PORT}/ws');ws.binaryType='arraybuffer';
  ws.onopen=()=>ws.send(JSON.stringify({type:'start',opts:{mind:document.getElementById('mind').value,tts:document.getElementById('tts').value}}));
  ws.onmessage=ev=>{
    const m=JSON.parse(ev.data);
    if(m.type==='ready'){setState('listening');rec=new MediaRecorder(stream,{mimeType:'audio/webm'});rec.ondataavailable=e=>{if(e.data.size&&ws.readyState===1)e.data.arrayBuffer().then(b=>ws.send(b))};rec.start(250)}
    else if(m.type==='transcript'){if(!interimEl)interimEl=log('');interimEl.innerHTML='<span class="'+(m.final?'you':'interim')+'"><b>you:</b> '+m.text+'</span>';if(m.final)interimEl=null}
    else if(m.type==='state'){setState(m.state)}
    else if(m.type==='reply'){log('<span class="tw"><b>Testweaver:</b> '+m.text+'</span> <span class="meta">mind '+m.mindMs+'ms</span>')}
    else if(m.type==='audio'){const bytes=Uint8Array.from(atob(m.b64),c=>c.charCodeAt(0));audioQ.push(new Blob([bytes],{type:'audio/mpeg'}));playNext();if(m.sinceSpeechEndMs!==undefined)latEl.textContent='last turn: you-stopped-talking -> first audio '+(m.sinceSpeechEndMs/1000).toFixed(2)+'s (tts '+m.ttsFirstMs+'ms)'}
    else if(m.type==='barge'){stopPlayback();log('<span class="meta">[interrupted - '+m.reason+']</span>')}
    else if(m.type==='error'){log('<b style="color:#b3261e">error:</b> '+m.error)}
  };
};
</script></body></html>`;

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE); }
  if (req.method === "GET" && req.url === "/selftest") {
    // server-side pipeline check without a mic: text turn -> stub mind -> first-sentence TTS timing
    try {
      const t0 = Date.now();
      const reply = "Selftest reply. This is the second sentence.";
      const first = sentences(reply)[0];
      const audio = await ttsCartesia(first);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: true, ttsFirstSentenceMs: Date.now() - t0, audioKB: Math.round(audio.length / 1024) }));
    } catch (e) { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: e.message })); }
  }
  res.writeHead(404); res.end("not found");
});
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => session(ws));
server.listen(PORT, "127.0.0.1", () => console.log(`Testweaver LIVE voice: http://127.0.0.1:${PORT} (local only; Ctrl+C to stop)`));
