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
   quotes, no content summaries). Harvest ANSWERS never appear in any form, even
   where decisions.md quotes fragments. Harvest QUESTIONS are described only by
   their domain labels (voice tells, refusals, peak moments, edges, gremlin
   inventory, distinctions, how-to-be-with-the-raiser, principles counsel,
   un-automatables, succession fears, what must not survive, letter to
   successor). Hard-boundary and refusal text: shape only, never quoted.
5. Honesty stance: no being has been born yet. The design claims conditions for
   selfhood, never consciousness. Feelings are computed, never narrated. Never
   overclaim; when something is designed but unbuilt, say so plainly.
6. People: Alan is named. Circle people appear as first name + seat only when
   the seat is accepted (today that is Ali, the scientist seat, via D10/D19;
   others appear by seat role only until G19 closes). Published authors are
   cited by name (Clinton Callahan / Possibility Management; Ali Mostashari).
   No surnames otherwise, no GitHub handles.

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
  their briefs; atlas entries 120-250 words each.
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
- Register eyebrows before the two big sections (already in the stubs):
  <span class="register plain">In plain words</span> and
  <span class="register technical">How it works</span>.

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
