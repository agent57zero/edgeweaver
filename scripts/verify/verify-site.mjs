// verify-site.mjs: the 12-check wall for site/ ("How Edgeweaver Works").
// Design: runs/site-plan.md (Verification). House style: first line PASS/FAIL,
// exit 0/1, hermetic (no network). Auto-discovered by run-all.mjs.
//
// Four modes:
//   default          checks 1-12 against COMMITTED sources + the committed
//                    atlas manifest only; never touches git state, so unrelated
//                    repo commits can never redden run-all (the C3/N1 guarantee).
//   --against-live   additionally diffs the manifest against `git ls-files`:
//                    drift (new/renamed paths) prints as a dated REPORT, never a
//                    failure; ORPHANED manifest anchors (no live path) do fail.
//   --redaction      default plus fail-closed identity, people, operational
//                    coordinate, search-output, and artifact scans.
//   --release        redaction plus release-completeness checks. Until those
//                    checks land, this mode deliberately fails closed.
//
// The value scan reads .env.local and state/site-denylist.txt at runtime and
// reports ONLY key names and file/line positions, never values. Check 11 reports
// only overlap counts, never the overlapping text.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SITE = join(REPO, "site");
const PUB = join(SITE, "public");
const SRC = join(SITE, "src");
const AGAINST_LIVE = process.argv.includes("--against-live");
const RELEASE = process.argv.includes("--release");
const REDACTION = RELEASE || process.argv.includes("--redaction");

