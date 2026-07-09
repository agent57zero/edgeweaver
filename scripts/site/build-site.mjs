// build-site.mjs: the deterministic assembler for site/ ("How Edgeweaver Works").
//
// Inputs (committed sources ONLY; never git state, never the network):
//   site/src/nav.json            page order, titles, groups, snapshot date
//   site/src/atlas-map.json      path-prefix coverage map + exclusion classes
//   site/src/partials/*.html     head / nav / footer templates
//   site/public/**/*.html        hand-authored pages (machine-owned marker regions)
//   site/public/assets/site.css  inlined into the artifact editions
//
// Outputs (all committed):
//   site/public/**/*.html        marker regions regenerated in place
//   site/artifact/edgeweaver-site-full.html   single-file edition, everything
//   site/artifact/edgeweaver-site-lite.html   single-file edition, atlas dir pages
//                                             collapsed to hub one-liners
//   site/src/atlas-manifest.json  file-* anchors scraped from atlas pages
//
// Rules (see runs/site-plan.md):
//   - Pure function of site/src + site/public: byte-identical regeneration.
//   - LF output, no timestamps, nav.json order only, sorted scans.
//   - --check: regenerate in memory, compare newline-agnostically (the
//     probe-runner CRLF lesson, commit 08f1c14), exit 1 naming stale files.
//   - Page ids are page-prefixed and globally unique BY AUTHORING; the artifact
//     editions therefore rewrite links, never ids (verify-site check 4 enforces).

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const rootIdx = args.indexOf("--root");
const REPO = rootIdx >= 0 ? args[rootIdx + 1] : join(HERE, "..", "..");
const SITE = join(REPO, "site");
const PUB = join(SITE, "public");
const SRC = join(SITE, "src");

const lf = (s) => s.replace(/\r\n/g, "\n");
const readLF = (p) => lf(readFileSync(p, "utf8"));

const nav = JSON.parse(readLF(join(SRC, "nav.json")));
const atlasMap = JSON.parse(readLF(join(SRC, "atlas-map.json")));
const SNAP = nav.snapshot;
const partial = (n) => readLF(join(SRC, "partials", n + ".html"));
const HEAD_T = partial("head");
const NAV_T = partial("nav");
const FOOT_T = partial("footer");

const pages = [];
for (const g of nav.groups) for (const p of g.pages) pages.push({ ...p, groupId: g.id, groupTitle: g.title });
const bySlug = new Map(pages.map((p) => [p.slug, p]));

const flatOf = (slug) => slug.replace(/\//g, "-");
const rootOf = (slug) => (slug.includes("/") ? "../" : "");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- region filling ----------

function fillRegion(html, name, body, file) {
  const start = `<!-- EW-${name}-START -->`;
  const end = `<!-- EW-${name}-END -->`;
  const si = html.indexOf(start);
  const ei = html.indexOf(end);
  if (si < 0 || ei < 0 || ei < si) throw new Error(`${file}: missing or malformed ${name} markers`);
  if (html.indexOf(start, si + 1) >= 0) throw new Error(`${file}: duplicate ${name} markers`);
  return html.slice(0, si + start.length) + "\n" + body + "\n" + html.slice(ei);
}

function mainOf(html, file) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  if (!m) throw new Error(`${file}: no <main> element`);
  return m[0];
}

function navGroupsFor(current) {
  const out = [];
  for (const g of nav.groups) {
    const items = g.pages
      .map((p) => {
        const cur = p.slug === current.slug ? ' aria-current="page"' : "";
        return `<li><a href="${rootOf(current.slug)}${p.slug}.html"${cur}>${esc(p.title)}</a></li>`;
      })
      .join("\n");
    if (g.collapsed) {
      const open = g.pages.some((p) => p.slug === current.slug) ? " open" : "";
      out.push(`<details${open}><summary>${esc(g.title)}</summary>\n<ul>\n${items}\n</ul>\n</details>`);
    } else {
      out.push(`<h2>${esc(g.title)}</h2>\n<ul>\n${items}\n</ul>`);
    }
  }
  return out.join("\n");
}

