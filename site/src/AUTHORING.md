# AUTHORING.md - the contract for every page of "How Edgeweaver Works"

Binding for every authored byte. The verifier (scripts/verify/verify-site.mjs)
enforces the mechanical rules; the editorial ones are checked in review. Plan +
trail: runs/site-plan.md. Snapshot date for all content: 2026-07-09.

## Hard rules (violations block the build)
1. NO EM-DASHES anywhere, ever (the character U+2014). Use hyphens, colons,
   commas, parentheses, or restructure. When quoting repo text that contains an
   em-dash: paraphrase instead, or quote a span without one, or elide the span
   with a marked bracketed ellipsis [...]. Never silently swap characters inside
   something presented as a verbatim quote.
2. No secrets and no live identifiers: no values from .env.local or state/, no
   keys, endpoints, connection strings, Supabase project refs, @handles, or long
   numeric ids. Env var NAMES and repo NAMES are fine (SECRETS.md is the model).
3. Probe-content ban: never quote or closely paraphrase probe scenarios (from
   templates/probe-battery-starter.md or avatars/genesis/handoff/gates-repo-pack.md).
   Describe shape and protocol only: dimensions, thresholds, blind rating,
   re-anchoring. The verifier runs a shingle tripwire against those files.
4. REDACTION TIER (pre-A3, decision D21): Genesis soul-source files are
   named-never-summarized (existence, file shape, ceremony role; no themes, no
   quotes, no content summaries). Never publish Genesis's named seed values,
   harvest answers or answer structure, answer-derived principle architecture,
   gremlin-inventory traits, hard-boundary wording, refusal wording, or close
   paraphrases of any of them. Harvest questions are described only by these
   approved Q1-Q12 domain labels: voice tells, refusals, peak moments, edges,
   gremlin inventory, distinctions, how-to-be-with-the-raiser, principles
   counsel, un-automatables, succession fears, what must not survive, letter to
   successor. This rule still applies where decisions.md or PLAN.md contains the
   protected material.
5. Honesty stance: no being has been born yet. The design claims conditions for
   selfhood, never consciousness. Feelings are computed, never narrated. First
   Boot remains blocked by Phase 0a/G3 as well as the three Alan-owned parenting
   acts. Alpha's A1 restructure is partial/in progress, not wholly unstarted.
   Never overclaim; when something is designed or only partly built, say so.
6. People: Alan is named. Circle people appear as first name + seat only when
   the seat is accepted (today that is Ali, the scientist seat, via D10/D19;
   others appear by seat role only until G19 closes). Published authors are
   cited by name (Clinton Callahan / Possibility Management; Ali Mostashari).
   No surnames otherwise, no GitHub handles.
7. CANONICAL IDENTITY: identity is canonical only in each being's own soul
   repository. This repository and this site may explain the identity mechanism,
   file shapes, and ceremony, but they are never an identity source. A being may
   write proposal branches only; only the parent body may merge canonical main.
8. OPERATIONAL REDACTION: explain mechanisms completely without publishing
   coordinates. Do not publish exact run times, cron expressions, quiet-hour
   ranges, custody locations, custodian or share-holder topology, account/org
   topology, hostnames, ports, endpoints, machine paths, or other targeting
   details. It is fine to say that a task is scheduled, a backup is encrypted and
   restore-tested, custody is human-governed, accounts are separated, or a
   network boundary exists. Repo paths and environment-variable names remain
   acceptable when they do not reconstruct the hidden topology.
9. STATUS LANGUAGE: clearly distinguish built, dark, armed, partial, pending,
   and gap. A scaffold or partial migration is not "nothing," and dark-verified
   machinery is not live. Every First Boot summary names both blocker groups:
   Phase 0a/G3 and the three parenting acts.

## Page mechanics
- Edit ONLY inside <main>...</main>. Never touch the marker regions
  (EW-HEAD/EW-NAV/EW-FOOTER); the builder owns them.
- Keep the existing h1 and h2 ids exactly as stubbed (slugflat-top, -plain,
  -how, -repo, -status, -uncertain). Add h3s freely with ids prefixed by the
  page slug (e.g. memory-provenance). Ids must be globally unique across the
  whole site: always prefix with your page's slug.