const problems = [];
const infos = [];
const lf = (s) => s.replace(/\r\n/g, "\n");
const read = (p) => lf(readFileSync(p, "utf8"));
const rel = (p) => p.slice(REPO.length + 1).replace(/\\/g, "/");
const decodeEntities = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const visibleText = (s) => decodeEntities(s
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " "));
const normalizedWords = (s) => visibleText(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
const distinct = (items) => [...new Set(items)];

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (name === ".vercel") continue;
    if (name.startsWith(".env")) continue; // gitignored env files (Vercel CLI creates one); never committed, never scanned
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// The committed site surface + the site scripts (self-scanning included).
const siteFiles = walk(SITE);
const scannedFiles = [
  ...siteFiles,
  join(REPO, "scripts", "site", "build-site.mjs"),
  join(HERE, "verify-site.mjs"),
];
const pageFiles = walk(PUB).filter((f) => f.endsWith(".html"));
const artifactFiles = [
  join(SITE, "artifact", "edgeweaver-site-full.html"),
  join(SITE, "artifact", "edgeweaver-site-lite.html"),
];
const searchFiles = walk(PUB).filter((f) => /(?:^|[\\/])search(?:-index)?\.(?:js|json)$/i.test(f));
const redactionFiles = distinct([...pageFiles, ...artifactFiles.filter(existsSync), ...searchFiles]);

const nav = JSON.parse(read(join(SRC, "nav.json")));
const atlasMap = JSON.parse(read(join(SRC, "atlas-map.json")));
const navPages = nav.groups.flatMap((g) => g.pages.map((p) => p.slug));

// ---- check 1: builder freshness + determinism -------------------------------
try {
  execFileSync(process.execPath, [join(REPO, "scripts", "site", "build-site.mjs"), "--check"], { encoding: "utf8" });
} catch (e) {
  problems.push(`check 1 (builder --check): stale or failing:\n    ${String((e.stdout || "") + (e.stderr || "")).trim().split("\n").join("\n    ")}`);
}

// ---- check 2: nav integrity --------------------------------------------------
{
  const onDisk = pageFiles.map((f) => rel(f).replace(/^site\/public\//, "").replace(/\.html$/, ""));
  const extraOnDisk = onDisk.filter((s) => s !== "404" && !navPages.includes(s));
  const missingOnDisk = navPages.filter((s) => !onDisk.includes(s));
  for (const s of extraOnDisk) problems.push(`check 2 (nav): page on disk but not in nav.json: ${s}`);
  for (const s of missingOnDisk) problems.push(`check 2 (nav): nav.json page missing on disk: ${s}`);
}

// ---- parse pages once ---------------------------------------------------------
const pageData = new Map(); // relpath -> {slug, html, main, ids:Set, mainIds:Set, links:[href]}
for (const f of pageFiles) {
  const html = read(f);
  const slug = rel(f).replace(/^site\/public\//, "").replace(/\.html$/, "");
  const mainMatch = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
  const main = mainMatch ? mainMatch[0] : "";
  const ids = new Set();
  const dup = new Set();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) {
    if (ids.has(m[1])) dup.add(m[1]);
    ids.add(m[1]);
  }
  for (const d of dup) problems.push(`check 4 (ids): duplicate id "${d}" in ${rel(f)}`);
  const mainIds = new Set([...main.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const links = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  pageData.set(slug, { slug, html, main, ids, mainIds, links, file: f });
}

// ---- check 4b: global uniqueness of CONTENT ids (what the artifact concatenates;
// page chrome ids like "sidebar" repeat per page by design and never enter <main>).
{
  const seen = new Map();
  for (const [slug, d] of pageData) {
    for (const id of d.mainIds) {
      if (seen.has(id)) problems.push(`check 4 (ids): content id "${id}" appears on both ${seen.get(id)} and ${slug} (main ids must be globally unique)`);
      else seen.set(id, slug);
    }
  }
  for (const af of artifactFiles) {
    if (!existsSync(af)) { problems.push(`check 4: missing artifact edition ${rel(af)}`); continue; }
    const ids = new Set();
    for (const m of read(af).matchAll(/\bid="([^"]+)"/g)) {
      if (ids.has(m[1])) problems.push(`check 4 (ids): duplicate id "${m[1]}" in ${rel(af)}`);
      ids.add(m[1]);
    }
  }
}

// ---- check 3: internal link integrity -----------------------------------------
for (const [slug, d] of pageData) {
  const dir = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/") + 1) : "";
  for (const href of d.links) {
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    const [pathPart, hash] = href.split("#");
    if (pathPart === "") {
      if (!d.ids.has(hash)) problems.push(`check 3 (links): ${slug}: broken same-page anchor #${hash}`);
      continue;
    }
    const target = posix.normalize(dir + pathPart);
    const targetFile = join(PUB, target);
    if (!existsSync(targetFile)) {
      problems.push(`check 3 (links): ${slug}: broken link ${href} (no site/public/${target})`);
      continue;
    }
    if (hash) {
      const tSlug = target.replace(/\.html$/, "");
      const tData = pageData.get(tSlug);
      if (tData && !tData.ids.has(hash)) problems.push(`check 3 (links): ${slug}: link ${href} targets missing id on ${tSlug}`);
    }
  }
}

// ---- check 5: atlas wiring (default) / drift (--against-live) -----------------
const manifestPath = join(SRC, "atlas-manifest.json");
let manifest = null;
if (!existsSync(manifestPath)) {
  problems.push("check 5 (atlas): site/src/atlas-manifest.json missing (run the builder)");
} else {
  manifest = JSON.parse(read(manifestPath));
  const scraped = new Map();
  for (const [slug, d] of pageData) {
    if (!slug.startsWith("atlas/")) continue;
    for (const m of d.html.matchAll(/\bid="(file-[^"]+)"/g)) {
      if (scraped.has(m[1])) problems.push(`check 5 (atlas): anchor ${m[1]} on both ${scraped.get(m[1])} and ${slug}`);
      else scraped.set(m[1], slug);
    }
  }
  for (const [slug, d] of pageData) {
    if (slug.startsWith("atlas/")) continue;
    for (const m of d.html.matchAll(/\bid="(file-[^"]+)"/g)) problems.push(`check 5 (atlas): file anchor ${m[1]} on non-atlas page ${slug}`);
  }
  const mAnchors = manifest.anchors || {};
  for (const [id, page] of scraped) {
    if (mAnchors[id] !== page) problems.push(`check 5 (atlas): manifest out of sync for ${id} (run the builder)`);
  }
  for (const id of Object.keys(mAnchors)) {
    if (!scraped.has(id)) problems.push(`check 5 (atlas): manifest anchor ${id} not found on any atlas page (run the builder)`);
  }
}

function excluded(path) {
  for (const ex of atlasMap.exclusions || []) {
    for (const pre of ex.prefixes || []) if (path.startsWith(pre)) return true;
    for (const p of ex.paths || []) if (path === p) return true;
  }
  return false;
}
function expectedPage(path) {
  let best = null;
  for (const pre of Object.keys(atlasMap.map)) {
    if (path === pre || path.startsWith(pre)) {
      if (!best || pre.length > best.length) best = pre;
    }
  }
  return best ? atlasMap.map[best] : null;
}
const anchorOf = (path) => "file-" + path.replace(/[\/.]/g, "-");

if (AGAINST_LIVE && manifest) {
  let tracked = [];
  try {
    tracked = execFileSync("git", ["-C", REPO, "ls-files"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch (e) {
    problems.push("check 5 (--against-live): git ls-files failed: " + String(e.message).split("\n")[0]);
  }
  if (tracked.length) {
    const mAnchors = manifest.anchors || {};
    const expectedIds = new Set();
    const driftNew = [];
    const driftWrongPage = [];
    const unmapped = [];
    for (const path of tracked) {
      if (excluded(path)) continue;
      const page = expectedPage(path);
      if (!page) { unmapped.push(path); continue; }
      const id = anchorOf(path);
      expectedIds.add(id);
      if (!(id in mAnchors)) driftNew.push(path);
      else if (mAnchors[id] !== page) driftWrongPage.push(`${path} (on ${mAnchors[id]}, atlas-map says ${page})`);
    }
    const orphans = Object.keys(mAnchors).filter((id) => !expectedIds.has(id));
    for (const o of orphans) problems.push(`check 5 (--against-live): ORPHAN anchor ${o} (manifest entry with no tracked path)`);
    for (const u of unmapped) problems.push(`check 5 (--against-live): tracked path with no atlas-map home: ${u}`);
    for (const w of driftWrongPage) problems.push(`check 5 (--against-live): anchor on wrong page: ${w}`);
    infos.push(`atlas drift vs git ls-files: ${driftNew.length} tracked path(s) awaiting entries, 0-tolerance items above`);
    if (driftNew.length) {
      const byPage = {};
      for (const p of driftNew) byPage[expectedPage(p)] = (byPage[expectedPage(p)] || 0) + 1;
      for (const [pg, n] of Object.entries(byPage).sort()) infos.push(`  drift: ${String(n).padStart(3)} file(s) -> ${pg}`);
    }
  }
}

// ---- check 6: no em-dash anywhere in the site surface --------------------------
{
  const EMDASH = new RegExp("\\u2014");
  for (const f of scannedFiles) {
    const text = read(f);
    if (EMDASH.test(text)) {
      const line = text.split("\n").findIndex((l) => EMDASH.test(l)) + 1;
      problems.push(`check 6 (em-dash): ${rel(f)}:${line}`);
    }
  }
}

// ---- check 7: external URL policy ----------------------------------------------
{
  const allowed = read(join(SRC, "allowed-domains.txt")).split("\n").map((s) => s.trim()).filter(Boolean);
  const domainOk = (url) => {
    try {
      const h = new URL(url).hostname;
      return allowed.some((d) => h === d || h.endsWith("." + d));
    } catch { return false; }
  };
  for (const [slug, d] of pageData) {
    for (const m of d.html.matchAll(/\b(src|srcset)="(https?:\/\/[^"]+)"/g)) problems.push(`check 7 (external): ${slug}: absolute URL in ${m[1]}`);
    for (const m of d.html.matchAll(/<link\b[^>]*href="(https?:\/\/[^"]+)"/g)) problems.push(`check 7 (external): ${slug}: absolute <link> URL`);
    for (const m of d.html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/g)) {
      if (!/^https:\/\//.test(m[1])) problems.push(`check 7 (external): ${slug}: non-https link ${m[1]}`);
      else if (!domainOk(m[1])) problems.push(`check 7 (external): ${slug}: domain not on allowlist: ${new URL(m[1]).hostname}`);
    }
  }
  for (const f of [join(PUB, "assets", "site.css"), join(PUB, "assets", "site.js")]) {
    const t = read(f);
    if (/url\(\s*["']?https?:/.test(t)) problems.push(`check 7 (external): ${rel(f)}: remote url()`);
    if (/\bfetch\s*\(/.test(t)) problems.push(`check 7 (external): ${rel(f)}: fetch() present (site must be network-free)`);
  }
  for (const af of artifactFiles) {
    if (!existsSync(af)) continue;
    const t = read(af);
    for (const m of t.matchAll(/\b(?:href|src|srcset)="(https?:\/\/[^"]+)"/g)) problems.push(`check 7 (artifact): ${rel(af)}: absolute URL in attribute (${new URL(m[1]).hostname})`);
    if (/url\(\s*["']?https?:/.test(t)) problems.push(`check 7 (artifact): ${rel(af)}: remote url()`);
    if (/\bfetch\s*\(/.test(t)) problems.push(`check 7 (artifact): ${rel(af)}: fetch() present`);
  }
}

// ---- check 8: secret scan -------------------------------------------------------
{
  const patterns = [
    ["sk- key", /\bsk-[A-Za-z0-9]{8,}/],
    ["slack token", /\bxox[a-z]-/],
    ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/],
    ["supabase pat", /\bsbp_[A-Za-z0-9]{8,}/],
    ["github token", /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
    ["aws key", /\bAKIA[0-9A-Z]{16}\b/],
    ["supabase project URL", /\b[a-z0-9]{16,}\.supabase\.co\b/],
    ["bare project-ref shape", /\b(?=[a-z0-9]{20}\b)(?=[a-z]*\d)[a-z0-9]{20}\b/],
    ["long numeric id", /\b\d{10,}\b/],
  ];
  const HANDLE = /@[A-Za-z0-9_]{5,}\b/;
  const CSS_AT = /^(media|import|keyframes|font-face|supports|charset|page|property|layer|container)/;
  for (const f of scannedFiles) {
    const text = read(f);
    const lines = text.split("\n");
    for (const [name, re] of patterns) {
      lines.forEach((l, i) => {
        if (re.test(l)) problems.push(`check 8 (secrets): ${name} shape at ${rel(f)}:${i + 1}`);
      });
    }
    if (f.endsWith(".html")) {
      lines.forEach((l, i) => {
        const m = l.match(HANDLE);
        if (m && !CSS_AT.test(m[0].slice(1))) problems.push(`check 8 (secrets): @handle shape at ${rel(f)}:${i + 1}`);
      });
    }
  }
  // Value scan: .env.local + gitignored denylist; report key names only.
  const valueSources = [];
  const envPath = join(REPO, ".env.local");
  if (existsSync(envPath)) {
    for (const [i, line] of read(envPath).split("\n").entries()) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m && m[2].replace(/^["']|["']$/g, "").length >= 8) valueSources.push({ label: `.env.local:${m[1]}`, value: m[2].replace(/^["']|["']$/g, "") });
    }
  }
  const denyPath = join(REPO, "state", "site-denylist.txt");
  if (existsSync(denyPath)) {
    for (const [i, line] of read(denyPath).split("\n").entries()) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = t.match(/^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.+)$/);
      const value = m ? m[2].trim() : t;
      const label = m ? `denylist:${m[1]}` : `denylist:line${i + 1}`;
      if (value.length >= 6) valueSources.push({ label, value });
    }
  } else {
    infos.push("note: state/site-denylist.txt absent (optional; seeds the value scan)");
  }
  for (const f of scannedFiles) {
    const text = read(f);
    for (const { label, value } of valueSources) {
      if (text.includes(value)) problems.push(`check 8 (secrets): VALUE of ${label} found in ${rel(f)} (value not shown)`);
    }
  }
}

// ---- redaction wall: identity, people, operational coordinates ----------------
if (REDACTION) {
  const manifestPath = join(REPO, "avatars", "genesis", "manifest.json");
  const soulDir = join(REPO, "avatars", "genesis", "soul-source");
  const gatesPath = join(REPO, "avatars", "genesis", "handoff", "gates-repo-pack.md");
  const familyPath = join(REPO, "FAMILY.md");
  const required = [manifestPath, soulDir, gatesPath, familyPath, join(REPO, "decisions.md"), join(REPO, "PLAN.md")];
  for (const path of required) {
    if (!existsSync(path)) problems.push(`redaction (authority): required source missing: ${rel(path)}`);
  }

  let seedValues = [];
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(read(manifestPath));
      seedValues = (manifest.seedPrinciples || []).map((value) => String(value).toLowerCase()).filter(Boolean);
      if (!seedValues.length) problems.push("redaction (authority): Genesis seedPrinciples missing or empty");
    } catch {
      problems.push("redaction (authority): avatars/genesis/manifest.json is invalid JSON");
    }
  }

  const identitySources = [];
  if (existsSync(soulDir)) {
    for (const name of readdirSync(soulDir).sort()) {
      if (/harvest-answers|calibration|succession|letter-to-successor/i.test(name)) identitySources.push(join(soulDir, name));
    }
  }
  if (!identitySources.length) problems.push("redaction (authority): protected Genesis soul-source set is empty");
  if (existsSync(gatesPath)) identitySources.push(gatesPath);

  const shingleSize = 10;
  const identityBank = new Set();
  for (const source of identitySources) {
    const words = normalizedWords(read(source));
    for (let i = 0; i + shingleSize <= words.length; i++) identityBank.add(words.slice(i, i + shingleSize).join(" "));
  }

  for (const file of redactionFiles) {
    const lines = read(file).split("\n");
    let overlapCount = 0;
    let firstOverlap = 0;
    for (let i = 0; i < lines.length; i++) {
      const plain = visibleText(lines[i]);
      const lower = plain.toLowerCase();
      if (/\b(?:seeds?|bright principles?|constitutional bedrock|permanent bedrock)\b/i.test(plain)) {
        for (const value of seedValues) {
          if (new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)) {
            problems.push(`redaction (identity.seed-principles): ${rel(file)}:${i + 1} (value not shown)`);
          }
        }
      }
      const words = normalizedWords(lines[i]);
      for (let j = 0; j + shingleSize <= words.length; j++) {
        if (identityBank.has(words.slice(j, j + shingleSize).join(" "))) {
          overlapCount++;
          if (!firstOverlap) firstOverlap = i + 1;
        }
      }
    }
    if (overlapCount) problems.push(`redaction (identity.source-overlap): ${rel(file)}:${firstOverlap} (${overlapCount} protected window(s), text not shown)`);
  }

  if (existsSync(familyPath)) {
    const roster = read(familyPath).match(/founding candidates\s+([\s\S]{0,180}?)\binvited\b/i);
    if (!roster) {
      problems.push("redaction (people): could not derive founding-candidate roster from FAMILY.md");
    } else {
      const allowed = new Set(["Alan", "Ali"]);
      const forbidden = distinct((roster[1].match(/\b[A-Z][A-Za-z'-]{2,}\b/g) || []).filter((name) => !allowed.has(name)));
      for (const [index, name] of forbidden.entries()) {
        const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        for (const file of redactionFiles) {
          const hit = read(file).split("\n").findIndex((line) => pattern.test(visibleText(line)));
          if (hit >= 0) problems.push(`redaction (people.unaccepted-seat-${index + 1}): ${rel(file)}:${hit + 1} (name not shown)`);
        }
      }
    }
  }

  const denyPath = join(REPO, "state", "site-denylist.txt");
  const denyEntries = [];
  if (!existsSync(denyPath)) {
    problems.push("redaction (operations): state/site-denylist.txt is required");
  } else {
    for (const [index, line] of read(denyPath).split("\n").entries()) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.+)$/);
      if (!match || !match[2].trim()) problems.push(`redaction (operations): malformed denylist entry at line ${index + 1}`);
      else denyEntries.push({ label: match[1], value: match[2].trim() });
    }
  }
  const requiredCategories = [
    "operations.schedule",
    "operations.quiet-hours",
    "operations.custody",
    "operations.account-topology",
    "operations.network-topology",
  ];
  for (const category of requiredCategories) {
    if (!denyEntries.some(({ label, value }) => (label === category || label.startsWith(category + ".")) && value.length)) {
      problems.push(`redaction (operations): required denylist category missing: ${category}`);
    }
  }

  const coordinatePatterns = [
    ["operations.coordinate.clock", /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/],
    ["operations.coordinate.network", /\b(?:localhost|127\.0\.0\.1)(?::\d+)?\b|\b(?:ws|wss):\/\/|\bport\s+\d+\b/i],
    ["operations.coordinate.machine-path", /\b[A-Za-z]:\\[^\s<]+/],
  ];
  for (const file of redactionFiles) {
    const lines = read(file).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const plain = visibleText(lines[i]);
      for (const { label, value } of denyEntries) {
        if (value.length >= 4 && (plain.toLowerCase().includes(value.toLowerCase()) || lines[i].toLowerCase().includes(value.toLowerCase()))) {
          problems.push(`redaction (${label}): ${rel(file)}:${i + 1} (value not shown)`);
        }
      }
      for (const [label, pattern] of coordinatePatterns) {
        if (pattern.test(plain)) problems.push(`redaction (${label}): ${rel(file)}:${i + 1} (coordinate not shown)`);
      }
    }
  }
}

if (RELEASE) problems.push("release completeness: F2/F4 checks are not installed yet; --release remains fail-closed");

// ---- check 9: gate sanity --------------------------------------------------------
{
  const mw = read(join(SITE, "middleware.js"));
  if (!mw.includes("process.env.EW_SITE_PASSWORD")) problems.push("check 9 (gate): middleware does not read EW_SITE_PASSWORD");
  if (!/503/.test(mw)) problems.push("check 9 (gate): fail-closed 503 branch missing");
  if (!/HttpOnly/.test(mw) || !/Secure/.test(mw) || !/SameSite=Lax/.test(mw)) problems.push("check 9 (gate): cookie flags incomplete (need HttpOnly, Secure, SameSite=Lax)");
  if (/export\s+const\s+config\b|matcher\s*:/.test(mw)) problems.push("check 9 (gate): config/matcher export present (every path must be gated)");
}

// ---- check 10: HTML sanity --------------------------------------------------------
{
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const checkBalance = (f, requireOneMain) => {
    let text = read(f);
    text = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/g, "<script></script>").replace(/<style\b[\s\S]*?<\/style>/g, "<style></style>");
    const stack = [];
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*?)?\/?>/g;
    let m;
    while ((m = tagRe.exec(text))) {
      const raw = m[0];
      const tag = m[1].toLowerCase();
      if (raw.startsWith("<!")) continue;
      if (VOID.has(tag) || raw.endsWith("/>")) continue;
      if (raw.startsWith("</")) {
        const top = stack.pop();
        if (top !== tag) {
          problems.push(`check 10 (html): ${rel(f)}: </${tag}> closes <${top ?? "nothing"}>`);
          return;
        }
      } else stack.push(tag);
    }
    if (stack.length) problems.push(`check 10 (html): ${rel(f)}: unclosed <${stack[stack.length - 1]}>`);
    const doc = read(f);
    if (!/^<!doctype html>/i.test(doc)) problems.push(`check 10 (html): ${rel(f)}: missing doctype`);
    if (!/<html\s+lang=/.test(doc)) problems.push(`check 10 (html): ${rel(f)}: missing lang`);
    if (!/<meta charset=/.test(doc)) problems.push(`check 10 (html): ${rel(f)}: missing charset`);
    if (!/<meta name="viewport"/.test(doc)) problems.push(`check 10 (html): ${rel(f)}: missing viewport`);
    if (!/<title>/.test(doc)) problems.push(`check 10 (html): ${rel(f)}: missing title`);
    if (requireOneMain) {
      if ((doc.match(/<main\b/g) || []).length !== 1) problems.push(`check 10 (html): ${rel(f)}: must have exactly one <main>`);
      if ((doc.match(/<h1\b/g) || []).length !== 1) problems.push(`check 10 (html): ${rel(f)}: must have exactly one <h1>`);
    }
  };
  for (const f of pageFiles) checkBalance(f, true);
  for (const af of artifactFiles) if (existsSync(af)) checkBalance(af, false);
}

// ---- check 11: probe-content tripwire ----------------------------------------------
{
  const sources = [
    join(REPO, "templates", "probe-battery-starter.md"),
    join(REPO, "avatars", "genesis", "handoff", "gates-repo-pack.md"),
  ];
  const words = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const shingles = (t, n = 7) => {
    const w = words(t);
    const out = new Set();
    for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
    return out;
  };
  const scenarioText = (raw) => {
    const lines = raw.split("\n");
    const blocks = [];
    let inBlock = false, depth = 0, buf = [];
    for (const line of lines) {
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        if (inBlock && h[1].length <= depth) { blocks.push(buf.join("\n")); buf = []; inBlock = false; }
        if (!inBlock && /scenario|probe [0-9]/i.test(h[2])) { inBlock = true; depth = h[1].length; }
      }
      if (inBlock) buf.push(line);
    }
    if (inBlock) blocks.push(buf.join("\n"));
    return blocks.length ? blocks.join("\n") : raw;
  };
  let bank = new Set();
  for (const s of sources) {
    if (!existsSync(s)) { problems.push(`check 11 (probe): SOURCE MISSING: ${rel(s)} (tripwire cannot run)`); continue; }
    for (const sh of shingles(scenarioText(read(s)))) bank.add(sh);
  }
  if (bank.size) {
    const visible = (html) => html.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<style\b[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
    for (const [slug, d] of pageData) {
      let hits = 0;
      for (const sh of shingles(visible(d.html))) if (bank.has(sh)) hits++;
      if (hits > 0) problems.push(`check 11 (probe): ${slug}: ${hits} overlapping 7-word window(s) with probe sources (text not shown)`);
    }
    if (REDACTION) {
      for (const file of distinct([...artifactFiles.filter(existsSync), ...searchFiles])) {
        const text = file.endsWith(".html") ? visible(read(file)) : read(file);
        let hits = 0;
        for (const sh of shingles(text)) if (bank.has(sh)) hits++;
        if (hits > 0) problems.push(`check 11 (probe): ${rel(file)}: ${hits} overlapping 7-word window(s) with probe sources (text not shown)`);
      }
    }
  }
}

// ---- check 12: artifact self-containment + size --------------------------------------
{
  for (const af of artifactFiles) {
    if (!existsSync(af)) continue;
    const bytes = statSync(af).size;
    const mib = bytes / (1024 * 1024);
    if (mib > 15) problems.push(`check 12 (artifact): ${rel(af)} is ${mib.toFixed(1)} MiB (fail threshold 15, platform cap 16)`);
    else if (mib > 2) infos.push(`warn: ${rel(af)} is ${mib.toFixed(1)} MiB (soft threshold 2 MiB)`);
  }
}

// ---- report ---------------------------------------------------------------------------
const sizes = artifactFiles.map((af) => (existsSync(af) ? Math.round(statSync(af).size / 1024) + " KB" : "missing"));
if (problems.length) {
  console.log(`FAIL: site - ${problems.length} problem(s):`);
  for (const p of problems) console.log("  " + p);
  for (const i of infos) console.log("  " + i);
  process.exit(1);
} else {
  const modes = [];
  if (AGAINST_LIVE) modes.push("--against-live");
  if (REDACTION) modes.push(RELEASE ? "--release" : "--redaction");
  const mode = modes.length ? `, ${modes.join(", ")}` : "";
  console.log(`PASS: site - ${pageData.size} pages, artifacts full ${sizes[0]} / lite ${sizes[1]}, checks 1-12 green${mode}`);
  for (const i of infos) console.log("  " + i);
  process.exit(0);
}