function breadcrumbFor(p) {
  if (p.slug === "index") return `<span aria-current="page">Home</span>`;
  return `<a href="${rootOf(p.slug)}index.html">Home</a> &rsaquo; <span>${esc(p.groupTitle)}</span> &rsaquo; <span aria-current="page">${esc(p.title)}</span>`;
}

function minitocFor(mainHtml) {
  const items = [];
  const re = /<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = re.exec(mainHtml))) items.push(`<li><a href="#${m[1]}">${m[2].replace(/<[^>]+>/g, "")}</a></li>`);
  if (items.length < 2) return "";
  return `<details class="minitoc"><summary>On this page</summary>\n<ul>\n${items.join("\n")}\n</ul>\n</details>`;
}

function pagerFor(p) {
  const i = pages.findIndex((x) => x.slug === p.slug);
  const prev = i > 0 ? pages[i - 1] : null;
  const next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : null;
  const a = prev ? `<a href="${rootOf(p.slug)}${prev.slug}.html" rel="prev">&larr; ${esc(prev.title)}</a>` : "<span></span>";
  const b = next ? `<a href="${rootOf(p.slug)}${next.slug}.html" rel="next">${esc(next.title)} &rarr;</a>` : "<span></span>";
  return a + "\n" + b;
}

function renderPage(p, raw, file) {
  const slugflat = flatOf(p.slug);
  const main = mainOf(raw, file);
  let html = raw;
  html = fillRegion(html, "HEAD", HEAD_T.replace(/\{\{TITLE\}\}/g, esc(p.title)).replace(/\{\{ROOT\}\}/g, rootOf(p.slug)).trimEnd(), file);
  html = fillRegion(
    html,
    "NAV",
    NAV_T.replace(/\{\{SLUGFLAT\}\}/g, slugflat)
      .replace(/\{\{ROOT\}\}/g, rootOf(p.slug))
      .replace(/\{\{SNAPSHOT\}\}/g, SNAP)
      .replace(/\{\{NAVGROUPS\}\}/g, navGroupsFor(p))
      .replace(/\{\{BREADCRUMB\}\}/g, breadcrumbFor(p))
      .replace(/\{\{MINITOC\}\}/g, minitocFor(main))
      .trimEnd(),
    file
  );
  html = fillRegion(html, "FOOTER", FOOT_T.replace(/\{\{PREVNEXT\}\}/g, pagerFor(p)).replace(/\{\{SNAPSHOT\}\}/g, SNAP).trimEnd(), file);
  return lf(html);
}

// 404 is outside nav.json: no pager, fixed crumb.
function render404(raw, file) {
  let html = raw;
  html = fillRegion(html, "HEAD", HEAD_T.replace(/\{\{TITLE\}\}/g, "Page not found").replace(/\{\{ROOT\}\}/g, "").trimEnd(), file);
  html = fillRegion(
    html,
    "NAV",
    NAV_T.replace(/\{\{SLUGFLAT\}\}/g, "notfound")
      .replace(/\{\{ROOT\}\}/g, "")
      .replace(/\{\{SNAPSHOT\}\}/g, SNAP)
      .replace(/\{\{NAVGROUPS\}\}/g, navGroupsFor({ slug: "404" }))
      .replace(/\{\{BREADCRUMB\}\}/g, `<a href="index.html">Home</a> &rsaquo; <span aria-current="page">Not found</span>`)
      .replace(/\{\{MINITOC\}\}/g, "")
      .trimEnd(),
    file
  );
  html = fillRegion(html, "FOOTER", FOOT_T.replace(/\{\{PREVNEXT\}\}/g, "<span></span>\n<span></span>").replace(/\{\{SNAPSHOT\}\}/g, SNAP).trimEnd(), file);
  return lf(html);
}

// ---------- artifact editions ----------