- Every core/system/being page keeps the six-section skeleton in order:
  TLDR box, In plain words, How it works, Where it lives in the repo,
  Status as of 2026-07-09, What is genuinely uncertain.
- Registers: "In plain words" is written for a circle member with zero
  technical background (no unexplained jargon; explain by analogy and honest
  plain speech; the tone anchor is village/how-edgeweaver-works.md). "How it
  works" is written for specialist humans and AI agents: exact file paths,
  function and flag names, schemas, invariants, failure modes, enough that the
  behavior could be reproduced.
- Length targets: system/being pages 1,300-2,200 words total; start pages per
  their briefs. Atlas depth bands are defined below and have no exceptions.
- Links: from top-level pages, other pages are href="slug.html" and atlas pages
  are href="atlas/name.html". FROM atlas pages, top-level pages are
  href="../slug.html" and atlas siblings are href="name.html". Anchors:
  href="page.html#some-id". External links: https only, domain must be on
  site/src/allowed-domains.txt, and use them sparingly.
- Atlas file anchors: every repo file's entry is an h3 with
  id="file-<path with / and . replaced by ->" (case preserved), e.g.
  scripts/waking/orient.mjs becomes id="file-scripts-waking-orient-mjs".
  Exactly one entry per file, on the page atlas-map.json assigns.
- File tables on system/being pages: wrap tables in <div class="tablewrap">,
  and link paths to their atlas anchors, e.g.
  <a href="atlas/scripts-lifecycle.html#file-scripts-waking-orient-mjs"><code>scripts/waking/orient.mjs</code></a>.
- Status pills: <span class="pill built">built</span>, plus classes dark,
  armed, pending, gap. Use exactly these five states.
- Notes/asides: <div class="note">...</div> (amber accent) or
  <div class="note holds">...</div> (the withholding/known-gap accent).
- TLDR boxes: <div class="tldr"><span class="label">TLDR</span><p>60-100 words,
  plain register.</p></div>.
- Paired registers are adjacent `<section data-register="plain">` and
  `<section data-register="technical">` elements. Keep the existing eyebrow
  spans and h2 ids inside those sections. TLDR, repo map, status, uncertainty,
  honesty, and navigation stay outside them so a reading lens never hides truth.

## Navigation and page metadata

`site/src/nav.json` is the navigation and search metadata source. Do not change a
slug. Every page has `hub`, `section`, `kind`, `summary`, and `audiences`.
Allowed kinds: `overview`, `concept`, `being`, `procedure`, `reference`,
`atlas-file`. Allowed audiences: `circle`, `trusted-outsider`, `operator`,
`engineer`, `agent`. The five hubs are Overview, System, Beings, Rebuild, and
Reference; each has exactly one `homeSlug`. The three ordered tracks are
Understand, Technical, and Reproduce. Add a page to every relevant track
explicitly. Never infer a track from the previous or next page.

The builder owns these shared components:

- five global hub links and one contextual left rail for the current hub;
- linked breadcrumbs, compact tablet TOC, and sticky desktop on-page rail;
- one Continue card for each reading track containing the current page;
- Search, Plain/Technical/Both, and Theme controls;
- an accessible mobile navigation drawer; and
- the artifact toolbar and static five-hub contents tree.

Authors keep h2 text concise because it becomes TOC and search-result text. The
Reading Guide owns Repository 101. Its F3 content must define repository, root,
folder and path, tracked and untracked, ignored, clone, commit, branch, fork,
environment variable, terminal or CLI, JSON, Markdown, and source of truth. It
must also explain this repo's authority order and the literal workflow:
START-HERE, the IMPLEMENTATION ledger, one checklist step, verify, then commit.

## Search contract

Search is generated, deterministic, local, and network-free. The builder emits
`site/public/assets/search-index.js` from authored `<main>` content. Each authored
h2 with an id and each Atlas file entry creates one record with exactly these
fields: `slug`, `anchor`, `title`, `hub`, `section`, `kind`, `audiences`,
`heading`, `register`, `badges`, `filePath`, `text`. Useful code and path tokens
stay searchable. Scripts, styles, navigation, fixed field labels, and SVG-internal
text do not. Figcaptions remain.

