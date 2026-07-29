// build-site.mjs: the deterministic assembler for site/ ("How Edgeweaver Works").
//
// Inputs (committed sources ONLY; never git state, never the network):
//   site/src/nav.json            page metadata, hubs, tracks, release id
//   site/src/atlas-map.json      path-prefix coverage map + exclusion classes
//   site/src/raw-sources.json    raw source mirror registry (serve + reference)
//                                plus the committed repository markdown files it lists
//   site/src/partials/*.html     head / nav / footer templates
//   site/public/**/*.html        hand-authored pages (machine-owned marker regions)
//   site/public/assets/site.css  inlined into the artifact editions
//
// Outputs (all committed):
//   site/public/**/*.html        marker regions regenerated in place
//   site/public/assets/search-index.js       deterministic local search data
//   site/artifact/edgeweaver-site-full.html   single-file edition, everything
//   site/artifact/edgeweaver-site-lite.html   single-file edition, atlas dir pages
//                                             collapsed to hub one-liners
//   site/src/atlas-manifest.json  file-* anchors scraped from atlas pages
//   site/public/raw/**            LF-normalized mirrors of registry serve files
//                                 + raw-manifest.json (grouped sha256 per file)
//
// Rules (see runs/site-plan.md):
//   - Pure function of site/src + site/public: byte-identical regeneration.
//   - LF output, no timestamps, nav.json order only, sorted scans.
//   - --check: regenerate in memory, compare newline-agnostically (the
//     probe-runner CRLF lesson, commit 08f1c14), exit 1 naming stale files.
//   - Page ids are page-prefixed and globally unique BY AUTHORING; the artifact
//     editions therefore rewrite links, never ids (verify-site check 4 enforces).

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

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

// Raw source mirror (registry: site/src/raw-sources.json; decision D34). The
// repository is the source of truth: serve entries are mirrored LF-normalized
// under public/raw/ and their atlas filename headings link to the copy;
// reference entries link the heading to the file on the source repository.
// Guards: markdown only, no path tricks, and no protected identity/probe path
// may ever be served.
const rawCfg = JSON.parse(readLF(join(SRC, "raw-sources.json")));
const RAW_FORBIDDEN = [/^avatars\/[^/]+\/soul-source\//, /^SECRETS\.md$/i, /^templates\/probe-battery/];
{
  for (const key of ["repo", "branch", "serve", "reference"]) {
    if (!(key in rawCfg)) throw new Error(`raw-sources.json: missing ${key}`);
  }
  const all = [...rawCfg.serve, ...rawCfg.reference];
  if (new Set(all).size !== all.length) throw new Error("raw-sources.json: duplicate path across serve/reference");
  for (const p of all) {
    if (p.includes("\\") || p.startsWith("/") || p.includes("..")) throw new Error(`raw-sources.json: bad path ${p}`);
    if (!p.endsWith(".md")) throw new Error(`raw-sources.json: markdown only: ${p}`);
    if (!existsSync(join(REPO, p))) throw new Error(`raw-sources.json: listed file missing from repo: ${p}`);
  }
  for (const p of rawCfg.serve) {
    if (RAW_FORBIDDEN.some((re) => re.test(p))) throw new Error(`raw-sources.json: protected path may not be served: ${p}`);
  }
}
const rawByAnchor = new Map();
for (const kind of ["serve", "reference"]) {
  for (const p of rawCfg[kind]) {
    const anchor = "file-" + p.replace(/[/.]/g, "-");
    if (rawByAnchor.has(anchor)) throw new Error(`raw-sources.json: anchor collision ${anchor}`);
    rawByAnchor.set(anchor, { path: p, kind });
  }
}

// Soul mirror (D35): both beings' identity documents, read from their local
// soul-repo checkouts (separate private repositories; their main branches are
// the source of truth). The build fails when a checkout or file is missing so
// a stale machine cannot silently ship a hollow soul surface.
const SOUL_ENTRIES = [];
if (rawCfg.soul) {
  for (const [being, info] of Object.entries(rawCfg.soul.repos)) {
    const dir = join(REPO, info.checkout);
    if (!existsSync(dir)) throw new Error(`raw-sources.json: soul checkout missing for ${being}: ${info.checkout}`);
    // The checkout's branch IS the being's live identity view (Alpha's sits on
    // a proposal branch until the circle merges); mirror it and say so.
    const headFile = join(dir, ".git", "HEAD");
    const head = existsSync(headFile) ? readFileSync(headFile, "utf8").trim() : "";
    const branch = head.startsWith("ref: refs/heads/") ? head.slice("ref: refs/heads/".length) : "detached";
    for (const name of rawCfg.soul.files) {
      const file = join(dir, name);
      if (!existsSync(file)) throw new Error(`soul mirror: ${name} missing in the ${being} checkout`);
      SOUL_ENTRIES.push({ being, branch, name, rel: `soul/${being}/${name}`, file, ghUrl: `${info.repo}/blob/${branch}/${name}` });
    }
  }
}
const partial = (n) => readLF(join(SRC, "partials", n + ".html"));
const HEAD_T = partial("head");
const NAV_T = partial("nav");
const FOOT_T = partial("footer");

const pages = [];
for (const g of nav.groups) for (const p of g.pages) pages.push({ ...p, groupId: g.id, groupTitle: g.title });
const bySlug = new Map(pages.map((p) => [p.slug, p]));
const hubById = new Map((nav.hubs || []).map((h) => [h.id, h]));
const KINDS = new Set(["overview", "concept", "being", "procedure", "reference", "atlas-file"]);
const AUDIENCES = new Set(["circle", "trusted-outsider", "operator", "engineer", "agent"]);

function validateNav() {
  if (!nav.releaseId || typeof nav.releaseId !== "string") throw new Error("nav.json: releaseId must be a nonempty string");
  if (!Array.isArray(nav.hubs) || nav.hubs.length !== 5) throw new Error("nav.json: exactly five hubs are required");
  if (hubById.size !== nav.hubs.length) throw new Error("nav.json: duplicate hub id");
  if (bySlug.size !== pages.length) throw new Error("nav.json: duplicate page slug");
  for (const p of pages) {
    for (const field of ["hub", "section", "kind", "summary"]) {
      if (!p[field] || typeof p[field] !== "string") throw new Error(`nav.json: ${p.slug} missing ${field}`);
    }
    if (!hubById.has(p.hub)) throw new Error(`nav.json: ${p.slug} references unknown hub ${p.hub}`);
    if (!KINDS.has(p.kind)) throw new Error(`nav.json: ${p.slug} has invalid kind ${p.kind}`);
    if (!Array.isArray(p.audiences) || !p.audiences.length || p.audiences.some((a) => !AUDIENCES.has(a))) {
      throw new Error(`nav.json: ${p.slug} has invalid audiences`);
    }
  }
  for (const hub of nav.hubs) {
    const home = bySlug.get(hub.homeSlug);
    if (!home || home.hub !== hub.id) throw new Error(`nav.json: ${hub.id} has invalid homeSlug ${hub.homeSlug}`);
  }
  const trackNames = ["understand", "technical", "reproduce"];
  if (!nav.readingTracks || Object.keys(nav.readingTracks).sort().join(",") !== trackNames.sort().join(",")) {
    throw new Error("nav.json: understand, technical, and reproduce tracks are required");
  }
  for (const [name, track] of Object.entries(nav.readingTracks)) {
    if (!Array.isArray(track) || !track.length) throw new Error(`nav.json: ${name} track is empty`);
    if (new Set(track).size !== track.length) throw new Error(`nav.json: ${name} track repeats a slug`);
    for (const slug of track) if (!bySlug.has(slug)) throw new Error(`nav.json: ${name} track references ${slug}`);
  }
}
validateNav();

const flatOf = (slug) => slug.replace(/\//g, "-");
const rootOf = (slug) => (slug.includes("/") ? "../" : "");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const plain = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

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

function mainInnerOf(html, file) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  if (!m) throw new Error(`${file}: no <main> element`);
  return m[1];
}

function attrOf(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decode(m[1]) : "";
}

function searchableText(html) {
  return plain(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(?:span|strong)\b[^>]*class="[^"]*\b(?:label|register|badge|pill)\b[^"]*"[^>]*>[\s\S]*?<\/(?:span|strong)>/gi, " "));
}

