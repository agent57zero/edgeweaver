// The public fishbowl (D45): chronological replay of the room, oldest first.
// Pages through /api/fishbowl until caught up; "Load more" appears only if the
// server reports more after a fetch error or an unusually large room.
(() => {
  const feed = document.getElementById("feed");
  const status = document.getElementById("status");
  const more = document.getElementById("more");
  let after = null;
  let lastDay = null;
  let loading = false;

  const DAY_FMT = new Intl.DateTimeFormat("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/New_York",
  });
  const TIME_FMT = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
    timeZoneName: "short",
  });

  function render(items) {
    const frag = document.createDocumentFragment();
    for (const m of items) {
      const d = new Date(m.at);
      const day = DAY_FMT.format(d);
      if (day !== lastDay) {
        lastDay = day;
        const h = document.createElement("div");
        h.className = "day";
        const s = document.createElement("span");
        s.textContent = day;
        h.appendChild(s);
        frag.appendChild(h);
      }
      const el = document.createElement("div");
      el.className = "msg " + (m.role === "being" ? "being" : m.role === "seat" ? "seat" : "guest");
      const who = document.createElement("div");
      who.className = "who";
      who.textContent = m.who;
      const body = document.createElement("div");
      body.textContent = m.text;
      const when = document.createElement("div");
      when.className = "when";
      when.textContent = TIME_FMT.format(d);
      el.append(who, body, when);
      frag.appendChild(el);
    }
    feed.appendChild(frag);
  }

  async function loadPage() {
    if (loading) return;
    loading = true;
    more.hidden = true;
    status.textContent = feed.childElementCount ? "Loading more…" : "Loading the room…";
    try {
      const qs = after ? `?after=${encodeURIComponent(after)}` : "";
      const r = await fetch("/api/fishbowl" + qs);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      render(data.items || []);
      after = data.next_after || after;
      if (data.has_more) {
        loading = false;
        return loadPage(); // keep going until the room is fully replayed
      }
      status.textContent = feed.childElementCount
        ? "You are caught up. The room continues; new words appear as sessions are archived."
        : "The room is quiet so far.";
    } catch (e) {
      status.textContent = "Could not load the room. ";
      more.hidden = false;
    }
    loading = false;
  }

  more.addEventListener("click", loadPage);
  loadPage();
})();