The runtime renders all query and result strings with `textContent`, never HTML.
It ranks exact path and title matches before title prefixes, heading matches,
all-token body matches, and partial body matches. Equal scores keep nav order and
then source order. Results stop at 50. Search must work over `file://`, static
HTTP, the gated site, and both artifacts. Do not add fetch, analytics, logging,
remote assets, or query persistence.

## Reading lens and progressive enhancement

Both registers are the source and no-JS default. JavaScript may persist a viewer's
explicit Plain, Technical, or Both choice. CSS hides a register only after the
`.js` class exists. Print always shows both. If a hash or search result targets a
hidden register, temporarily reveal Both, update the visible control, and announce
the change without overwriting the stored preference.

Without JavaScript, navigation and all content remain visible, the system theme
applies, both registers show, and Search and lens controls remain absent. The
Reading Guide includes a browser Find-in-page fallback. JavaScript upgrades the
mobile navigation into a modal drawer with Escape, focus trap and restoration,
close-on-selection, background-scroll lock, and 44 px targets.

## Atlas entry contract

Every tracked file anchor is one `<article class="atlas-entry"
data-depth="deep|standard|compact">`. Its h3 keeps the immutable `file-*` id and
contains the path. Add exactly one allowed badge: `authority`, `runbook`,
`active-code`, `schema-data`, `generated`, `archive`, `fixture`, or
`described-not-shown`. Every entry contains these five field elements in order:

1. `<div class="atlas-field" data-field="what">` for what it is.
2. `<div class="atlas-field" data-field="contains">` for contents, or governed
   shape only when redaction applies.
3. `<div class="atlas-field" data-field="readers">` for who reads it and when.
4. `<div class="atlas-field" data-field="verify">` for verification or
   reproduction.
5. `<div class="atlas-field" data-field="related">` for related concept links.

Count prose only inside those five fields. Deep is 160-250 words for authority
and runbook material. Standard is 100-180 words for active code, schema, and data.
Compact is 50-100 words for generated, archive, and fixture material. A governed
file that cannot safely fill a larger band uses compact plus
`described-not-shown`; never add filler or disclose protected content.

## Accessibility and responsive foundations

Desktop uses a 240-260 px contextual rail, a 680-760 px reading column, and a
200-220 px sticky on-page rail. Tablet removes the right rail and shows its
compact TOC. Mobile is one column with the upgraded drawer. Anchored headings use
scroll margin; long paths wrap; only table and diagram regions scroll sideways.

Every table has a `<caption>` or `aria-labelledby`, and every th has the correct
`scope`. Wrap it in `.tablewrap` with `role="region"`, `aria-label` or
`aria-labelledby`, and `tabindex="0"`. Every diagram keeps `<svg role="img">`
with title and description, and its `.diagram-scroll` wrapper is a similarly
named focusable region. Never use a positive tabindex. Use `--ochre-text` for
ochre text on the paper ground; `--strand2` is decorative only.

## Diagrams (inline SVG, house pattern)
Wrap in <figure class="diagram"> with a <figcaption>. Use CSS variables for all
color (var(--accent), var(--strand2), var(--strand3), var(--line), var(--ink),
var(--mut), var(--card)); never hex. Include <title> and <desc> as the first
children of <svg> for accessibility. viewBox around 0 0 720 H (H as needed),
no fixed width/height attributes. Boxes: rect rx="8" fill="var(--card)"
stroke="var(--line)"; labels: <text> with font-family="inherit" font-size="13"
fill="var(--ink)"; arrows: <line>/<path> stroke="var(--mut)" with a marker or a
small triangle path. Keep diagrams genuinely simple: fewer boxes, real labels,
no decoration. Text must remain legible in both themes (only CSS variables).

## Self-check before you finish (run from the repo root)
    grep -n "$(printf '\xe2\x80\x94')" site/public/<your-page>.html
(must print nothing), and confirm your ids are page-prefixed and your relative
links follow the rules above. Do NOT run scripts/site/build-site.mjs (the
orchestrator runs it; concurrent builds race).