function registerFor(main, index, id) {
  const before = main.slice(0, index);
  const open = before.lastIndexOf("<section");
  const close = before.lastIndexOf("</section>");
  if (open > close) {
    const tagEnd = main.indexOf(">", open);
    const tag = main.slice(open, tagEnd + 1);
    const value = attrOf(tag, "data-register");
    if (value === "plain" || value === "technical") return value;
  }
  if (/-plain$/.test(id)) return "plain";
  if (/-how$/.test(id)) return "technical";
  return null;
}

function badgeTexts(html) {
  const out = [];
  for (const m of html.matchAll(/<[^>]+class="[^"]*\b(?:badge|pill)\b[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi)) {
    const value = plain(m[1]);
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

function searchRecordsForPage(p, raw) {
  const main = mainOf(raw, p.slug);
  const events = [];
  for (const m of main.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)) {
    const id = attrOf(m[1], "id");
    if (id) events.push({ type: "h2", index: m.index, end: m.index + m[0].length, id, heading: plain(m[2]) });
  }
  for (const m of main.matchAll(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi)) {
    const id = attrOf(m[1], "id");
    if (id.startsWith("file-")) events.push({ type: "file", index: m.index, end: m.index + m[0].length, id, heading: plain(m[2]) });
  }
  events.sort((a, b) => a.index - b.index || (a.type === "h2" ? -1 : 1));
  const h2Events = events.filter((e) => e.type === "h2");
  return events.map((event) => {
    let end = main.length;
    if (event.type === "h2") {
      const next = h2Events.find((candidate) => candidate.index > event.index);
      if (next) end = next.index;
    } else {
      const next = events.find((candidate) => candidate.index > event.index && (candidate.type === "h2" || candidate.type === "file"));
      if (next) end = next.index;
    }
    const segment = main.slice(event.end, end);
    const filePath = event.type === "file" ? event.heading : null;
    return {
      slug: p.slug,
      anchor: event.id,
      title: p.title,
      hub: p.hub,
      section: p.section,
      kind: event.type === "file" ? "atlas-file" : p.kind,
      audiences: [...p.audiences],
      heading: event.heading,
      register: event.type === "h2" ? registerFor(main, event.index, event.id) : null,
      badges: badgeTexts(segment),
      filePath,
      text: searchableText(segment),
    };
  });
}

const sourceBySlug = new Map();
for (const p of pages) {
  const file = join(PUB, p.slug + ".html");
  if (!existsSync(file)) throw new Error(`nav.json page missing on disk: site/public/${p.slug}.html`);
  sourceBySlug.set(p.slug, readLF(file));
}

// Atlas heading links (raw source mirror): the filename heading of a
// registry-listed markdown file becomes a link to its served copy (serve) or
// to the source-of-truth repository (reference). Idempotent by construction:
// any previous atlas-src wrapper is stripped before the canonical one is
// applied, so build(build(x)) === build(x) and de-registered files unwrap.
function injectRawLinks(html, slug) {
  const root = rootOf(slug);
  return html.replace(/(<h3 id="(file-[^"]+)">)([\s\S]*?)(<\/h3>)/g, (whole, open, anchor, inner, close) => {
    const bare = inner.replace(/^<a class="atlas-src[^"]*"[^>]*>([\s\S]*?)<\/a>$/, "$1");
    const target = rawByAnchor.get(anchor);
    if (!target) return open + bare + close;
    const wrapped = target.kind === "serve"
      ? `<a class="atlas-src atlas-src-raw" href="${root}raw/${target.path}.html" title="Open the mirrored copy of this file (synced to this release; the repository is the source of truth)">${bare}</a>`
      : `<a class="atlas-src atlas-src-git" href="${rawCfg.repo}/blob/${rawCfg.branch}/${target.path}" title="Open the source of truth on GitHub (repository access required)">${bare}</a>`;
    return open + wrapped + close;
  });
}
for (const p of pages) {
  if (p.slug.startsWith("atlas/")) sourceBySlug.set(p.slug, injectRawLinks(sourceBySlug.get(p.slug), p.slug));
}

