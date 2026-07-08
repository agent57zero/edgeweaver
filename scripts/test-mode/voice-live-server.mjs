// voice-live-server.mjs - TEST MODE: W2-lite STREAMING interruptible voice loop (Testweaver).
// v2: the mind now runs on the SUBSCRIPTION via persistent Claude Code sessions (live-mind.mjs):
// token-streamed, sentence-by-sentence TTS, plus instant pre-synthesized BRIDGE clips (the
// ChatGPT-style acknowledgment while the real answer forms). No API credits used anywhere.
//   browser mic (open, echo-cancelled) --webm chunks--> Deepgram streaming (interim transcripts)
//   end-of-turn -> bridge clip plays INSTANTLY -> mind streams -> each sentence TTS'd and played
//   as it forms. BARGE-IN: speaking over it cancels everything at once.
// Explicitly NOT Edgeweaver: dummy persona, no OB1 writes, dies with the process.
// Usage: node scripts/test-mode/voice-live-server.mjs   then open http://127.0.0.1:8796
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { LiveMind } from "./live-mind.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const PORT = 8796;
const VERSION = "v3.0"; // bump on every user-visible change (shown in page header + /selftest)
const env = Object.fromEntries((await readFile(join(ROOT, ".env.local"), "utf8"))
  .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));

const TESTWEAVER = "You are Testweaver, a hardware-test voice persona (explicitly NOT Edgeweaver). You are in a live SPOKEN conversation. Answer the question DIRECTLY - simple questions get just the answer, no preamble, no acknowledgment. Only for genuinely involved or personal topics may you open with a few natural words of reaction. 1-2 short sentences, under 30 words, spoken aloud. Warm, natural, no lists, no markdown. If asked who you are: Testweaver, a temporary test voice. ESCALATION RULE: if the question genuinely requires deep multi-step reasoning, complex tradeoffs, or careful analysis that a quick conversational answer would shortchange, reply with EXACTLY the single word ESCALATE and nothing else - a deeper mind will take that turn.";

const TESTWEAVER_DEEP = "You are Testweaver, a hardware-test voice persona (explicitly NOT Edgeweaver). This question was escalated to you for DEEP THOUGHT. Reason carefully, then give a considered spoken answer in 2-4 short sentences (under 70 words). Conversational, no lists, no markdown.";

// ONE voice: Sonnet is always the talker. Harder questions escalate - explicitly ("think hard
// about ...") or automatically (Sonnet answers ESCALATE when it judges itself outmatched).
// Deep minds are lazy-started; the first escalated turn pays the cold start (earcon covers it).
const minds = {
  sonnet: new LiveMind("claude-sonnet-5", TESTWEAVER),
  deep: new LiveMind("claude-opus-4-8", TESTWEAVER_DEEP, { effort: "high", thinking: true, timeoutMs: 120000 }),
  fable: new LiveMind("claude-fable-5", TESTWEAVER_DEEP, { effort: "high", thinking: true, timeoutMs: 180000 }),
};
const ESCALATE_RX = /(think (hard|deep|deeply|carefully)|really think|deep (thought|dive))/i;   // -> Opus
const FABLE_RX = /(think (really|extremely|very) hard|(use|ask) fable|hardest thought)/i;       // -> Fable

// ---- TTS ----
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

// ---- bridge clips: pre-synthesized instant acknowledgments (zero per-turn cost) ----
// Adaptive filler: full natural phrases (TTS renders sentences well, non-words like "Mm" badly).
// Played ONLY if the real first sentence has not arrived within FILLER_AFTER_MS - the industry
// pattern: filler masks genuine slowness, never plays on fast turns (constant filler = robotic).
const BRIDGE_PHRASES = ["Let me think about that.", "One sec.", "Hmm, let me see."];
const DEEP_BRIDGE_PHRASE = "Alright, let me really think about that.";
let deepBridge = null;
const FILLER_AFTER_MS = 1400;
const WORKING_AFTER_MS = 2600; // progress earcon: looped ticking when a turn runs genuinely long
const bridges = [];
async function loadBridges() {
  for (const p of BRIDGE_PHRASES) {
    try { bridges.push(await ttsCartesia(p)); } catch { /* skip on failure */ }
  }
  try { deepBridge = await ttsCartesia(DEEP_BRIDGE_PHRASE); } catch { /* optional */ }
  console.log(`bridge clips ready: ${bridges.length}/${BRIDGE_PHRASES.length} (+deep: ${!!deepBridge})`);
}

