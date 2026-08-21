// The public fishbowl (D46): Telegram-style chronological replay. Text rows come
// from /api/fishbowl (paged until caught up); photos and voice notes come from
// /media/manifest.json; the two streams merge by timestamp. Consecutive messages
// from the same speaker group Telegram-style (avatar at the foot of the group).
(() => {
  const feed = document.getElementById("feed");
  const status = document.getElementById("status");
  const more = document.getElementById("more");

  const TZ = "America/New_York";
  const DAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: TZ });
  const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });

  // Telegram's classic sender palette, picked deterministically per name.
  const PALETTE = [
    ["#cc5049", "#e17076"], ["#d67722", "#eda86c"], ["#955cdb", "#a695e7"],
    ["#40a920", "#7bc862"], ["#309eba", "#6ec9cb"], ["#368ad1", "#65aadd"], ["#c7508b", "#ee7aae"],
  ];
  const hue = (name) => {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
  };

  let lastDay = null;
  let lastRow = null; // {who, role, ms, el} for grouping

  function bubbleRow(m) {
    const d = new Date(m.at);
    const day = DAY_FMT.format(d);
    if (day !== lastDay) {
      lastDay = day;
      lastRow = null;
      const h = document.createElement("div");
      h.className = "day";
      const s = document.createElement("span");
      s.textContent = day;
      h.appendChild(s);
      feed.appendChild(h);
    }
    const out = m.role === "being";
    const row = document.createElement("div");
    row.className = "row " + (out ? "out" : "in");

    const sameGroup = lastRow && lastRow.who === m.who && d - lastRow.ms < 10 * 60 * 1000;
    if (!sameGroup && lastRow) lastRow.el.classList.add("grp-end");

    if (!out) {
      const av = document.createElement("div");
      av.className = "avatar";
      const [c1, c2] = hue(m.who);
      av.style.background = `linear-gradient(135deg, ${c2}, ${c1})`;
      av.textContent = (m.who[0] || "?").toUpperCase();
      row.appendChild(av);
    }

    const b = document.createElement("div");
    b.className = "bubble " + (out ? "outb" : "in");
    if (!out && !sameGroup) {
      const who = document.createElement("div");
      who.className = "who";
      who.style.color = hue(m.who)[0];
      who.textContent = m.who;
      b.appendChild(who);
    }

    if (m.kind === "photo") {
      b.classList.add("media");
      const a = document.createElement("a");
      a.href = "/media/" + m.file;
      a.target = "_blank";
      a.rel = "noopener";
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = "/media/" + m.file;
      img.alt = "photo shared in the room";
      a.appendChild(img);
      b.appendChild(a);
    } else if (m.kind === "voice") {
      const au = document.createElement("audio");
      au.controls = true;
      au.preload = "none";
      au.src = "/media/" + m.file;
      b.appendChild(au);
    } else if (m.kind === "document") {
      const doc = document.createElement("div");
      doc.className = "doc";
      doc.innerHTML = '<div class="icon">📄</div>';
      const t = document.createElement("div");
      const n = document.createElement("div");
      n.className = "dname";
      n.textContent = m.name || "a document";
      const note = document.createElement("div");
      note.className = "dnote";
      note.textContent = "shared in the room; file not mirrored";
      t.append(n, note);
      doc.appendChild(t);
      b.appendChild(doc);
    } else {
      const body = document.createElement("span");
      body.textContent = m.text;
      b.appendChild(body);
    }

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = TIME_FMT.format(d);
    meta.title = d.toLocaleString("en-US", { timeZone: TZ, timeZoneName: "short" });
    b.appendChild(meta);
    row.appendChild(b);
    feed.appendChild(row);
    lastRow = { who: m.who, ms: +d, el: row };
  }

  function finishGroups() {
    if (lastRow) lastRow.el.classList.add("grp-end");
  }

  async function loadMedia() {
    try {
      const r = await fetch("/media/manifest.json");
      if (!r.ok) return [];
      return (await r.json()).map((m) => ({
        at: m.at,
        kind: m.kind,
        file: m.file,
        name: m.name,
        who: m.from || "a seat",
        role: m.from ? "seat" : "guest",
      })).filter((m) => !("missing" in m) || !m.missing);
    } catch {
      return [];
    }
  }

  async function loadAll() {
    status.textContent = "Loading the room…";
    const [media] = await Promise.all([loadMedia()]);
    let after = null;
    const texts = [];
    try {
      for (;;) {
        const qs = after ? `?after=${encodeURIComponent(after)}` : "";
        const r = await fetch("/api/fishbowl" + qs);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = await r.json();
        for (const it of data.items || []) texts.push(it);
        after = data.next_after || after;
        if (!data.has_more) break;
      }
    } catch (e) {
      status.textContent = "Could not load the room.";
      more.hidden = false;
      return;
    }
    const all = texts.concat(media).sort((a, b) => a.at.localeCompare(b.at));
    for (const m of all) bubbleRow(m);
    finishGroups();
    status.textContent = all.length
      ? "You are caught up. The room continues; new words appear as sessions are archived."
      : "The room is quiet so far.";
  }

  more.addEventListener("click", () => { more.hidden = true; feed.textContent = ""; lastDay = null; lastRow = null; loadAll(); });
  loadAll();
})();