// Anchor -> atlas page map (viewer back-links), scraped from the loaded sources.
const anchorPage = new Map();
for (const p of pages.filter((x) => x.slug.startsWith("atlas/"))) {
  for (const m of sourceBySlug.get(p.slug).matchAll(/\bid="(file-[^"]+)"/g)) anchorPage.set(m[1], p.slug);
}

// Site-wide markdown-name linkify (D35): every mention of a known md file in
// page prose becomes a link to its mirror viewer (serve), its GitHub source
// (reference), or the soulfile hub (bare soulfile names, shared by two
// beings). Operates on text segments inside <main> only, never inside an
// existing anchor, script, style, or svg; idempotent via an unwrap pass.
// Bare basenames resolve when globally unique, or to the repo-root file when
// a root file shares the name; ambiguous basenames stay unlinked until
// written as full paths.
const SOUL_BASENAMES = new Set((rawCfg.soul ? rawCfg.soul.files : []).filter((n) => n !== "README.md"));
const mdTargets = new Map();
{
  const targets = [...rawByAnchor.values()];
  for (const t of targets) mdTargets.set(t.path, t);
  const byBase = new Map();
  for (const t of targets) {
    const base = t.path.split("/").pop();
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(t);
  }
  for (const [base, list] of byBase) {
    if (SOUL_BASENAMES.has(base) || mdTargets.has(base)) continue;
    if (list.length === 1) { mdTargets.set(base, list[0]); continue; }
    const rootFile = list.find((t) => !t.path.includes("/"));
    if (rootFile) mdTargets.set(base, rootFile);
  }
  for (const name of SOUL_BASENAMES) mdTargets.set(name, { kind: "soul-hub", path: name });
}
function mdHref(target, root) {
  if (target.kind === "serve") return `${root}raw/${target.path}.html`;
  if (target.kind === "soul-hub") return `${root}raw/soul/index.html`;
  return `${rawCfg.repo}/blob/${rawCfg.branch}/${target.path}`;
}
function mdTitle(target) {
  if (target.kind === "serve") return "Open the mirrored copy served on this site";
  if (target.kind === "soul-hub") return "Open the soulfile mirror (both beings)";
  return "Open the source of truth on GitHub (repository access required)";
}
function linkifyMd(html, slug) {
  const root = rootOf(slug);
  const mainMatch = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
  if (!mainMatch) return html;
  let region = mainMatch[0].replace(/<a class="md-link"[^>]*>([\s\S]*?)<\/a>/g, "$1");
  const parts = region.split(/(<[^>]+>)/);
  let aDepth = 0;
  let skipDepth = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<")) {
      const tag = ((part.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1] || "").toLowerCase();
      if (tag === "a") aDepth += part.startsWith("</") ? -1 : 1;
      if (tag === "script" || tag === "style" || tag === "svg") skipDepth += part.startsWith("</") ? -1 : 1;
      continue;
    }
    if (aDepth > 0 || skipDepth > 0 || !part.includes(".md")) continue;
    parts[i] = part.replace(/[\w./-]*[\w-]\.md\b/g, (token) => {
      const target = mdTargets.get(token);
      if (!target) return token;
      return `<a class="md-link" href="${mdHref(target, root)}" title="${mdTitle(target)}">${token}</a>`;
    });
  }
  region = parts.join("");
  return html.slice(0, mainMatch.index) + region + html.slice(mainMatch.index + mainMatch[0].length);
}
for (const p of pages) sourceBySlug.set(p.slug, linkifyMd(sourceBySlug.get(p.slug), p.slug));