// ---- per-connection session ----
function session(ws) {
  let dg = null;
  let state = "listening";
  let turnBuf = [];
  let gen = 0;
  let opts = { tts: "cartesia", bridge: true };
  let candidateBarge = null; // pending noise-or-speech decision while agent is talking
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
        if (text && state !== "listening") {
          // two-stage barge: a brief sound (baby, cough) only DUCKS the volume; the reply
          // dies only on sustained speech (3+ words at once, or a second voiced event while
          // the duck window is open). A false alarm auto-restores volume after 900ms.
          const words = text.split(/\s+/).filter(Boolean).length;
          if (words >= 3 || candidateBarge) {
            if (candidateBarge) { clearTimeout(candidateBarge); candidateBarge = null; }
            bargeIn("voice detected");
          } else {
            send({ type: "duck" });
            candidateBarge = setTimeout(() => { candidateBarge = null; send({ type: "unduck" }); }, 900);
          }
        }
        // turn content only accumulates while LISTENING - noise finals during playback must
        // not assemble into ghost turns that silently cancel the reply
        if (state !== "listening") return;
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
    if (candidateBarge) { clearTimeout(candidateBarge); candidateBarge = null; }
    gen++;
    state = "listening";
    // free the mind session immediately: without this, a barged Sonnet turn keeps generating
    // invisibly and the NEXT question silently queues behind it (the "no response" symptom)
    for (const m of Object.values(minds)) m.interrupt();
    send({ type: "barge", reason });
  }

  async function endOfTurn() {
    const userText = turnBuf.join(" ").trim();
    turnBuf = [];
    if (userText.length < 2) return;
    const myGen = ++gen;
    state = "thinking";
    const tSpeechEnd = Date.now();
    send({ type: "transcript", text: userText, final: true });
    send({ type: "state", state: "thinking" });

    // adaptive filler: fires ONLY if the mind is still silent after FILLER_AFTER_MS
    let fillerTimer = null;
    // progress earcon: browser loops a soft tick while we are still silent past WORKING_AFTER_MS
    let workingTimer = null, workingOn = false;
    const stopWorking = () => {
      if (workingTimer) { clearTimeout(workingTimer); workingTimer = null; }
      if (workingOn) { workingOn = false; send({ type: "working", on: false }); }
    };

    // serialized sentence -> TTS -> send pipeline (keeps audio in order)
    let ttsChain = Promise.resolve();
    let firstAudioSent = false;
    let firstSentenceAt = 0;
    if (opts.bridge && bridges.length) {
      fillerTimer = setTimeout(() => {
        if (myGen === gen && !firstAudioSent && !firstSentenceAt) {
          const clip = bridges[Math.floor(Math.random() * bridges.length)];
          send({ type: "audio", b64: clip.toString("base64"), bridge: true, sinceSpeechEndMs: Date.now() - tSpeechEnd });
        }
      }, FILLER_AFTER_MS);
    }
    workingTimer = setTimeout(() => {
      if (myGen === gen && !firstAudioSent && !firstSentenceAt) { workingOn = true; send({ type: "working", on: true }); }
    }, WORKING_AFTER_MS);
    const speakSentence = (s) => {
      ttsChain = ttsChain.then(async () => {
        if (myGen !== gen) return;
        try {
          const audio = await (opts.tts === "elevenlabs" ? ttsEleven(s) : ttsCartesia(s));
          if (myGen !== gen) return;
          if (state !== "speaking") { state = "speaking"; send({ type: "state", state: "speaking" }); }
          send({
            type: "audio", b64: audio.toString("base64"), sentence: s,
            sinceSpeechEndMs: firstAudioSent ? undefined : Date.now() - tSpeechEnd,
            mindFirstSentenceMs: firstAudioSent ? undefined : (firstSentenceAt - tSpeechEnd),
          });
          firstAudioSent = true;
          if (fillerTimer) { clearTimeout(fillerTimer); fillerTimer = null; }
          stopWorking();
        } catch (e) { if (myGen === gen) send({ type: "error", error: e.message }); }
      });
    };

    try {
      let full;
      let escalateToken = false; // set when Sonnet itself answers ESCALATE
      const wantFable = FABLE_RX.test(userText);
      const wantDeep = !wantFable && ESCALATE_RX.test(userText);
      let target = wantFable ? "fable" : wantDeep ? "deep" : "sonnet";

      const announceEscalation = (label) => {
        send({ type: "escalated", model: label });
        if (deepBridge) send({ type: "audio", b64: deepBridge.toString("base64"), bridge: true, sinceSpeechEndMs: Date.now() - tSpeechEnd });
        if (fillerTimer) { clearTimeout(fillerTimer); fillerTimer = null; } // the deep bridge replaces the generic filler
        if (workingTimer) clearTimeout(workingTimer); // re-arm the earcon for the deep wait
        workingTimer = setTimeout(() => {
          if (myGen === gen && !firstAudioSent) { workingOn = true; send({ type: "working", on: true }); }
        }, WORKING_AFTER_MS);
      };

      const askAndSpeak = (mind, watchForEscalate) => mind.ask(userText, (sentence) => {
        if (myGen !== gen) return;
        if (watchForEscalate && !firstSentenceAt && sentence.length < 30 && /\bESCALATE\b/i.test(sentence)) {
          escalateToken = true; // swallow the token; the deep phase takes over
          return;
        }
        if (!firstSentenceAt) {
          firstSentenceAt = Date.now();
          if (fillerTimer) { clearTimeout(fillerTimer); fillerTimer = null; }
          if (workingTimer) { clearTimeout(workingTimer); workingTimer = null; }
        }
        speakSentence(sentence);
      });

      if (target !== "sonnet") announceEscalation(target === "fable" ? "claude-fable-5" : "claude-opus-4-8");
      full = await askAndSpeak(minds[target], target === "sonnet");

      if (escalateToken && myGen === gen) {
        // Sonnet judged the question above its level: auto-escalate to Opus, same voice
        target = "deep";
        announceEscalation("claude-opus-4-8 (auto - Sonnet deferred)");
        firstSentenceAt = 0;
        full = await askAndSpeak(minds.deep, false);
      }
      if (myGen !== gen) return;
      const mindLabel = target === "sonnet" ? "sonnet" : target === "fable" ? "fable (thinking)" : escalateToken ? "deep (Opus, auto)" : "deep (Opus, thinking)";
      send({ type: "reply", text: full, mindMs: (firstSentenceAt || Date.now()) - tSpeechEnd, mind: mindLabel });
      await ttsChain;
      if (myGen === gen) send({ type: "speaking-done" });
    } catch (e) {
      if (myGen === gen) send({ type: "error", error: e.message });
    } finally {
      stopWorking();
      if (myGen === gen) { state = "listening"; send({ type: "state", state: "listening" }); }
    }
  }

  ws.on("message", (data, isBinary) => {
    if (isBinary) { if (dg && dg.readyState === WebSocket.OPEN) dg.send(data); return; }
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    if (m.type === "start") {
      opts = { ...opts, ...m.opts };
      connectDeepgram();
      minds.sonnet.start(); // the one voice, pre-warmed
    } else if (m.type === "opts") {
      opts = { ...opts, ...m.opts };
    } else if (m.type === "barge") bargeIn("client");
  });
  ws.on("close", () => { gen++; try { dg?.close(); } catch { /* fine */ } });
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Testweaver ${VERSION}</title>
<style>body{font:16px system-ui,Segoe UI,sans-serif;max-width:680px;margin:1.5rem auto;padding:0 1rem;color:#111}
.banner{background:#fff3cd;border:1px solid #e0c76a;border-radius:8px;padding:.6rem 1rem;font-size:13.5px}
.state{display:inline-block;padding:.25rem .9rem;border-radius:99px;font-weight:600;margin:.6rem 0}
.listening{background:#d7ecd9}.thinking{background:#ffe2b8}.speaking{background:#cfe3ff}.off{background:#eee}.deep{background:#e3d4f7}
button#go{width:100%;padding:1rem;font-size:19px;border:0;border-radius:12px;background:#0b57d0;color:#fff;cursor:pointer;margin:.4rem 0}
.row{display:flex;gap:1rem;align-items:center;margin:.4rem 0;font-size:14px;flex-wrap:wrap}
.log{border:1px solid #ddd;border-radius:8px;padding:.8rem 1rem;min-height:180px;font-size:14.5px;max-height:45vh;overflow-y:auto}
.you{color:#0b57d0}.tw{color:#1b6e20}.meta{color:#888;font-size:12px}.interim{color:#999;font-style:italic}</style></head><body>
<h2>Testweaver - live voice <span style="color:#0b57d0">${VERSION}</span></h2>
<div class="banner">TEST MODE: <b>Testweaver</b>, not Edgeweaver. Open mic - just talk, and <b>interrupt it</b> freely. The Claude minds run on your subscription (no API credits).</div>
<div class="row">
  <label>mouth <select id="tts"><option value="cartesia">Cartesia</option><option value="elevenlabs">ElevenLabs</option></select></label>
  <label><input type="checkbox" id="bridge" checked> filler when slow (>${FILLER_AFTER_MS / 1000}s; earcon >${WORKING_AFTER_MS / 1000}s)</label>
</div>
<button id="go">Start conversation</button>
<div class="meta" style="margin:.2rem 0">one voice (Sonnet). Escalates itself when a question is genuinely hard, or on request: "think hard about ..." -> Opus, "think really hard about ..." -> Fable. First escalation takes longest.</div>
<div><span id="state" class="state off">off</span> <span id="lat" class="meta"></span></div>
<div class="log" id="log"></div>
<script>
const logEl=document.getElementById('log'), stateEl=document.getElementById('state'), latEl=document.getElementById('lat');
let ws, rec, audioQ=[], playing=null, interimEl=null, running=false, ac=null, tickTimer=null;
function ticks(on){
  if(on){
    if(tickTimer)return;
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    const tick=()=>{
      const dur=0.018+Math.random()*0.01;
      const buf=ac.createBuffer(1,Math.floor(ac.sampleRate*dur),ac.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length/4));
      const src=ac.createBufferSource();src.buffer=buf;
      const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1300+Math.random()*700;bp.Q.value=6;
      const g=ac.createGain();g.gain.value=0.5;
      src.connect(bp);bp.connect(g);g.connect(ac.destination);src.start();
      tickTimer=setTimeout(tick,130+Math.random()*110);
    };
    tick();
  } else if(tickTimer){clearTimeout(tickTimer);tickTimer=null;}
}
function log(html){const d=document.createElement('div');d.innerHTML=html;logEl.appendChild(d);logEl.scrollTop=logEl.scrollHeight;return d}
function setState(s){stateEl.className='state '+s;stateEl.textContent=s}
function stopPlayback(){audioQ=[];if(playing){playing.pause();playing=null}}
function playNext(){if(playing||!audioQ.length)return;const b=audioQ.shift();playing=new Audio(URL.createObjectURL(b));playing.onended=()=>{playing=null;playNext()};playing.play().catch(()=>{playing=null})}
function curOpts(){return{tts:document.getElementById('tts').value,bridge:document.getElementById('bridge').checked}}
for(const id of ['tts','bridge'])document.getElementById(id).onchange=()=>ws&&ws.send(JSON.stringify({type:'opts',opts:curOpts()}));
document.getElementById('go').onclick=async()=>{
  if(running)return;
  running=true;document.getElementById('go').textContent='Live - just talk (reload page to stop)';
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  ws=new WebSocket('ws://127.0.0.1:${PORT}/ws');ws.binaryType='arraybuffer';
  ws.onopen=()=>ws.send(JSON.stringify({type:'start',opts:curOpts()}));
  ws.onmessage=ev=>{
    const m=JSON.parse(ev.data);
    if(m.type==='ready'){setState('listening');rec=new MediaRecorder(stream,{mimeType:'audio/webm'});rec.ondataavailable=e=>{if(e.data.size&&ws.readyState===1)e.data.arrayBuffer().then(b=>ws.send(b))};rec.start(250)}
    else if(m.type==='transcript'){if(!interimEl)interimEl=log('');interimEl.innerHTML='<span class="'+(m.final?'you':'interim')+'"><b>you:</b> '+m.text+'</span>';if(m.final)interimEl=null}
    else if(m.type==='state'){setState(m.state)}
    else if(m.type==='escalated'){setState('deep');stateEl.textContent='deep thinking';log('<span class="meta" style="color:#7b3ff2"><b>[escalated to the deep mind - '+m.model+', thinking enabled]</b></span>')}
    else if(m.type==='reply'){log('<span class="tw"><b>Testweaver'+(m.mind&&(m.mind.indexOf('deep')>=0||m.mind.indexOf('fable')>=0)?' (deep)':'')+':</b> '+m.text+'</span> <span class="meta">first sentence '+m.mindMs+'ms - '+(m.mind||'')+'</span>')}
    else if(m.type==='audio'){if(!m.bridge)ticks(false);const bytes=Uint8Array.from(atob(m.b64),c=>c.charCodeAt(0));audioQ.push(new Blob([bytes],{type:'audio/mpeg'}));playNext();
      if(m.bridge){latEl.textContent='bridge at '+(m.sinceSpeechEndMs/1000).toFixed(2)+'s'}
      else if(m.sinceSpeechEndMs!==undefined){latEl.textContent=(latEl.textContent?latEl.textContent+' - ':'')+'real answer audio at '+(m.sinceSpeechEndMs/1000).toFixed(2)+'s (mind '+(m.mindFirstSentenceMs/1000).toFixed(2)+'s)'}}
    else if(m.type==='working'){ticks(m.on)}
    else if(m.type==='duck'){if(playing)playing.volume=0.25}
    else if(m.type==='unduck'){if(playing)playing.volume=1}
    else if(m.type==='barge'){ticks(false);stopPlayback();log('<span class="meta">[interrupted - '+m.reason+']</span>')}
    else if(m.type==='error'){ticks(false);log('<b style="color:#b3261e">error:</b> '+m.error)}
  };
};
</script></body></html>`;

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE); }
  if (req.method === "GET" && req.url === "/selftest") {
    try {
      const t0 = Date.now();
      let firstSentenceMs = 0;
      const full = await minds.sonnet.ask("Say hello in one short sentence.", () => { if (!firstSentenceMs) firstSentenceMs = Date.now() - t0; });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: true, version: VERSION, mind: "sonnet-live (subscription)", firstSentenceMs, totalMs: Date.now() - t0, reply: full, bridges: bridges.length }));
    } catch (e) { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: e.message })); }
  }
  res.writeHead(404); res.end("not found");
});
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => session(ws));
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Testweaver LIVE voice ${VERSION}: http://127.0.0.1:${PORT} (subscription mind; local only)`);
  loadBridges();
  minds.sonnet.start(); // pre-warm the one voice
});