function hostPath(u) {
  try {
    const url = new URL(u);
    return url.host + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return u;
  }
}

// Resolve an href relative to the page's directory into a site-root slug.
function resolveSlug(fromSlug, href) {
  const base = fromSlug.includes("/") ? fromSlug.slice(0, fromSlug.lastIndexOf("/") + 1) : "";
  let path = href.startsWith("../") ? href.slice(3) : base + href;
  return path.replace(/\.html$/, "");
}

function artifactBody(edition) {
  const liteExcluded = new Set(
    edition === "lite" ? pages.filter((p) => p.slug.startsWith("atlas/") && p.slug !== "atlas/index").map((p) => p.slug) : []
  );
  const included = pages.filter((p) => !liteExcluded.has(p.slug));
  const includedFlats = new Set(included.map((p) => flatOf(p.slug)));

  const sections = included.map((p) => {
    const file = join(PUB, p.slug + ".html");
    let main = mainOf(readLF(file), file);
    // Cross-page links: page.html -> #<flat>-top; page.html#x -> #x (ids are
    // globally unique by authoring). Links into lite-excluded pages degrade to text.
    main = main.replace(/<a\s([^>]*?)href="([^"#]+\.html)(#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g, (whole, pre, target, hash, post, text) => {
      if (/^https?:\/\//.test(target)) return whole;
      const slug = resolveSlug(p.slug, target);
      const tFlat = flatOf(slug);
      if (!includedFlats.has(tFlat)) return text; // excluded in this edition: plain text
      const anchor = hash ? hash : `#${tFlat}-top`;
      return `<a ${pre}href="${anchor}"${post}>${text}</a>`;
    });
    // External links: textified (strict CSP; no dead clicks).
    main = main.replace(/<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (whole, url, text) => `${text} (<code>${esc(hostPath(url))}</code>)`);
    return `<section class="af-page" id="af-${flatOf(p.slug)}">\n${main}\n</section>`;
  });

  const toc = nav.groups
    .map((g) => {
      const items = g.pages
        .filter((p) => !liteExcluded.has(p.slug))
        .map((p) => `<li><a href="#${flatOf(p.slug)}-top">${esc(p.title)}</a></li>`)
        .join("\n");
      const note = edition === "lite" && g.id === "atlas" ? `\n<li><em>Atlas file entries live on the full edition and the gated site; the hub below keeps one line per file.</em></li>` : "";
      return `<li><strong>${esc(g.title)}</strong>\n<ul>\n${items}${note}\n</ul>\n</li>`;
    })
    .join("\n");

  return { sections: sections.join("\n<hr>\n"), toc };
}