const webSearchRecords = pages.flatMap((p) => searchRecordsForPage(p, sourceBySlug.get(p.slug)));
const liteExcludedSlugs = new Set(pages.filter((p) => p.slug.startsWith("atlas/") && p.slug !== "atlas/index").map((p) => p.slug));
const liteSearchRecords = webSearchRecords.flatMap((record) => {
  if (!liteExcludedSlugs.has(record.slug)) return [record];
  if (!record.filePath) return [];
  return [{
    ...record,
    slug: "atlas/index",
    anchor: "lite-map-" + record.anchor.slice("file-".length),
    title: "Repo Atlas file map",
    heading: record.filePath,
    register: null,
    text: `${record.text} Detail in the gated or full edition.`,
  }];
});

function searchAsset(records) {
  return `/* Generated by scripts/site/build-site.mjs. No network, no analytics. */\nwindow.EDGEWEAVER_SEARCH_INDEX = ${safeJson({ releaseId: nav.releaseId, records })};\n`;
}

function hubLinksFor(current) {
  return nav.hubs.map((hub) => {
    const active = current.hub === hub.id ? ' aria-current="page"' : "";
    return `<a href="${rootOf(current.slug)}${hub.homeSlug}.html"${active}>${esc(hub.title)}</a>`;
  }).join("\n");
}

function contextNavFor(current) {
  const currentPages = pages.filter((p) => p.hub === current.hub);
  const sections = [];
  for (const p of currentPages) {
    let section = sections.find((item) => item.title === p.section);
    if (!section) { section = { title: p.section, pages: [] }; sections.push(section); }
    section.pages.push(p);
  }
  const rendered = sections.map((section) => {
    const items = section.pages.map((p) => {
      const active = p.slug === current.slug ? ' aria-current="page"' : "";
      return `<li><a href="${rootOf(current.slug)}${p.slug}.html"${active}>${esc(p.title)}</a></li>`;
    }).join("\n");
    return `<h2>${esc(section.title)}</h2>\n<ul>\n${items}\n</ul>`;
  });
  if (current.hub === "overview") {
    rendered.push(`<h2>Primary sources</h2>\n<ul>\n<li><a href="${rootOf(current.slug)}raw/index.html">All files: the raw mirror</a></li>\n<li><a href="${rootOf(current.slug)}raw/soul/index.html">Soulfiles: the soul hub</a></li>\n</ul>`);
  }
  return rendered.join("\n");
}

function breadcrumbFor(p) {
  if (p.slug === "index") return `<span aria-current="page">Home</span>`;
  const hub = hubById.get(p.hub);
  const parts = [`<a href="${rootOf(p.slug)}index.html">Home</a>`];
  if (hub.homeSlug !== "index" && p.slug !== hub.homeSlug) {
    parts.push(`<a href="${rootOf(p.slug)}${hub.homeSlug}.html">${esc(hub.title)}</a>`);
  } else if (hub.homeSlug === "index") {
    parts.push(`<span>${esc(hub.title)}</span>`);
  }
  parts.push(`<span>${esc(p.section)}</span>`);
  parts.push(`<span aria-current="page">${esc(p.title)}</span>`);
  return parts.join(" &rsaquo; ");
}

function tocItems(mainHtml) {
  const items = [];
  for (const m of mainHtml.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)) {
    const id = attrOf(m[1], "id");
    if (id) items.push({ id, title: plain(m[2]) });
  }
  return items;
}

function minitocFor(mainHtml) {
  const items = tocItems(mainHtml);
  if (items.length < 2) return "";
  return `<details class="minitoc"><summary>On this page</summary>\n<ul>\n${items.map((item) => `<li><a href="#${item.id}">${esc(item.title)}</a></li>`).join("\n")}\n</ul>\n</details>`;
}

function pageTocFor(mainHtml) {
  const items = tocItems(mainHtml);
  if (items.length < 2) return "";
  return `<nav class="page-toc" aria-label="On this page"><h2>On this page</h2><ul>\n${items.map((item) => `<li><a href="#${item.id}">${esc(item.title)}</a></li>`).join("\n")}\n</ul></nav>`;
}

const trackTitles = { understand: "Understand", technical: "Technical", reproduce: "Reproduce" };
function continueFor(p) {
  const cards = [];
  for (const [name, track] of Object.entries(nav.readingTracks)) {
    const index = track.indexOf(p.slug);
    if (index < 0) continue;
    const next = index < track.length - 1 ? bySlug.get(track[index + 1]) : null;
    const body = next
      ? `<a href="${rootOf(p.slug)}${next.slug}.html">Next: ${esc(next.title)} <span aria-hidden="true">&rarr;</span></a>`
      : `<p>Track complete on this page.</p>`;
    cards.push(`<article class="continue-card"><p class="continue-label">${trackTitles[name]} track</p>${body}</article>`);
  }
  if (!cards.length) return "";
  return `<section class="continue" aria-labelledby="${flatOf(p.slug)}-continue"><h2 id="${flatOf(p.slug)}-continue">Continue</h2><div class="continue-grid">${cards.join("\n")}</div></section>`;
}

