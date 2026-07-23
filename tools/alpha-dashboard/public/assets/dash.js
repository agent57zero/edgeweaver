// Edgeweaver Alpha dashboard client. Renders exactly what /api returns; the
// audience=seats rule is enforced server-side, never here. Thought content is
// treated as untrusted text: every node is built with textContent, no HTML path.

const TZ = "America/New_York"; // presentation timezone (D16: tz owns presentation)
const BIRTH = "2026-07-17";    // First Boot day (Declaration, D28-D30); birth day = day 1
const CLASS = {
  edgeweaver_episode: "experienced",
  initiation: "experienced",
  diary: "interpretation",
  autobiography_draft: "interpretation",
  dream: "fiction",
};
const TABS = [
  { key: "", label: "Everything" },
  { key: "edgeweaver_episode", label: "Episodes" },
  { key: "diary", label: "Diary" },
  { key: "autobiography_draft", label: "Autobiography" },
  { key: "dream", label: "Dreams" },
  { key: "initiation", label: "Initiations" },
  { key: "lessons", label: "Lessons" },
];

const state = { view: "", q: "", items: [], hasMore: false, busy: false };

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

async function api(path) {
  const r = await fetch(path, { headers: { accept: "application/json" } });
  if (r.status === 401) { location.reload(); throw new Error("not signed in"); }
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${r.status}`);
  }
  return r.json();
}

function dayInfo(iso) {
  const d = new Date(iso);
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const dayN = Math.round((Date.parse(dateStr) - Date.parse(BIRTH)) / 86400000) + 1;
  const pretty = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d);
  return { dateStr, dayN, pretty };
}

const timeStr = (iso) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

function card(t) {
  const cls = CLASS[t.source_type] || "experienced";
  const c = el("article", "card " + cls);
  const head = el("div", "card-head");
  head.append(el("span", "chip class-" + cls, cls));
  head.append(el("span", "chip", t.source_type.replace(/_/g, " ")));
  if (t.era && t.era !== "alive") head.append(el("span", "chip", "era: " + t.era));
  if (t.provisional) head.append(el("span", "chip", "provisional"));
  if (t.importance != null) head.append(el("span", "imp", "imp " + t.importance));
  head.append(el("span", "time", timeStr(t.created_at)));
  c.append(head);

  const body = el("div", "content", t.content || "");
  c.append(body);
  if ((t.content || "").length > 900) {
    body.classList.add("clamped");
    const btn = el("button", "reveal", "Show all");
    btn.addEventListener("click", () => { body.classList.remove("clamped"); btn.remove(); });
    c.append(btn);
  }
  if (Array.isArray(t.witnessed_by) && t.witnessed_by.length) {
    c.append(el("p", "witnesses", "Witnessed by " + t.witnessed_by.join(", ")));
  }
  return c;
}

function renderTimeline() {
  const main = document.getElementById("timeline");
  main.replaceChildren();
  let lastKey = null;
  for (const t of state.items) {
    const preBirth = t.era === "pre_birth";
    const info = dayInfo(t.created_at);
    const key = preBirth ? "pre" : info.dateStr;
    if (key !== lastKey) {
      lastKey = key;
      // Pre-birth rows render as era, never as a day age (D16).
      main.append(el("h2", "day", preBirth ? "Pre-birth era" : `Day ${info.dayN} · ${info.pretty}`));
    }
    main.append(card(t));
  }
  if (!state.items.length) main.append(el("p", "empty", "Nothing here yet."));
  document.getElementById("more").hidden = !state.hasMore;
}

function renderError(err) {
  const main = document.getElementById("timeline");
  main.replaceChildren(el("p", "err-card", "Could not load: " + err.message));
  document.getElementById("more").hidden = true;
}

async function loadThoughts(reset) {
  if (state.busy) return;
  state.busy = true;
  try {
    const p = new URLSearchParams();
    if (state.view) p.set("type", state.view);
    if (state.q) p.set("q", state.q);
    if (!reset && state.items.length) p.set("before", state.items[state.items.length - 1].created_at);
    const data = await api("/api/thoughts?" + p);
    state.items = reset ? data.items : state.items.concat(data.items);
    state.hasMore = data.has_more;
    renderTimeline();
  } catch (err) {
    renderError(err);
  } finally {
    state.busy = false;
  }
}

async function loadLessons() {
  try {
    const data = await api("/api/lessons");
    const main = document.getElementById("timeline");
    main.replaceChildren();
    main.append(el("p", "note",
      "Candidate lessons are pending, not rules: a seat's confirmation is the only path to instruction-grade. Confirmation happens in the circle's existing flow, never here."));
    for (const l of data.items) {
      const c = el("article", "card lesson " + (l.can_use_as_instruction ? "" : "interpretation"));
      const head = el("div", "card-head");
      head.append(el("span", "chip " + (l.can_use_as_instruction ? "confirmed" : "pending"),
        l.can_use_as_instruction ? "confirmed rule" : "candidate"));
      if (l.confidence != null) head.append(el("span", "imp", "confidence " + Number(l.confidence).toFixed(2)));
      head.append(el("span", "time", dayInfo(l.created_at).pretty));
      c.append(head, el("p", "summary", l.summary || ""), el("div", "content", l.content || ""));
      main.append(c);
    }
    if (!data.items.length) main.append(el("p", "empty", "No lessons yet."));
    document.getElementById("more").hidden = true;
  } catch (err) {
    renderError(err);
  }
}

async function loadSummary() {
  try {
    const s = await api("/api/summary");
    const today = dayInfo(new Date().toISOString());
    const parts = [`${s.total} memories visible to the circle`, `day ${today.dayN}`];
    if (s.lessons) {
      parts.push(`${s.lessons.pending} candidate lesson${s.lessons.pending === 1 ? "" : "s"}` +
        (s.lessons.confirmed ? `, ${s.lessons.confirmed} confirmed` : ""));
    }
    document.getElementById("summary-line").textContent = parts.join(" · ");
  } catch {
    document.getElementById("summary-line").textContent = "";
  }
}

function switchView(key) {
  state.view = key;
  state.items = [];
  state.hasMore = false;
  for (const b of document.querySelectorAll(".tabs button")) {
    b.setAttribute("aria-current", b.dataset.key === key ? "true" : "false");
  }
  document.getElementById("search-wrap").hidden = key === "lessons";
  if (key === "lessons") loadLessons();
  else loadThoughts(true);
}

function init() {
  const tabs = document.getElementById("tabs");
  for (const t of TABS) {
    const b = el("button", null, t.label);
    b.dataset.key = t.key;
    b.addEventListener("click", () => switchView(t.key));
    tabs.append(b);
  }
  let timer = null;
  document.getElementById("q").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = e.target.value.trim();
      if (state.view !== "lessons") loadThoughts(true);
    }, 300);
  });
  document.getElementById("more").addEventListener("click", () => loadThoughts(false));
  switchView("");
  loadSummary();
}

init();