function artifactDoc(edition) {
  const css = readLF(join(PUB, "assets", "site.css"));
  const { sections, toc } = artifactBody(edition);
  const label = edition === "full" ? "full edition" : "lite edition (atlas entry bodies collapsed to the hub's one-liners)";
  return lf(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>How Edgeweaver Works (single file, ${edition})</title>
<style>
${css}
/* Single-file edition adjustments: no sidebar shell, anchor TOC instead. */
.shell { display: block; }
.af-wrap { max-width: 860px; margin: 0 auto; padding: 20px 18px 80px; }
.af-toc { border: 1px solid var(--line); border-radius: 10px; background: var(--card); padding: 14px 18px; }
.af-toc ul { list-style: none; padding-left: 14px; }
section.af-page { margin-top: 44px; }
</style>
</head>
<body>
<div class="af-wrap">
<header>
<h1>How Edgeweaver Works</h1>
<p class="foot-license">Single-file ${label}. Generated by scripts/site/build-site.mjs; the canonical copies are the repo's site/ tree and the gated website. Snapshot ${SNAP}.</p>
</header>
<nav class="af-toc" aria-label="Contents">
<ul>
${toc}
</ul>
</nav>
${sections}
<footer class="site-foot">
<p class="foot-banner">Village-layer material: this site sits outside both children's views, like FAMILY.md and village/, and it discusses sibling facts each child learns only by its parent body's deliberate decision (gate G21).</p>
<p class="foot-license">Documentation license: CC BY-SA 4.0 (<code>creativecommons.org/licenses/by-sa/4.0</code>). Possibility Management concepts derive from the World Copyleft thoughtware of Clinton Callahan and Possibility Management (<code>possibilitymanagement.org</code>), shared alike with gratitude. Coherence concepts cited from Ali Mostashari, Principles of Coherence (2025). Brain substrate: Open Brain, OB1. Snapshot ${SNAP}.</p>
</footer>
</div>
</body>
</html>
`);
}

// ---------- atlas manifest ----------

function stableStringify(v, indent = 0) {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return "[\n" + v.map((x) => padIn + stableStringify(x, indent + 1)).join(",\n") + "\n" + pad + "]";
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v).sort();
    if (!keys.length) return "{}";
    return "{\n" + keys.map((k) => `${padIn}${JSON.stringify(k)}: ${stableStringify(v[k], indent + 1)}`).join(",\n") + "\n" + pad + "}";
  }
  return JSON.stringify(v);
}

function buildManifest() {
  const anchors = {};
  for (const p of pages.filter((x) => x.slug.startsWith("atlas/"))) {
    const file = join(PUB, p.slug + ".html");
    const main = mainOf(readLF(file), file);
    const re = /\bid="(file-[^"]+)"/g;
    let m;
    while ((m = re.exec(main))) {
      if (anchors[m[1]]) throw new Error(`duplicate atlas anchor ${m[1]} (${anchors[m[1]]} and ${p.slug})`);
      anchors[m[1]] = p.slug;
    }
  }
  return stableStringify({
    comment: "Generated by scripts/site/build-site.mjs from committed site sources only (file-* anchors present on atlas pages + atlas-map.json exclusions). Never derived from git state.",
    anchors,
    exclusions: atlasMap.exclusions,
  }) + "\n";
}

// ---------- drive ----------

function listPublicHtml() {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".html")) found.push(full);
    }
  };
  walk(PUB);
  return found;
}

const outputs = new Map(); // absolute path -> content

for (const p of pages) {
  const file = join(PUB, p.slug + ".html");
  if (!existsSync(file)) throw new Error(`nav.json page missing on disk: site/public/${p.slug}.html`);
  outputs.set(file, renderPage(p, readLF(file), file));
}
const nf = join(PUB, "404.html");
if (existsSync(nf)) outputs.set(nf, render404(readLF(nf), nf));

// Orphan check: every public page must be nav.json-listed (or 404).
for (const file of listPublicHtml()) {
  if (!outputs.has(file)) throw new Error(`page on disk but not in nav.json: ${file}`);
}

outputs.set(join(SITE, "artifact", "edgeweaver-site-full.html"), artifactDoc("full"));
outputs.set(join(SITE, "artifact", "edgeweaver-site-lite.html"), artifactDoc("lite"));
outputs.set(join(SRC, "atlas-manifest.json"), buildManifest());

if (CHECK) {
  const stale = [];
  for (const [file, want] of outputs) {
    const disk = existsSync(file) ? lf(readFileSync(file, "utf8")) : null;
    if (disk !== want) stale.push(file);
  }
  if (stale.length) {
    console.error(`STALE: ${stale.length} generated file(s) out of date. Run: node scripts/site/build-site.mjs`);
    for (const f of stale) console.error("  " + f);
    process.exit(1);
  }
  console.log(`build-site --check: ${outputs.size} generated file(s) fresh`);
  process.exit(0);
}

let wrote = 0;
for (const [file, content] of outputs) {
  mkdirSync(dirname(file), { recursive: true });
  const disk = existsSync(file) ? lf(readFileSync(file, "utf8")) : null;
  if (disk !== content) {
    writeFileSync(file, content, "utf8");
    wrote++;
  }
}
console.log(`build-site: ${outputs.size} generated file(s), ${wrote} updated`);