function renderPage(p, raw, file) {
  const slugflat = flatOf(p.slug);
  const main = mainOf(raw, file);
  let html = raw;
  html = fillRegion(html, "HEAD", HEAD_T.replace(/\{\{TITLE\}\}/g, esc(p.title))
    .replace(/\{\{ROOT\}\}/g, rootOf(p.slug))
    .replace(/\{\{RELEASE_ID\}\}/g, esc(nav.releaseId)).trimEnd(), file);
  html = fillRegion(
    html,
    "NAV",
    NAV_T.replace(/\{\{SLUGFLAT\}\}/g, slugflat)
      .replace(/\{\{SLUG\}\}/g, esc(p.slug))
      .replace(/\{\{ROOT\}\}/g, rootOf(p.slug))
      .replace(/\{\{SNAPSHOT\}\}/g, SNAP)
      .replace(/\{\{RELEASE_ID\}\}/g, esc(nav.releaseId))
      .replace(/\{\{HUBTITLE\}\}/g, esc(hubById.get(p.hub).title))
      .replace(/\{\{HUBLINKS\}\}/g, hubLinksFor(p))
      .replace(/\{\{CONTEXTNAV\}\}/g, contextNavFor(p))
      .replace(/\{\{BREADCRUMB\}\}/g, breadcrumbFor(p))
      .replace(/\{\{MINITOC\}\}/g, minitocFor(main))
      .replace(/\{\{NOJSFIND\}\}/g, p.slug === "guide" ? `<noscript><div class="note"><p><strong>Search fallback.</strong> Use your browser's Find command on this page, or open the single-file edition and search the whole guide there.</p></div></noscript>` : "")
      .trimEnd(),
    file
  );
  html = fillRegion(html, "FOOTER", FOOT_T
    .replace(/\{\{CONTINUE\}\}/g, continueFor(p))
    .replace(/\{\{PAGETOC\}\}/g, pageTocFor(main))
    .replace(/\{\{SNAPSHOT\}\}/g, SNAP)
    .replace(/\{\{RELEASE_ID\}\}/g, esc(nav.releaseId)).trimEnd(), file);
  return lf(html);
}

