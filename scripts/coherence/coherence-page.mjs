// coherence-page.mjs - A13: render a coherence snapshot (state/coherence.json) into a static HTML
// panel (the /coherence page). Wiring it into the OB1 dashboard tree is the optional, non-blocking
// part of checklist 04; this renderer is the drop-in. renderPage(snapshot) -> HTML string.
export function renderPage(s) {
  const cell = (label, val) => `<div class="cell"><div class="label">${label}</div><div class="val">${val == null ? "n/a (cold start)" : val}</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Coherence - Edgeweaver</title>
<style>body{font:15px system-ui,sans-serif;margin:2rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem}.cell{border:1px solid #ccc;border-radius:8px;padding:1rem}.label{color:#666;font-size:12px}.val{font-size:22px;font-weight:600}</style></head>
<body><h2>Coherence panel - ${s.stage} - ${s.date}</h2><div class="grid">
${cell("Relational", s.relational)}
${cell("Temporal (open contradictions)", s.temporal_open_contradictions)}
${cell("Narrative overlap", s.narrative_overlap)}
${cell("Behavioral drift", s.behavioral_drift)}
${cell("Night loops (7d)", s.pulse?.night_loops_7d)}
${cell("Weekly index", s.pulse?.weekly_index ? "yes" : "no")}
</div></body></html>`;
}