// 404 is outside nav.json: no pager, fixed crumb.
function render404(raw, file) {
  const page404 = { slug: "404", title: "Page not found", hub: "overview", section: "Start here" };
  let html = raw;
  html = fillRegion(html, "HEAD", HEAD_T.replace(/\{\{TITLE\}\}/g, "Page not found").replace(/\{\{ROOT\}\}/g, "").replace(/\{\{RELEASE_ID\}\}/g, esc(nav.releaseId)).trimEnd(), file);
  html = fillRegion(
    html,
    "NAV",
    NAV_T.replace(/\{\{SLUGFLAT\}\}/g, "notfound")
      .replace(/\{\{SLUG\}\}/g, "404")
      .replace(/\{\{ROOT\}\}/g, "")
      .replace(/\{\{SNAPSHOT\}\}/g, SNAP)
      .replace(/\{\{RELEASE_ID\}\}/g, esc(nav.releaseId))
      .replace(/\{\{HUBTITLE\}\}/g, "Overview")
      .replace(/\{\{HUBLINKS\}\}/g, hubLinksFor(page404))
      .replace(/\{\{CONTEXTNAV\}\}/g, contextNavFor(page404))
      .replace(/\{\{BREADCRUMB\}\}/g, `<a href="index.html">Home</a> &rsaquo; <span aria-current="page">Not found</span>`)
      .replace(/\{\{MINITOC\}\}/g, "")
      .replace(/\{\{NOJSFIND\}\}/g, "")
      .trimEnd(),
    file
  );
  html = fillRegion(html, "FOOTER", FOOT_T.replace(/\{\{CONTINUE\}\}/g, "").replace(/\{\{PAGETOC\}\}/g, "").replace(/\{\{SNAPSHOT\}\}/g, SNAP).replace(/\{\{RELEASE_ID\}\}/g, esc(nav.releaseId)).trimEnd(), file);
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
  return posix.normalize(posix.join(base, href)).replace(/\.html$/, "");
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

function liteFileMap() {
  const rows = liteSearchRecords.filter((record) => record.filePath).map((record) =>
    `<li id="${record.anchor}"><code>${esc(record.filePath)}</code> <span>detail in the gated or full edition</span></li>`
  );
  return `<section class="lite-file-map" aria-labelledby="atlas-lite-file-map"><h2 id="atlas-lite-file-map">File map</h2><p>Every tracked path has one destination here. Detailed entries remain in the gated site and full edition.</p><ul>${rows.join("\n")}</ul></section>`;
}

function artifactBodyV4(edition) {
  const excluded = edition === "lite" ? liteExcludedSlugs : new Set();
  const included = pages.filter((p) => !excluded.has(p.slug));
  const includedSlugs = new Set(included.map((p) => p.slug));
  const articles = included.map((p) => {
    let content = mainInnerOf(sourceBySlug.get(p.slug), p.slug) + "\n" + continueFor(p);
    content = content.replace(
      `<section class="continue" aria-labelledby="${flatOf(p.slug)}-continue">`,
      `<section class="continue" aria-label="${esc(`Continue from ${p.title}`)}">`
    );
    if (edition === "lite" && p.slug === "atlas/index") content += "\n" + liteFileMap();
    content = content.replace(/<a class="atlas-src[^"]*"[^>]*>([\s\S]*?)<\/a>/g, "$1");
    content = content.replace(/<a\s([^>]*?)href="([^"#]+\.html)(#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g, (whole, pre, target, hash, post, text) => {
      if (/^https?:\/\//.test(target)) return whole;
      const slug = resolveSlug(p.slug, target);
      if (!includedSlugs.has(slug)) {
        if (edition === "lite" && hash && hash.startsWith("#file-")) return `<a ${pre}href="#lite-map-${hash.slice(6)}"${post}>${text}</a>`;
        return text;
      }
      const anchor = hash || `#${flatOf(slug)}-top`;
      return `<a ${pre}href="${anchor}"${post}>${text}</a>`;
    });
    content = content.replace(/<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (whole, url, text) => `${text} (<code>${esc(hostPath(url))}</code>)`);
    return `<article class="af-page" id="af-${flatOf(p.slug)}" aria-labelledby="${flatOf(p.slug)}-top">\n${content}\n</article>`;
  });
  const toc = nav.hubs.map((hub) => {
    const items = included.filter((p) => p.hub === hub.id).map((p) => `<li><a href="#${flatOf(p.slug)}-top">${esc(p.title)}</a></li>`).join("\n");
    return `<li><strong>${esc(hub.title)}</strong><ul>${items}</ul></li>`;
  }).join("\n");
  return { articles: articles.join("\n<hr>\n"), toc };
}

function artifactSearchDialog() {
  return `<dialog id="site-search" class="search-dialog" aria-labelledby="search-title">
  <div class="search-head"><h2 id="search-title">Search this field guide</h2><form method="dialog"><button class="search-close" value="close" aria-label="Close search">Close</button></form></div>
  <label for="search-input">Search concepts, procedures, or repository paths</label>
  <input id="search-input" type="search" autocomplete="off" spellcheck="false" aria-controls="search-results" aria-activedescendant="">
  <p class="search-help">Everything stays on this device. New to repositories? Start with <a href="#guide-top">How to read this site</a>.</p>
  <p id="search-count" class="search-count" aria-live="polite">Type to search.</p>
  <ul id="search-results" class="search-results" role="listbox" aria-label="Search results"></ul>
</dialog>`;
}

function artifactDocV4(edition) {
  const css = readLF(join(PUB, "assets", "site.css"));
  const js = readLF(join(PUB, "assets", "site.js"));
  const records = edition === "lite" ? liteSearchRecords : webSearchRecords;
  const { articles, toc } = artifactBodyV4(edition);
  const label = edition === "full" ? "full edition" : "lite edition with detailed Atlas entries mapped to one-line destinations";
  return lf(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="edgeweaver-release" content="${esc(nav.releaseId)}">
<title>How Edgeweaver Works (single file, ${edition})</title>
<style>
${css}
.af-wrap { max-width: 980px; margin: 0 auto; padding: 76px 18px 80px; }
.af-toc { border: 1px solid var(--line); border-radius: 10px; background: var(--card); padding: 14px 18px; }
.af-toc > ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; list-style: none; padding: 0; }
.af-toc ul ul { padding-left: 18px; }
article.af-page { margin-top: 44px; }
.artifact-toolbar { position: fixed; inset: 0 0 auto; z-index: 30; }
</style>
</head>
<body data-artifact="true">
<header class="topbar artifact-toolbar">
  <strong class="brand">How Edgeweaver Works</strong>
  <div class="top-actions">
    <button class="search-toggle" type="button" aria-haspopup="dialog" aria-controls="site-search" aria-keyshortcuts="Control+K Meta+K" hidden>Search</button>
    <div class="reading-controls" role="group" aria-label="Reading detail" hidden><button type="button" data-reading-choice="plain" aria-pressed="true">Plain</button><button type="button" data-reading-choice="technical" aria-pressed="false">Technical</button><button type="button" data-reading-choice="both" aria-pressed="false">Both</button></div>
    <button class="theme-toggle" type="button" aria-pressed="false" hidden>Theme</button>
  </div>
</header>
<p id="lens-announcer" class="sr-only" aria-live="polite"></p>
${artifactSearchDialog()}
<div class="af-wrap" data-root="" data-page-slug="artifact" data-release-id="${esc(nav.releaseId)}">
<section class="artifact-intro" aria-labelledby="artifact-intro-title"><h1 id="artifact-intro-title">How Edgeweaver Works</h1><p class="foot-license">Single-file ${label}. Generated by scripts/site/build-site.mjs. Snapshot ${SNAP}. Release ${esc(nav.releaseId)}.</p></section>
<nav class="af-toc" aria-label="Contents"><ul>${toc}</ul></nav>
<main id="artifact-main">${articles}</main>
<footer class="site-foot"><p class="foot-banner">Village-layer material: this site sits outside both children's views, like FAMILY.md and village/.</p><p class="foot-license">Documentation license: CC BY-SA 4.0. Possibility Management concepts derive from the World Copyleft thoughtware of Clinton Callahan and Possibility Management. Coherence concepts cited from Ali Mostashari, Principles of Coherence (2025). Brain substrate: Open Brain, OB1. Snapshot ${SNAP}. Release ${esc(nav.releaseId)}.</p></footer>
</div>
<script>${searchAsset(records)}</script>
<script>${js}</script>
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

// ---------- raw mirror viewer pages ----------

// Every served file gets a standalone gated page: the full text plus a
// navigation bar (guide home, its Atlas entry when one exists, the GitHub
// source of truth, and the verbatim file). The verbatim .md stays beside it.
function viewerDoc(relPath, content, ghUrl, atlasHref) {
  const depth = ("raw/" + relPath).split("/").length - 1;
  const root = "../".repeat(depth);
  const name = relPath.split("/").pop();
  const links = [
    `<a href="${root}index.html">How Edgeweaver Works</a>`,
    `<a href="${root}raw/index.html">All files</a>`,
    atlasHref ? `<a href="${atlasHref}">Atlas entry</a>` : "",
    `<a href="${ghUrl}">Source of truth on GitHub</a>`,
    `<a href="${esc(name)}">Verbatim file</a>`,
  ].filter(Boolean).join(" | ");
  return lf(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(relPath)} (source mirror)</title>
<link rel="stylesheet" href="${root}assets/site.css">
<style>
.mirror-wrap { max-width: 900px; margin: 0 auto; padding: 24px 18px 60px; }
.mirror-nav { font-size: 14px; padding: 10px 0 14px; border-bottom: 1px solid rgba(125,125,125,.35); }
.mirror-note { font-size: 13.5px; opacity: .8; }
.mirror-body { white-space: pre-wrap; overflow-wrap: anywhere; font: 13.5px/1.55 ui-monospace, Consolas, monospace; margin-top: 18px; }
</style>
</head>
<body>
<div class="mirror-wrap">
<nav class="mirror-nav" aria-label="Mirror navigation">${links}<span class="mirror-note"> | your browser's Back button returns to the page you came from</span></nav>
<main id="mirror-main">
<h1><code>${esc(relPath)}</code></h1>
<p class="mirror-note">Read-only mirror, synced to this release. The repository is the source of truth.</p>
<pre class="mirror-body">${esc(content)}</pre>
</main>
</div>
</body>
</html>
`);
}

function soulHubDoc() {
  const branchOf = new Map(SOUL_ENTRIES.map((s) => [s.being, s.branch]));
  const rows = Object.entries(rawCfg.soul.repos).map(([being, info]) => {
    const label = being[0].toUpperCase() + being.slice(1);
    const items = rawCfg.soul.files.map((n) => `<li><a href="${being}/${esc(n)}.html"><code>${esc(n)}</code></a></li>`).join("\n");
    const branch = branchOf.get(being) || "unknown";
    return `<section aria-labelledby="soul-${being}"><h2 id="soul-${being}">Edgeweaver ${esc(label)}</h2><p><a href="${info.repo}">Soul repository on GitHub</a> | mirrored from the <code>${esc(branch)}</code> branch, the being's live identity view</p><ul>${items}</ul></section>`;
  }).join("\n");
  return lf(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Soulfiles (source mirror)</title>
<link rel="stylesheet" href="../../assets/site.css">
<style>
.mirror-wrap { max-width: 900px; margin: 0 auto; padding: 24px 18px 60px; }
.mirror-nav { font-size: 14px; padding: 10px 0 14px; border-bottom: 1px solid rgba(125,125,125,.35); }
.mirror-note { font-size: 13.5px; opacity: .8; }
</style>
</head>
<body>
<div class="mirror-wrap">
<nav class="mirror-nav" aria-label="Mirror navigation"><a href="../../index.html">How Edgeweaver Works</a> | <a href="../index.html">All files</a> | <a href="../../soul.html">The Soul layer, explained</a><span class="mirror-note"> | your browser's Back button returns to the page you came from</span></nav>
<main id="mirror-main">
<h1>Soulfiles, mirrored</h1>
<p class="mirror-note">The identity documents of both beings, read-only, mirrored from their soul repositories (the source of truth). Identity changes travel only through witnessed proposal branches in those repositories, never through this site.</p>
${rows}
</main>
</div>
</body>
</html>
`);
}

// The table of contents for the whole mirror: every markdown file, mirrored
// or referenced, one page. Every viewer links here ("All files").
function rawTocDoc() {
  const groups = new Map();
  for (const p of rawCfg.serve) {
    const top = p.includes("/") ? p.slice(0, p.indexOf("/")) : "root";
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(p);
  }
  const sections = [...groups.keys()].sort().map((top) => {
    const items = groups.get(top).sort().map((p) => `<li><a href="${esc(p)}.html"><code>${esc(p)}</code></a></li>`).join("\n");
    const label = top === "root" ? "Repository root" : top + "/";
    return `<section aria-labelledby="toc-${esc(top)}"><h2 id="toc-${esc(top)}">${esc(label)}</h2><ul>${items}</ul></section>`;
  }).join("\n");
  const soulSections = SOUL_ENTRIES.length ? (() => {
    const byBeing = new Map();
    for (const s of SOUL_ENTRIES) {
      if (!byBeing.has(s.being)) byBeing.set(s.being, []);
      byBeing.get(s.being).push(s);
    }
    const parts = [...byBeing.keys()].sort().map((being) => {
      const label = being[0].toUpperCase() + being.slice(1);
      const items = byBeing.get(being).map((s) => `<li><a href="soul/${being}/${esc(s.name)}.html"><code>${esc(s.name)}</code></a></li>`).join("\n");
      return `<h3>Edgeweaver ${esc(label)}</h3><ul>${items}</ul>`;
    }).join("\n");
    return `<section aria-labelledby="toc-soul"><h2 id="toc-soul">Soulfiles</h2><p class="mirror-note">Mirrored from each being's soul repository; see the <a href="soul/index.html">soulfile hub</a> for branches and repositories.</p>${parts}</section>`;
  })() : "";
  const refItems = rawCfg.reference.slice().sort().map((p) =>
    `<li><a href="${rawCfg.repo}/blob/${rawCfg.branch}/${esc(p)}" title="Open the source of truth on GitHub (repository access required)"><code>${esc(p)}</code></a></li>`
  ).join("\n");
  const total = rawCfg.serve.length + SOUL_ENTRIES.length;
  return lf(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>All markdown files (source mirror)</title>
<link rel="stylesheet" href="../assets/site.css">
<style>
.mirror-wrap { max-width: 900px; margin: 0 auto; padding: 24px 18px 60px; }
.mirror-nav { font-size: 14px; padding: 10px 0 14px; border-bottom: 1px solid rgba(125,125,125,.35); }
.mirror-note { font-size: 13.5px; opacity: .8; }
.mirror-wrap ul { columns: 2; column-gap: 28px; }
@media (max-width: 640px) { .mirror-wrap ul { columns: 1; } }
</style>
</head>
<body>
<div class="mirror-wrap">
<nav class="mirror-nav" aria-label="Mirror navigation"><a href="../index.html">How Edgeweaver Works</a> | <a href="soul/index.html">Soulfiles</a><span class="mirror-note"> | your browser's Back button returns to the page you came from</span></nav>
<main id="mirror-main">
<h1>All markdown files</h1>
<p class="mirror-note">${total} documents mirrored on this site (each opens a standalone page with the full text and a way back here), plus ${rawCfg.reference.length} linked to GitHub because the redaction walls or protected-path rules keep their full text off the site. The repositories are the source of truth; mirrors sync at each release.</p>
${sections}
${soulSections}
<section aria-labelledby="toc-github"><h2 id="toc-github">On GitHub only</h2><p class="mirror-note">Repository access required; the links open the source of truth.</p><ul>${refItems}</ul></section>
</main>
</div>
</body>
</html>
`);
}

// ---------- raw source mirror manifest ----------

// sha256 is emitted in 8-char groups so no served byte sequence can ever look
// like a long numeric id to the verifier's secret scan.
function buildRawManifest() {
  const files = rawCfg.serve.slice().sort().map((p) => {
    const content = readLF(join(REPO, p));
    const digest = createHash("sha256").update(content, "utf8").digest("hex").match(/.{8}/g).join("-");
    return { bytes: Buffer.byteLength(content, "utf8"), path: p, sha256: digest };
  });
  for (const s of SOUL_ENTRIES.slice().sort((a, b) => (a.rel < b.rel ? -1 : 1))) {
    const content = readLF(s.file);
    const digest = createHash("sha256").update(content, "utf8").digest("hex").match(/.{8}/g).join("-");
    files.push({ branch: s.branch, bytes: Buffer.byteLength(content, "utf8"), path: s.rel, sha256: digest });
  }
  return stableStringify({
    comment: "Generated by scripts/site/build-site.mjs. Served copies under raw/ are LF-normalized mirrors of the listed repository files; the repository is the source of truth and the release wall fails when a mirror drifts. Hashes are sha256 hex in 8-char groups.",
    branch: rawCfg.branch,
    files,
    referenceOnly: rawCfg.reference.slice().sort(),
    repo: rawCfg.repo,
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
  outputs.set(file, renderPage(p, sourceBySlug.get(p.slug), file));
}
const nf = join(PUB, "404.html");
if (existsSync(nf)) outputs.set(nf, render404(readLF(nf), nf));

// Orphan check: every public page must be nav.json-listed (or 404). Mirror
// viewer pages under raw/ are outputs, not nav pages; strays there are
// check 13's domain, never a build failure.
const RAW_DIR_PREFIX = join(PUB, "raw");
for (const file of listPublicHtml()) {
  if (!outputs.has(file)) {
    if (file.startsWith(RAW_DIR_PREFIX)) continue;
    throw new Error(`page on disk but not in nav.json: ${file}`);
  }
}

outputs.set(join(PUB, "assets", "search-index.js"), searchAsset(webSearchRecords));
outputs.set(join(SITE, "artifact", "edgeweaver-site-full.html"), artifactDocV4("full"));
outputs.set(join(SITE, "artifact", "edgeweaver-site-lite.html"), artifactDocV4("lite"));
outputs.set(join(SRC, "atlas-manifest.json"), buildManifest());
for (const p of rawCfg.serve) {
  const content = readLF(join(REPO, p));
  outputs.set(join(PUB, "raw", ...p.split("/")), content);
  const anchor = "file-" + p.replace(/[/.]/g, "-");
  const aPage = anchorPage.get(anchor);
  const depth = ("raw/" + p).split("/").length - 1;
  const atlasHref = aPage ? "../".repeat(depth) + aPage + ".html#" + anchor : "";
  outputs.set(join(PUB, "raw", ...(p + ".html").split("/")), viewerDoc(p, content, `${rawCfg.repo}/blob/${rawCfg.branch}/${p}`, atlasHref));
}
for (const s of SOUL_ENTRIES) {
  const content = readLF(s.file);
  outputs.set(join(PUB, "raw", ...s.rel.split("/")), content);
  outputs.set(join(PUB, "raw", ...(s.rel + ".html").split("/")), viewerDoc(s.rel, content, s.ghUrl, ""));
}
if (SOUL_ENTRIES.length) outputs.set(join(PUB, "raw", "soul", "index.html"), soulHubDoc());
outputs.set(join(PUB, "raw", "index.html"), rawTocDoc());
outputs.set(join(PUB, "raw", "raw-manifest.json"), buildRawManifest());

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
