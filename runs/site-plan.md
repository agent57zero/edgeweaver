# The site plan: "How Edgeweaver Works" (v4 execution handoff)

> Current execution authority for finishing the site. Written for Luna as lead
> implementer and for a root agent acting as orchestrator. The approved v3 design,
> page inventory, editorial rules, delivery architecture, and adversarial trail are
> retained below as the design specification. This v4 handoff supersedes the old
> build sequence and conflicting v3 clauses for navigation, the viewer-selected
> reading lens, tiered Atlas depth, identity/operational redaction, verification,
> and release. V3 governs everything else. PLAN.md, GROWING-EDGEWEAVER.md, and
> FAMILY.md remain higher authority.

Version: v4, EXECUTION HANDOFF. Audit date: 2026-07-09. The M6 reconciliation set
the site-wide content snapshot to 2026-07-10; historical event dates remain dated
where they occurred.

## How Luna must use this plan

1. Read this handoff through **Definition of done** before editing anything.
2. Read `site/README.md` and `site/src/AUTHORING.md` completely.
3. Preserve the current dirty site work. Do not stash, reset, clean, restore,
   checkout, or regenerate over it.
4. Follow the work waves and file ownership below. Do not drive from the historical
   v3 build sequence later in this file.
5. A line beginning with **STOP** is a real stop. Luna reports the evidence to the
   orchestrator; Alan closes the human decision.
6. The orchestrator owns assignments, freezes, integration, verification, Git, and
   release. Luna owns the shared implementation contract and applies integrated
   fixes. Content agents own only the files explicitly assigned to them.

## Current repository truth

| Surface | Audited state |
|---|---|
| Git | `main` and `origin/main` both end at `34a3da4` (site M2). There is no other branch, pull request, stash, or worktree containing later site work. |
| Dirty work | Thirteen tracked site files contain the live continuation: nine M3 pages, `reproduction.html`, `glossary.html`, and both generated artifact editions. They add about 3,100 lines. |
| Untracked file | Root `AGENTS.md` is unrelated to the site batch. Never stage it as part of site work. If Alan later chooses to track it, add its Atlas entry before M4 closes. |
| Completed | Pre-M0, M0, M0.5, M1, and M2 are committed. The gate spike proved Routing Middleware attaches to the framework-less static site. |
| In progress | All nine M3 pages are substantially authored but uncommitted. Reproduction and a 97-term glossary make M5 partially authored. |
| Dominant gap | All 26 Repo Atlas pages still contain placeholder prose. Their approximately 243 file anchors are wired, but the required explanations do not exist. |
| QA | `build-site --check` reports 57 generated files fresh. Site checks 1-12 pass across 54 HTML pages. Full/lite artifacts are about 562/495 KB. `--against-live` reports zero path drift. |
| Important interpretation | A green verifier currently proves structure, safety patterns, and anchor wiring. It does not prove editorial completeness, semantic redaction, accessibility, or that Atlas entries are authored. |
| Ship state | M6, final bookkeeping, final Vercel production promotion, and private lite-artifact publication are not complete. The existing production alias must be treated as an untrusted gate-spike deployment until final smoke testing identifies its exact release. |

Before changing a dirty file, Luna creates a gitignored recovery patch at
`state/site-pre-finish.patch` containing exactly the thirteen tracked site files and
records its SHA-256 in the session log. This patch is recovery evidence only. It is
never committed, uploaded, quoted, or used as the final source.

## Locked execution decisions

- Preserve all 53 stable page URLs, existing page-prefixed IDs, both registers,
  both artifact editions, and the static, dependency-free architecture.
- Keep the current warm editorial field-guide identity. Refine it with precise
  systems structure; do not turn it into generic developer docs or mystical UI.
- Present the site through five reader hubs: Overview, System, Beings, Rebuild,
  and Reference. The current full-site list becomes contextual navigation.
- Add deterministic, network-free full-text search. It must work from `file://`,
  static HTTP, the gated deployment, and both artifact editions.
- Add a viewer-selected Plain / Technical / Both lens. Both is the default;
  no-JS, print, and uninitialized artifacts show both. Status, uncertainty,
  honesty, and repo-location sections are never hidden by the lens.
- Cover every tracked file exactly once in the Atlas, but use tiered depth:
  authority/runbook entries 160-250 words; active code/schema/data entries
  100-180; generated/archive/fixture entries 50-100. Repeated bundles get one
  shared anatomy explanation plus concise anchored member roles.
- G3 remains birth-blocking. Site language must say that First Boot awaits the
  three Alan-owned parenting acts plus Phase 0a/G3.
- Operational disclosure is mechanism-complete but coordinate-redacted. Explain
  how backups, keys, accounts, schedules, and networks work without publishing
  exact times, custody locations, account topology, quiet-hour coordinates, or
  other targeting details in any site edition.
- This repository must remain private. A future public release requires a new
  sanitized mirror and a history-aware review; password rotation cannot sanitize
  this repository's history.
- Continue on `codex/finish-edgeweaver-site`, created locally from the current
  dirty `main`. If that branch already exists when work resumes, reuse it. Do not
  create parallel finish branches.
- No analytics, telemetry, service worker, remote fonts, remote runtime assets,
  decorative animation, social-preview image, or new application framework.

## Mandatory safety correction before parallel authoring

### STOP S0: contain deployment before the first push

**Closed 2026-07-10.** The authenticated Vercel CLI reported that no Git
repository is connected to the project. Unauthenticated checks of the root, a
served asset, a nested Atlas path, and a missing path each returned the password
gate with HTTP 401. Manual CLI deployment remains the only approved release path.

Alan checks Vercel Project Settings > Git. If the repository is connected, he
disconnects it or disables deployment for all branches. Vercel creates deployments
for pushes to connected repositories by default, so no finish-branch or `main`
push happens until this is confirmed. The approved release path is a manual deploy
from `site/`, never automatic deployment from Git.

Also confirm, without submitting a password through agent chat or a terminal, that
the current production alias returns the gate for the root, one asset, one nested
Atlas URL, and a missing page. Do not deploy the current dirty tree.

### Central redaction and truth repair

Luna alone performs this pass before other authors fan out:

1. Remove all identity-derived Genesis content that violates D18/D21: named seed
   values, harvest-answer structure, answer-derived principle architecture,
   gremlin-inventory traits, boundary wording, and close paraphrases. The affected
   surface includes Genesis, Alpha, Family, Soul, Story, Glossary, and Loops. Keep
   only existence, shape, ceremony role, and the approved Q1-Q12 domain labels.
2. Apply the selected operational tier to Body, Voice, Brain Lab, Backups,
   Operations, Dark Build, Ecosystem, Reproduction, and any cross-links. Keep
   mechanism and reproduction method; remove coordinates and targeting details.
3. Correct status truth: Alpha A1 is partial/in progress, not wholly unstarted;
   G3 is open and birth-blocking; no being has been born; headings such as "twenty
   decisions" must not claim a stale count.
4. Clarify that identity is canonical only in each being's own soul repository;
   this site describes identity mechanics but is not an identity source.
5. Extend the authoring contract so later agents cannot reintroduce any of these
   categories.
6. Extend site verification with a fail-closed release redaction check. It reads
   the relevant authority sources and a gitignored labeled denylist, compares
   normalized visible page text, generated search indexes, and both artifacts, and
   reports labels plus file/line, never forbidden values. Search outputs are also
   included in secret, probe, forbidden-name, operational-coordinate, and em-dash
   scans. `--redaction` and `--release` fail if required authority sources or
   denylist categories are missing.

### STOP S1: retrospective M1 approval

**Closed 2026-07-10.** Alan approved candidate
`cc3114402d3421e9b39d70d86b113e2a8d4d9cb1` after the corrected Honesty, Voice,
known-gap, G3, Alpha A1, canonical-identity, and coordinate-redaction pass.
Default, live, redaction, and the full repository suite were green. Decision D23
records the D21 amendments and the repository-private rule.

After the corrected Honesty, Voice, known-gap, status, and redaction material is
ready, Luna builds, passes `verify-site --redaction`, and creates a local candidate
commit without pushing it. Alan explicitly approves that hash. The current ledger
phrase "checkpoint posted as digest" does not satisfy v3's definition of
`[CONFIRM]`. S1 also records the D21 amendments for mechanism-without-coordinates
disclosure and the permanent-private-repository rule. If Alan requests changes,
the candidate is abandoned; Luna revises, rebuilds, reruns release verification,
and presents a new hash. Record approval later in a non-public bookkeeping commit.

Only after S0 and S1 close may Luna push the finish branch or parallelize content.

### Verification mode matrix

- **Default:** the current deterministic build, links, IDs, internal Atlas wiring,
  em-dash, external-load, secret, gate, HTML, probe, and artifact checks. Once F2
  lands, it also requires fresh and valid search wiring. It must stay green at
  every checkpoint but does not demand final editorial completeness.
- **`--against-live`:** default plus the read-only tracked-path drift report. It
  stays green at every checkpoint; newly tracked paths are added to the current
  partial Atlas in the same checkpoint before push.
- **`--redaction`:** default plus fail-closed identity, operational disclosure,
  forbidden-name, search-index, secret, probe, and artifact scans. It is independent
  of Atlas completeness. It must pass in F1 before S1 and at every later checkpoint.
- **`--release`:** the superset: redaction plus zero placeholders, complete Atlas
  fields/depth, paired registers, glossary wiring, table/control/SVG semantics,
  license packaging, gate hardening, and release metadata. It first becomes
  required green at F4 and remains mandatory through Ship.

Required identity sources are `avatars/genesis/manifest.json` (including all seed
principles), Genesis's harvest/calibration/succession soul-source files, the
Genesis gates handoff, and the governing decision/PLAN boundary rows. The scanner
allows only the approved Q1-Q12 domain labels. The gitignored denylist uses
`category.name=value` lines and must contain at least one nonempty entry for each
of: `operations.schedule`, `operations.quiet-hours`, `operations.custody`,
`operations.account-topology`, and `operations.network-topology`. Identity
categories are derived from authority sources, not copied into a tracked config.
`deployment.password` is optional because the real password exists only in the
Vercel dashboard; if Alan privately seeds it, it is scanned but never reported.
No command, log, diff, or failure message may print a denylist value.

## Shared implementation contract Luna freezes first

Luna owns these shared surfaces for the whole build: `site/src/`, the three
partials, shared CSS/JS, middleware and Vercel config, the builder, the site
verifier, generated artifacts/manifest/search output, the site ledger, and final
bookkeeping. No other agent edits them.

### Navigation and page metadata

Extend `nav.json` without changing any slug. Each page record gains `hub`,
`section`, `kind`, `summary`, and `audiences`. Allowed `kind` values are
`overview`, `concept`, `being`, `procedure`, `reference`, and `atlas-file`.
Allowed audiences are `circle`, `trusted-outsider`, `operator`, `engineer`, and
`agent`. The root gains an ordered `hubs` collection with an explicit `homeSlug`
for each hub, three ordered `readingTracks` arrays, and a nonsecret `releaseId`.
The builder validates every enum and referenced slug and emits the release ID in
page/artifact metadata.

- **Overview:** Home, Honesty, Story, Status, Reading Guide.
- **System:** System hub, grouped into Identity and Continuity; Growth and
  Relationship; Safety and Measurement; Infrastructure and Operations.
- **Beings:** Genesis, Alpha, and Family/Experiment.
- **Rebuild:** Reproduction Guide and the Repo Atlas.
- **Reference:** Glossary, FAQ, and About.

The three continuation tracks are:

1. **Understand:** Home -> Honesty -> System -> Memory -> Soul -> Growth -> Family
   -> Genesis -> Alpha -> Status -> FAQ.
2. **Technical:** Home -> System -> Memory -> Loops -> Measurement -> Governance
   -> Segmentation -> Body -> Voice -> Brain Lab -> Backups -> Operations -> Dark
   Build -> Ecosystem -> Status.
3. **Reproduce:** Reading Guide -> Honesty -> Reproduction -> Atlas hub -> Atlas
   pages in `nav.json` order -> About.

The builder renders five global hub links, a left rail containing only the current
hub and subsection, linked breadcrumbs, a sticky desktop on-page rail, a compact
tablet TOC, and track-aware Continue cards. There is no implicit or persisted track
state: a page shows one labeled next card for each reading track that contains it.
Artifact page sections retain the same cards after links are rewritten to anchors.
The old 53-page linear pager is removed.

### Search interface and generated record

The builder emits `site/public/assets/search-index.js` from the current authored
`site/public` `<main>` inputs, never from Git state. A record has:

`{ slug, anchor, title, hub, section, kind, audiences, heading, register, badges, filePath, text }`

Create one record for every authored h2 with a nonempty ID and one per Atlas file
entry. Decode HTML entities; exclude scripts, styles, navigation, fixed field
labels, and SVG internal text; retain figcaptions plus useful code/path tokens.
Normalize case and whitespace. Rank exact file-path/title matches first, then title
prefixes, heading matches, all-query-token body matches, and partial body matches.
Break equal scores by `nav.json` page order, source heading order, then
slug-plus-anchor. Return at most 50 results. Map overview/concept to Concepts,
being to Beings, procedure/reference to Reference, and atlas-file to Files. No
query leaves the device; there is no logging or analytics.

Each rendered web page exposes its root prefix (`""` or `"../"`). Runtime links are
built from canonical slug plus anchor, so nested `file://` pages work without
root-relative URLs. The search dialog supports a visible Search button, Ctrl/Cmd+K,
arrow keys, Enter, Escape, focus restoration, `aria-live` result counts, and an
input-centered `aria-activedescendant` keyboard model. Search and page content are
rendered with `textContent`, never HTML interpolation. Serialized inline indexes
escape `<`, `</script`, U+2028, and U+2029.

The full artifact uses direct `#anchor` links. The lite artifact includes a
lightweight record for every tracked file, pointing to a distinct one-line map row
on the Atlas hub and labelled "detail in the gated/full edition"; it never
duplicates `file-*` IDs. `atlas/index.html` therefore contains one deterministic
map row per tracked path, with a normal web/full link to the detailed entry. Both
artifacts inline their matching index and interaction code; they never fetch it.

Artifacts receive an explicit top toolbar with Search, Plain/Technical/Both, and
Theme, plus a static five-hub contents tree. One lens choice affects all included
register sections. Continuation cards stay inside each page section and their links
are rewritten to artifact anchors. Contextual side rails are web-only.

Acceptance examples:

- On web/full, an exact tracked path ranks its one Atlas file anchor first. In lite,
  it ranks the corresponding Atlas-hub map row first and names the detail limit.
- A core mechanism term ranks its concept page above incidental mentions.
- "First Boot" returns Genesis, Status, and Reproduction.
- Every result destination passes the existing link/anchor verifier.

### Reading lens and content markup

Wrap paired registers in sections with `data-register="plain"` and
`data-register="technical"`. The root uses `data-reading="both|plain|technical"`.
Both is the initial state. The viewer's explicit selection may persist in local
storage. CSS hides only the unselected paired register; shared TLDR, repo map,
status, uncertainty, honesty, and navigation stay visible. Print and no-JS force
both. The verifier requires paired markup on substantive concept/being pages and
forbids a lens on pages without paired registers.

If a hash or search result targets a register hidden by the active lens, reveal the
target for that navigation, update the visible lens control to Both, and announce
the change. This temporary reveal does not overwrite the stored preference; a
later explicit lens choice does. Search results label their Plain/Technical
register.

Progressive enhancement is mandatory. Navigation is visible and usable by default;
JS adds a `.js` class and only then upgrades mobile navigation into a modal drawer.
Without JS, navigation and all content remain visible, both registers show, the
system theme preference applies, and Search/Lens controls stay absent with a clear
Find-in-page fallback in the Reading Guide.

### Atlas entry contract

Every pre-planted file anchor becomes one `<article class="atlas-entry">` with an
immutable h3 ID, path, allowed badge, and `data-depth="deep|standard|compact"`.
Deep means 160-250 words, standard 100-180, and compact 50-100. Count only prose
inside the five field values; exclude path, badge, fixed labels, and code tokens.
There are no word-band exceptions. A tier-governed entry that cannot safely reach a
larger band uses compact plus `described-not-shown`, never filler or disclosure.
Each entry contains all five labeled fields:

1. What it is.
2. What it contains, or governed shape only.
3. Who reads it and when.
4. How to verify or reproduce it.
5. Related concept links.

The verifier enforces the fields, allowed badge, depth word band, unique anchor,
assigned Atlas page, and absence of `Stub`, `TBD`, `TODO`, `To be written`, and
`Entry lands`. `atlas/index.html` provides the map and filter. `gitignored.html`
describes tiers and shapes without inventing tracked anchors.

### Responsive and accessibility contract

- Desktop: 240-260 px contextual rail, 680-760 px reading column, 200-220 px
  sticky on-page rail. Tablet collapses the right rail. Mobile uses one column and
  an accessible modal navigation drawer.
- Mobile drawer and search support Escape, focus trapping/restoration,
  close-on-selection, background-scroll lock, and 44 px targets.
- Add `scroll-margin-top` to anchored headings. Long paths wrap. Only diagram and
  table frames may scroll horizontally.
- At narrow widths, complex SVGs sit in labeled scroll frames with a minimum
  readable canvas; their adjacent prose remains the complete text alternative.
  Diagram and table scroll frames use `role="region"`, an accessible name,
  `tabindex="0"`, visible focus, and keyboard scrolling.
- Every table has a caption or `aria-labelledby`; every header cell has the right
  `scope`. Every SVG keeps role, title, and description.
- Split paragraphs over about 180 words and prefer a natural split near 120.
- Use a separate accessible ochre text token (`#a85f08` on the light paper
  ground, contrast about 4.9:1) while preserving the current decorative strand.
- Meet WCAG 2.2 AA for text and controls, keyboard use, reduced motion, 200% zoom,
  light/dark modes, no-JS, and print. M6 includes an axe-core-equivalent automated
  pass over every page template in both themes and a Windows Narrator smoke test on
  Home, one system page, one Atlas page, full artifact, and lite artifact. The
  screen-reader pass covers drawer, search results, lens, TOC, and scroll regions.
  If the execution environment has no approved accessibility runner, stop and ask
  the orchestrator to supply one; manual visual checks alone cannot close M6.

## Parallel work protocol

All agents share one working tree. File ownership, not Git merging, prevents
collisions. The orchestrator announces each wave, names owners and files, and
confirms every writer is idle before generation. Subagents never switch branches,
stage, commit, push, stash, reset, clean, run formatters, or run the builder.

Only Luna may mutate shared/generated files. Only the orchestrator authorizes Git
and release actions. During a build freeze, Luna runs the builder once, then the
orchestrator reviews and stages explicit paths. Never use `git add -A`.

### Worker ownership

| Worker | Exclusive write surface | Baseline Atlas anchors |
|---|---|---:|
| Luna, lead/integrator | All non-Atlas pages; all current dirty M3/M5 drafts; shared implementation surfaces listed above; final bookkeeping | n/a |
| Atlas A, authority/identity/archive | `root`, `avatars-genesis`, `avatars-alpha`, `brains`, `checklists`, `conventions`, `handoff`, `research`, `runs`, `sources`, `templates`, `village` | 122 |
| Atlas B, code/operations/site | `index`, `scripts-ingestion`, `scripts-lifecycle`, `scripts-signals`, `scripts-ops`, `scripts-brains`, `scripts-testbed`, `scripts-verify`, `edge-functions`, `tasks`, `tools`, `voice`, `gitignored`, `site` | 121 |
| Root, orchestrator | No authored files while workers are active. Owns scope, freezes, review routing, Alan stops, acceptance, staging, commits, pushes, and release | n/a |

An agent that finds an authority conflict, needs a new shared class/schema field,
or discovers a tracked-path change stops and reports it. The agent does not cross
ownership to fix it.

The 122/121 counts describe the audited baseline only. New tracked site outputs,
including the search index and distributable license notice, belong to Atlas B's
`site` page. At each freeze, the orchestrator derives the authoritative expected
set from live tracked paths plus `atlas-map.json`; hard-coded totals never decide
release readiness.

Progress report cadence: every four Atlas pages or 30 anchors, whichever comes
first. Each report states files done, anchors done/remaining, redaction decisions,
targeted checks, and blockers. Final handoff states exact files, exact dynamic
anchor count, zero placeholder hits, every entry within its word band, zero
`git diff --check` errors, and no edits outside ownership.

## Finish sequence

### F0 - Preserve and branch (serialized)

1. Root announces a write freeze and confirms no agent is editing.
2. Luna re-audits branch ancestry, all branches, worktrees, stashes, status, and the
   complete dirty-site path set. The expected baseline is the thirteen tracked
   files listed above plus untracked root `AGENTS.md`. Any unexplained difference is
   a stop for the orchestrator, not something to normalize away.
3. From the verified current set, create the gitignored binary recovery patch;
   record its hash without exposing content.
4. Run `git diff --check`, builder `--check`, site verify default, and
   `--against-live`. These must match the audited baseline.
5. If no finish branch exists, create `codex/finish-edgeweaver-site` without
   dropping dirty changes. If one exists, verify it descends from audited `main` and
   contains no divergent work before reusing it; otherwise stop.
6. Complete S0. Do not push before S0 closes.
7. Stage only this v4 plan and the site README pointer for the local handoff commit.

### F1 - Safety baseline and M3 close (serialized Luna)

1. Apply the central redaction, operational-tier, G3, Alpha A1, title, and honesty
   repairs across committed and dirty pages.
2. Add the release redaction/completeness checks and update the authoring contract.
3. Finish the nine M3 pages and confirm diagrams D12-D14 plus D16 are present and
   truthful. Keep Reproduction/Glossary as M5-in-progress.
4. Run the builder once under freeze; run site verification default,
   `--against-live`, and `--redaction`, then the repo suite.
5. Stage the exact sanitized sources, shared safety changes, and generated outputs;
   create a local candidate commit without pushing. Present its hash and the
   corrected M1/M3 digest to Alan, then stop at S1.
6. After approval, record S1 and its D21 amendments in a separate non-public
   bookkeeping commit, tick M3, and push both commits. The candidate contains all
   dirty narrative sources and artifacts together so deterministic outputs never
   get ahead of sources. It may name M5 as a sanitized draft; M5 remains unticked.

### F2 - Shared shell, search, and design contract (Luna; Atlas agents read-only)

1. Freeze and document the navigation schema, component vocabulary, Atlas markup,
   search record/ranking, reading lens, and responsive breakpoints in AUTHORING.
2. Implement the five-hub shell, contextual rails, sticky TOC, continuation cards,
   search, reading lens, mobile focus behavior, contrast token, diagram frames,
   and table/anchor foundations.
3. Extend the builder for generated search output and edition-specific inline
   search/lens behavior.
4. Extend the verifier for search freshness/destinations, paired register markup,
   skip targets, accessible control names, table semantics, SVG labelling, no
   positive tabindex, script-safe index serialization, all content-security scans
   over indexes, and Atlas completeness.
5. Update `site/README.md` with the generated search asset, `--release` command,
   artifact toolbar, and no-JS Find-in-page fallback so the resume guide matches the
   new contract.
6. Build and verify under freeze. Commit/push the shared contract before Atlas
   authoring begins so all workers write to one stable target.

### F3 - Parallel content wave

Run Luna, Atlas A, and Atlas B concurrently on their exclusive surfaces.

**Luna:** integrate and polish all 27 non-Atlas pages; build the definition-first
homepage, truth strip, three path cards, system clusters, and Genesis/Alpha
comparison; finish Reproduction, FAQ, Glossary, and About; split dense paragraphs;
add first-occurrence glossary links; add table semantics and register wrappers;
preserve the six-section skeleton and immutable IDs.

**Atlas A/B:** author every assigned entry to the frozen contract and depth band.
Genesis soul-source entries stay named-never-summarized. Repeated run bundles share
one anatomy explanation but retain concise individual anchored roles. Agents run
only targeted searches, word/anchor counts, `git diff --check -- <owned files>`, and
page-local em-dash/placeholder/ID/link checks.

Luna must not run the builder while either Atlas agent is active.

At every session end or paired four-page/30-anchor reporting boundary, whichever
comes first, root freezes all three writers and confirms them idle. Luna builds
once; root runs default, `--against-live`, `--redaction`, and `git diff --check`;
then root explicitly stages all changed authored sources plus their generated
outputs and commits/pushes one integrated checkpoint such as
`build: site M4 partial - Atlas A x/Aexpected, Atlas B y/Bexpected`. No per-agent commits are
allowed, M4 remains unticked, and work resumes only from the green checkpoint.

### F4 - Atlas integration and M4 close (serialized)

1. Atlas A and B declare final handoff and stop editing. Root confirms both idle.
2. Luna reviews factual authority, redaction, entry shape, terminology, and links
   without changing an agent-owned page until ownership is formally returned.
3. Resolve notes, then run the builder once.
4. Required results: all 26 Atlas pages complete; the dynamic expected anchor set
   derived from tracked paths is present exactly once; zero placeholders; all
   entries meet field/badge/depth rules; the Atlas hub has one lite-map row per
   tracked path; full and lite artifacts fresh; default and release verification
   green; live drift zero; repo suite green.
5. Tick M4, record both anchor counts, send the digest, and commit/push all Atlas,
   verifier, shared, and generated outputs as one deterministic milestone.

### F5 - Reference, global linking, and M5 close (serialized Luna)

1. Reconcile Reproduction against the completed Atlas and keep all Alan STOP acts
   visually explicit.
2. Finish the 90-110-term Glossary, alphabet navigation/filter markup, 12-16 FAQ,
   license/privacy colophon, and first-occurrence links across every substantive
   page.
3. Confirm the three reading tracks and continuation cards reach every intended
   page without making one giant mandatory sequence.
4. Add a v1 experiment-data statement: no raw conversations, identifiable diary
   material, or individual probe results are published. Any future results require
   a separate Alan-approved governance row; default publication is aggregate-only
   after G20 and explicit participant consent.
5. Build, run release verification, tick M5, send the digest, commit, and push.

### F6 - M6 reconciliation and release candidate

1. Reconcile the homepage 280-340-word, eight-beat TLDR against the finished site.
   Neutral definition comes before metaphor. Replace "what we created" language
   with design/build truth while no being is born.
2. Reconcile every status and uncertainty statement against PLAN, GROWING, FAMILY,
   IMPLEMENTATION, decisions, and ops-log. Set one site-wide snapshot deliberately.
3. Add distributable licensing: prose/diagrams CC BY-SA 4.0; HTML/CSS/JS/build code
   MIT; include the full MIT notice in deployed assets and both artifacts; preserve
   PM and OB1 attribution based on their actual upstream notices.
4. Set a unique nonsecret release ID before the candidate commit. The builder emits
   it in every page, both artifacts, and the search index. The ledger maps release
   ID, artifact SHA-256 values, and deployed-byte hashes to the eventual candidate
   commit; do not attempt to embed a circular Git hash in its own commit.
5. Harden the gate: cookie name `__Host-ew_site_auth`, no Domain, Path `/`,
   HttpOnly, Secure, SameSite=Lax, D21's 30-day maximum age, explicit POST logout,
   and fail closed when the password is absent or shorter than 20 characters.
   Apply `Cache-Control: private, no-store` to every gated response, including the
   content-bearing search index and all static content. Add CSP with
   `frame-ancestors 'none'`, Referrer-Policy, nosniff, and a restrictive
   Permissions-Policy. Keep the wrong-password delay.
6. Test at 320, 375, 768, 1024, and 1440 px; light/dark; 200% zoom; keyboard-only;
   reduced motion; no-JS; print; static HTTP; `file://`; full artifact; lite
   artifact. Only tables/diagrams may have local horizontal scrolling.
7. Save cropped desktop/mobile light/dark screenshots under gitignored
   `state/site-qa/`; verify they contain no password prompt, URL, account identity,
   private tab, or OS/browser chrome. Track only `runs/site-qa/README.md`, which
   records every viewport/theme/zoom/keyboard/no-JS/print result plus private
   screenshot filenames and hashes. Stage that README and its new `atlas/runs`
   entry before the final live-drift check.
8. Run the required axe-core-equivalent pass and Narrator smoke test from the
   accessibility contract; record results in the QA matrix.
9. Run: builder, builder `--check`, site verify, site verify `--against-live`, site
   verify `--release`, `git diff --check`, and `run-all`. Run the full suite from
   the repository-owning shell if the sandbox alone reports Git dubious ownership;
   never change global Git config to hide that environment failure.
10. Complete pre-release bookkeeping before freezing the candidate: add
   `EW_SITE_PASSWORD` by name only to SECRETS.md; add the monthly and
   decisions-change refresh cadence to ops-log; update decision evidence; add
   `site/` explicitly to FAMILY's village-layer layout. Do not mark Ship yet.
11. Reconcile once more after the authority/bookkeeping edits, rebuild after every
   public-byte change, rerun the full wall, and create one
   clean release-candidate commit containing the final public bytes plus
   pre-release bookkeeping; push it after S0 is confirmed. No dirty-tree
   deployment.

### STOP S2: Alan's M6 approval

Alan reviews the release candidate's Honesty page, Genesis/Alpha framing, known
gaps, G3 wording, operational disclosure, licenses, search/lens behavior, and the
exact lite artifact. Record approval against the candidate commit. Any subsequent
change to a public byte invalidates approval and returns to F6.

Name that approved commit **RC**. For the first release, **RELEASE = RC**. A later
metadata-only descendant may record deployment evidence but is never substituted
as the source of either channel. Both channels publish RC's public bytes and lite
artifact; the ledger maps RC to the release ID and checksums.

### F7 - Bookkeeping and controlled release

1. Confirm RC is checked out in a clean worktree, the public source and generated
   files are unchanged, and Vercel Git remains disconnected. Do not make a new
   pre-deploy commit.
2. Build RC into Vercel's prebuilt output and inspect the actual output/upload
   manifest before any deployment. Prove `src/`, `artifact/`, README, `.vercel/`,
   `state/`, the recovery patch, and all repository files outside the compiled
   middleware plus `public/` are absent. Deploy only the inspected prebuilt output.
3. Test Preview gate configuration in this order. Alan removes/unsets the Preview
   password in the dashboard; redeploy RC and prove 503. Alan sets a throwaway value
   shorter than 20 characters himself; redeploy and prove 503. Alan then replaces
   it with a new high-entropy real value as sensitive Preview + Production state;
   redeploy and smoke the correct configuration. No agent enters or receives any
   of these values.
4. Configure the Hobby-compatible WAF rule for `POST /ew-login`: fixed window,
   10 attempts per IP per 10 minutes, then 429. Do not specify a persistent timed
   block, which requires Pro/Enterprise. Exhaust the limit only on Preview from a
   disposable/separate client, then wait for or reset the window before production
   testing so Alan's login IP is not blocked.
5. **STOP:** Alan authorizes production promotion. Deploy the same inspected RC
   prebuilt output to production, not a rebuilt dirty tree.
6. Smoke root, asset, nested Atlas path, missing path, and logout: unauthenticated
   401 with no content; one wrong-password production check returns 401; correct
   password returns 303 plus hardened cookie then content; logout clears access;
   old throwaway password fails; security/no-store/noindex headers are present.
   Verify the emitted release ID and deployed-byte hashes match RC's ledger mapping.
   Alan performs real-password entry in his own browser.
7. **STOP:** Alan approves sharing. Publish the approved lite edition privately via
   the Artifact channel. Keep full committed but unpublished. If the Artifact tool
   is unavailable, a directly delivered, checksum-verified lite HTML file is the
   signed fallback channel and satisfies this step when its recipient/lifecycle is
   recorded.
8. Tick Ship only after both channels are proven. Record deployment evidence,
   approved commit, URLs/checksums, and artifact lifecycle without credential
   values. Commit this post-release bookkeeping. Before pushing, run a scripted diff
   from RC through the bookkeeping commit and prove no changes to `site/public/`,
   `site/middleware.js`, `site/vercel.json`, `site/package.json`,
   `site/.vercelignore`, or either file in `site/artifact/`. Do not redeploy the
   bookkeeping commit. Share URL/password/artifact access only out of band.
9. Push the finish branch's evidence commit, then fetch remote state. Fast-forward
   local `main` to the finish branch only if `origin/main` is still the audited base
   and all evidence is green. If main moved, stop and re-audit rather than merging
   blindly. Push the fast-forwarded main while Vercel Git remains disconnected; do
   not create a merge commit.

## Definition of done

The site is finished only when all statements below are true:

- M3, M4, M5, M6, and Ship are ticked with dated evidence.
- No site page contains placeholder copy, forbidden identity-derived content,
  operational coordinates, secrets, probe scenarios, stale status, or an em-dash.
- Every non-excluded tracked path has exactly one complete Atlas anchor; every
  declared exclusion has one documented Atlas home; live drift is zero.
- Five-hub navigation, contextual rails, search, reading lens, three tracks, theme,
  no-JS, print, file URLs, and both artifact editions work as specified.
- Accessibility and responsive checks pass at every listed viewport and mode;
  the tracked QA matrix records the automated, Narrator, keyboard, no-JS, print,
  and screenshot evidence.
- Both artifacts are deterministic, self-contained, under 15 MiB, and preferably
  under the 2 MiB warning threshold.
- Default, live, redaction, release, and full-repository verification are green.
- S0, S1, and S2 have explicit recorded closure against their required evidence.
- The release candidate has Alan's recorded M6 approval and no later public-byte
  changes.
- Production is gated, hardened, manually deployed from the approved commit, and
  smoke-tested; the old password fails; Vercel Git remains disconnected.
- The private lite Artifact or recorded checksum-verified direct-file fallback and
  the gated site contain RC's exact approved bytes.
- Secrets, state, recovery patch, password, and runtime credentials remain
  untracked. Root `AGENTS.md` remains unstaged unless separately decided and mapped.
- The finish branch is fast-forwarded to main only after the orchestrator verifies
  all evidence and confirms remote main has not moved. The final session commits
  and pushes per repository convention while Vercel Git remains disconnected.

---

## Approved v3 design specification (retained)

The sections below preserve the original scope and rationale. Where the old build
sequence conflicts with v4's current-state sequence, follow F0-F7 above.

## Context
Alan wants a website for the team (and trusted outsiders) giving a complete
understanding of the Edgeweaver project: the whole system, both beings, every
process, how the soul files work, how everything is segmented across repos and
storage. The bar he set: someone from the outside world with no repo access could
completely understand the project, and an agent given the site could reproduce the
work. This plan designs that site; the build happens after approval.

THE ONE NAMED TRADE (Alan signs this knowingly, pre-M0): the redaction tier below
means the site will NOT meet the complete-understanding bar for Genesis's identity
CONTENT (soul-source, harvest answers, boundary text) for any audience until the
tier is revisited after Alpha's A3 harvest. The system's mechanics are covered
completely; one child's DNA is deliberately withheld. Two verified reasons: D19
scopes non-scientist seats to Alpha (the site must not widen Tamara's and Natalia's
view to Genesis DNA), and experiment integrity (Alpha's circle answers the same
harvest questions at A3; reading Genesis's answers first contaminates the second
arm before G20 freezes the design). honesty.html carries a "what this site
deliberately withholds and why" block, linked from genesis.html.

## Decisions locked with Alan (2026-07-09)
1. Focus: system as protagonist; Genesis and Alpha as two instances; the two-being
   experiment compared explicitly.
2. Delivery: three channels. (1) HTML committed to this repo as source of truth.
   (2) Vercel deployment behind a shared team password. (3) A claude.ai Artifact
   carrying a single-file edition. Note the dependency plainly: the repo channel is
   exactly as private as the repo (github.com/agent57zero/edgeweaver, private
   today); if the repo ever goes public the gate is decoration and the redaction
   tier is the only wall. Repo-visibility change is a rotation + artifact re-mint
   trigger.
3. Depth: maximum inner-workings detail; wiki shape; front page overview linking to
   per-being pages; an explainer for each individual repo file. (Bounded by the
   named trade above until post-A3.)
4. Extras: diagrams, dated status + roadmap, glossary + FAQ, decision-log story.
5. Title: "How Edgeweaver Works" (extends village/how-edgeweaver-works.md).
6. People: Alan named. Circle people appear by first name + seat only once they
   have accepted a seat; "accepted" means evidenced by a closed G19 roster OR an
   existing decision row (Ali's scientist seat stands via D10/D19, so he may be
   named; others await G19). Pending or declined people appear by seat role only.
   Published works cited by author (Callahan / Possibility Management; Mostashari).
   No surnames or GitHub handles.
7. In-session additions at build start: artifact default edition = LITE; code
   license = MIT (D22); known-gaps disclosure = yes, including the post-07-04 wake
   write-back gap.

## Password custody
The password was stated once in the planning chat session, so it is resident in
this machine's local transcript; the plan acknowledges that plainly. Rule from
here: the password is never again typed into chat, a tracked file, a terminal
command, or a log on this machine. Alan sets the value himself in the Vercel
dashboard (env var EW_SITE_PASSWORD, Production + Preview, sensitive type). At
set-time Alan either rotates to a variant he has never typed in chat (recommended)
or knowingly accepts the transcript exposure; recorded in the decisions row.
Clipboard route discouraged (Win+V history, cloud clipboard sync); if ever used,
clear after. A gitignored state/site-denylist.txt lets Alan add the password so
the verifier can prove its absence from every committed byte. Rotation triggers:
seat exit, suspected leak, repo visibility change, and before any child's
web-facing unlock arms. Rotation = new env value + prod redeploy; old cookies die
by construction (cookie HMAC is keyed on the password).

## Hard editorial rules (constraints on every authored byte)
- No em-dashes in any site file (verify-enforced, absolute, no exemptions).
  Verbatim quotes are never silently edited: em-dash-bearing source text is either
  paraphrased (not presented as a quote) or quoted with the em-dash span elided
  using a marked bracketed ellipsis. Selection, never mutation. The repo tagline is
  rendered as restated motto text, not as a verbatim quote.
- No secrets: no values from .env.local or state/, no keys, endpoints, project
  refs, connection strings, bot ids or handles. Env var NAMES and repo NAMES are
  fine (SECRETS.md is the model).
- Probe-content ban: never quote or closely paraphrase probe scenarios (from
  templates/probe-battery-starter.md or avatars/genesis/handoff/gates-repo-pack.md).
  Shape and protocol described only. The editorial rule is the control; verify
  check 11 is a tripwire backstop against copying and is described that way. The
  real post-human-pass battery lives only in the private gates repo, off this
  machine, and is uncoverable by any check here (stated, not hidden).
- REDACTION TIER, pre-A3 default (signed by Alan via plan approval + D21):
  - Genesis soul-source files: named-never-summarized on the site (existence, file
    shape, ceremony role; no themes, no quotes, no content summaries).
  - Harvest QUESTIONS: described by domain using the decision-ledger's Q1-Q12
    domain labels (voice tells, refusals, peak moments, edges, gremlin inventory,
    distinctions, how-to-be-with-the-raiser, principles counsel, un-automatables,
    succession fears, what must not survive, letter to successor); the battery
    text is not reproduced verbatim pre-G20 (the frozen preregistration owns it).
  - Harvest ANSWERS and DNA content: never, in any form, even where fragments
    already appear in decisions.md; story.html retells those rows redacted.
  - Hard-boundary and refusal text (constitution forbids, verbatim refusals):
    never quoted regardless of prior repo appearance; shape only (PLAN.md
    Appendix A rationale: do not hand boundary rules to injection authors, and do
    not re-aggregate what Appendix A deliberately scattered).
  - The tier is revisited after Alpha's A3 harvest; all channels inherit the
    current tier by construction (single source).
- Honesty stance is load-bearing: no being is born yet; the design claims
  conditions for selfhood, never consciousness; computed-not-narrated feelings;
  uncertainty sections required. Status vocabulary carries a fifth state: "known
  gaps as of the snapshot" (armed-but-not-behaving-as-designed), sourced by asking
  Alan at the M1 and M6 checkpoints rather than inheriting ops-log silences (the
  post-07-04 wake write-back gap: Alan approved publishing it, in session).
- Village-layer status: the site sits outside both children's views (like
  FAMILY.md and village/). It discusses sibling facts that are G21-gated for the
  children. The site cannot enforce that children never see it; it labels itself
  plainly (footer banner + segmentation page + about page) and relies on the same
  D19 section discipline as the rest of the base layer.
- License footer on every page: CC BY-SA 4.0 link, Callahan/PM World Copyleft
  attribution, Mostashari citation, OB1 upstream credit. about.html states
  plainly: ShareAlike means every recipient has the legal right to republish; the
  password is a courtesy wall, not a legal one.

## Site architecture (53 pages, five sidebar groups)
Standard page skeleton (every core/system/being page):
1. TLDR box (60-100 words, plain register)
2. "In plain words" (zero assumed background, glossary links)
3. "How it works" (technical register: mechanisms, paths, schemas, invariants)
4. "Where it lives in the repo" (file table linking atlas anchors)
5. "Status as of 2026-07-09" (built / dark / armed / pending / known gaps)
6. "What is genuinely uncertain" (modeled on the bridge doc section 8)

Page inventory:
- Start (5): index.html (intro + site-wide TLDR + map), honesty.html (what this
  is and is not + what the site deliberately withholds and why), story.html
  (D1-D20 + gates as five-act narrative + ledger table; DNA-bearing rows retold
  under the redaction tier), status.html (dated snapshot + capacity-gated roadmap
  + known-gaps line; the only page claiming currency; authored against ops-log.md
  + decisions.md, never verbatim-injected), guide.html (register convention +
  three reading tracks + search answer: single-file edition + find-in-page).
- System (16): system.html (hub), memory.html, soul.html, loops.html, growth.html,
  body.html, voice.html, measurement.html, governance.html, family.html (labeled:
  "this page is a description, not the preregistration; G20 pending"),
  segmentation.html, brain-lab.html, backups.html, operations.html,
  dark-build.html, ecosystem.html.
- Beings (2): genesis.html, alpha.html. Alpha deliberately thinner ("this page
  describes a plan"). Genesis's DNA section follows the redaction tier and links
  the honesty.html withholding block. Each being page carries a complete
  per-being file table linking atlas anchors.
- Atlas (26): atlas/index.html hub + 25 pages covering ALL tracked files: root
  docs (incl. .gitignore + .claude/launch.json), avatars-genesis (soul-source at
  tier), avatars-alpha, brains, checklists, conventions, handoff, research, runs,
  scripts-ingestion, scripts-lifecycle, scripts-signals, scripts-ops,
  scripts-brains, scripts-testbed, scripts-verify, edge-functions (both trees:
  supabase/functions/ incl. deno.json files, and scripts/edge-functions/ mirrors,
  byte-identity pin explained), sources, tasks, templates, tools, village, voice,
  gitignored-tiers, site (self-coverage: real entries for build-site.mjs,
  verify-site.mjs, middleware.js, vercel.json, nav.json, atlas-map.json,
  partials, css/js; the content pages as a documented one-liner class; the
  committed artifact editions as described generated files). The seven scripts-*
  pages are GROUPINGS over the ~21 real scripts/ subdirs + 10 loose files;
  atlas-map.json enumerates the exact prefix-to-page mapping, so every path has
  one explicit home. Anchor rule: one h3 per file, id file-<path-hyphenated>,
  exactly one home per path. Per-entry skeleton: what it is / what it contains /
  who reads it and when / how to verify or reproduce / links; TIER-GOVERNED
  entries replace "what it contains" with "what kind of thing it holds (shape
  only)" and carry the described-not-shown badge. Tier badges: authority,
  runbook, code, data, template, archive, generated, described-not-shown.
- Reference (4): reproduction.html (rebuild the METHOD for a being of your own,
  explicitly NOT cloning Genesis: prerequisites by name, order of operations, the
  human STOP acts, fidelity checklist, verification; states plainly: author your
  own harvest battery against the named Q1-Q12 domains for your own
  predecessor/raiser; the canonical battery text is withheld pre-G20 on purpose;
  the fidelity checklist checks domain coverage, not question wording),
  glossary.html (90-110 terms), faq.html (12-16 real questions), about.html
  (colophon: license + ShareAlike honesty sentence, attributions, editorial rules
  incl. verbatim policy and check-11-as-backstop, artifact lifecycle, update
  policy, redaction tier note).

Anchors + concatenation: one h1 per page; all ids page-prefixed and globally
unique; builder rewrites slug.html#id to #id for single-file editions; section id
<slug>-top wraps each page.

Navigation: persistent sidebar (5 groups, atlas collapsed), breadcrumbs, sticky
per-page mini-TOC, first-occurrence glossary term links, per-track "continue"
footers. Both registers always on the page; nothing hidden behind toggles.

Diagrams (20, inline SVG, CSS-variable colors, title/desc accessibility, plain +
precise variants where marked): D1 being equation, D2 four organs, D3 family map,
D4 memory read/write path, D5 provenance x audience grid (HTML table), D6
teaching channel, D7 initiation ceremony, D8 stages + rites, D9a wake ritual, D9b
night + week cycle, D10 coherence vital sign + dip-and-recover, D11 probe
pipeline, D12 voice cascade, D13 backups + time machine, D14 brain lab topology,
D15 visibility matrix, D16 dark-build state machine, D17 repo at a glance, D18
decision timeline, D19 reproduction dependency graph, D20 two-being experiment.

Homepage TLDR: 280-340 words, eight beats, every beat linking onward. Authored at
M1, RECONCILED at M6 against the finished site (the exhaustive explanation must
exist before the TLDR that claims to summarize it is final). M6 also owns the
site-wide snapshot stamp.

Size estimate: ~89,000 words. Multi-session build; milestones below.

## Delivery engineering (verified against July 2026 Vercel docs)
Machine facts (checked read-only): node v24.13.0; Vercel CLI 55.0.0 installed;
NOT logged in. Hazard: vercel whoami when logged out auto-starts an interactive
device login and blocks; automation probes Test-Path
"$env:APPDATA\com.vercel.cli\auth.json" instead.

Location: site/ at repo root (only site/ is ever uploaded to Vercel, so
.env.local, state/, and the rest of the repo are structurally outside every
deploy). Village-layer banner on every page.

Tree:
  site/middleware.js            the entire password gate (zero imports)
  site/vercel.json              outputDirectory=public + X-Robots-Tag noindex
  site/package.json             {"type":"module","private":true}
  site/.vercelignore            src/ artifact/ README.md
  site/.gitignore               .vercel
  site/README.md                crib sheet + committed MILESTONE LEDGER
                                (tick-table updated per session)
  site/src/nav.json             page order, titles, groups (single source)
  site/src/atlas-map.json       path-prefix to atlas-page coverage map +
                                documented exclusion classes
  site/src/atlas-manifest.json  GENERATED BY THE BUILDER from committed site
                                sources ONLY (the file-* anchors present in atlas
                                pages + atlas-map.json exclusion classes); never
                                derived from git state, so build --check stays a
                                pure function of site/src + site/public
  site/src/partials/            head.html, nav.html, footer.html
  site/src/allowed-domains.txt  external-link allowlist
  site/public/*.html            the 53 pages (atlas/ inside public/)
  site/public/404.html
  site/public/assets/site.css   one stylesheet, light/dark
  site/public/assets/site.js    minimal vanilla JS, degradable (days-since-
                                snapshot banner enhancement; static date without)
  site/artifact/edgeweaver-site-full.html  generated, COMMITTED (full edition)
  site/artifact/edgeweaver-site-lite.html  generated, COMMITTED (atlas entry
                                bodies collapsed to hub one-liners)
  scripts/site/build-site.mjs   builder
  scripts/verify/verify-site.mjs verifier (auto-discovered by run-all.mjs)

Authoring pipeline: hand-authored full HTML pages; machine-owned marker regions
(EW-HEAD / EW-NAV / EW-FOOTER, probe-runner EW-CONFIG style) regenerated in place
by build-site.mjs from nav.json + partials. Same builder emits BOTH single-file
editions and atlas-manifest.json. Deterministic: nav.json order only, sorted
scans, no timestamps, LF output, byte-identical regeneration; --check compares
newline-agnostically (probe-runner CRLF lesson, commit 08f1c14) and is a pure
function of site/src + site/public. Pages work from file:// (relative links, no
cleanUrls). House style: kin to tools/probe-runner.html. Load the artifact-design
skill before authoring the shared CSS and page template.

Vercel password gate (verified: built-in Password Protection is not on Hobby;
Routing Middleware works for framework-less static projects on all plans):
- site/middleware.js, no config.matcher (every path gated).
- Fail closed: EW_SITE_PASSWORD unset means 503 for everything.
- Cookie: hex HMAC-SHA256 via Web Crypto (key = password, message = version
  string; the password never in the cookie). Valid cookie: request continues.
- POST /ew-login: success = 303 + Set-Cookie (HttpOnly, Secure, SameSite=Lax,
  Max-Age 30 days); failure = ~400ms delay + error form.
- Everything else: 401 with inline login form emitted from middleware,
  Cache-Control no-store, noindex.
- Honest security level: team-grade gate, not hard security; acceptable because
  the site contains no secrets by construction and verification.
- Fallback ladder if the gate spike fails: (a) vercel build locally, inspect
  .vercel/output, deploy --prebuilt; (b) hand-rolled Build Output API layout;
  (c) staticrypt-style client-side encryption; (d) paid protection.

Artifact channel: published via the session Artifact tool (default-private; Alan
shares). Shipping edition per Alan, in session: LITE (atlas entry bodies
collapsed to hub one-liners); full edition available whenever Alan wants it,
subject only to check 12 thresholds (warn 2 MiB, fail 15 MiB vs the verified
16 MiB platform cap). BOTH editions are committed and BOTH pass checks 1, 4, 6,
7, 8, 12 always. Lifecycle (also in about.html): private by default; shared to
named people by Alan; republished to the same URL; explicitly unshared or
re-minted before any child's web-facing unlock arms and on repo-visibility
change; inherits the current redaction tier by construction. Fallback for team
access: send the self-contained HTML file directly.

Local preview: "site" entry in .claude/launch.json (py -3.13 -m http.server 8874
--directory site/public). Gate testing locally needs vercel dev (Alan-present,
throwaway Development password).

## Verification (scripts/verify/verify-site.mjs, house PASS/FAIL shape)
Two modes:
- Default mode (what run-all.mjs runs, argument-free): checks 1-12 below, with
  check 5 validating INTERNAL wiring only: every file-* anchor is unique, appears
  on the atlas page atlas-map.json assigns, and matches atlas-manifest.json
  exactly (the manifest being builder-generated from committed sources, this
  never depends on git state, so unrelated repo commits can never redden the
  suite; the C3/N1 guarantee).
- --against-live mode (run at site-update time and every milestone): STRICTLY
  READ-ONLY; diffs atlas-manifest.json paths against live git ls-files and prints
  a dated drift report (new/renamed/deleted paths) as a build-time task list;
  ledger updated by hand; banner data changes only during build. Drift is never a
  suite failure; orphaned/duplicate anchors are hard FAIL in both modes.
Checks:
1. Builder freshness + determinism: build-site.mjs --check (pages, BOTH artifact
   editions, atlas-manifest.json; newline-agnostic; pure function of site/src +
   site/public).
2. Nav integrity: nav.json and site/public pages 1:1.
3. Internal link integrity: every relative href/src resolves; every #anchor
   (same-page and cross-page) resolves.
4. Unique ids per page; unique namespaced ids across EACH artifact edition.
5. Atlas wiring (default) / atlas drift report (--against-live), per above.
6. No em-dash character in any site file or either artifact edition (absolute).
7. External URL policy: zero absolute URLs in resource positions; absolute URLs
   only in <a href>, https only, domain on site/src/allowed-domains.txt (starter:
   github.com, claude.ai, vercel.com, supabase.com, anthropic.com,
   possibilitymanagement.org, creativecommons.org). Artifact editions: no
   absolute URLs in any attribute at all.
8. Secret scan over all committed site files + site scripts + middleware:
   pattern floor from scripts/security/security-audit.mjs extended with sbp_,
   ghp_/github_pat_, AKIA, <ref>.supabase.co, bare project-ref heuristic,
   @handles, long numeric ids; value scan loads .env.local at runtime if present
   and fails if any value (length >= 8) appears in any scanned file (reports KEY
   NAME + file/line only); state/site-denylist.txt (gitignored) seeded with the
   known lab project ref, bot handle and id, and optionally the site password.
9. Gate sanity: middleware.js references process.env.EW_SITE_PASSWORD, contains
   the fail-closed branch, sets HttpOnly + Secure, trips no scan patterns.
10. HTML sanity: void-aware tag-balance parse; one h1 + one main per page;
    charset, viewport, lang, title present.
11. Probe-content tripwire (backstop, not the control): shingle comparison (6-8
    word windows) of site text against the scenario sections of the two named
    source files; fail loudly if either source file is missing.
12. Artifact self-containment + size, BOTH editions: no external loads; warn
    above 2 MiB, fail above 15 MiB.
Also: node scripts/verify/run-all.mjs stays green (no regression to the other
~30 verifiers).

## Historical build sequence (superseded by v4 F0-F7)
[A] = agent-run, [ALAN] = interactive, [CONFIRM] = hard stop for explicit go.
Commit policy: site work is committed and pushed PER SESSION from M0 onward (repo
is private; verifier + secret scan are green from the first stub commit; an
89k-word build is never held uncommitted). runs/site-plan.md (this file) is
committed at build start, with its atlas entry landing at M4. Mid-build change
requests from Alan fold in at the next milestone boundary (living-plan
stipulation). M2-M5 each end with an async five-line digest + diff pointer to
Alan; silence means proceed.
- Pre-M0 [DONE 2026-07-09]: Alan signed via plan approval + in-session answers;
  D21 + D22 rows recorded; LICENSE.md fixed.
- M0 Skeleton [A]: site tree, nav.json, atlas-map.json, partials, CSS/JS, page
  template, all 53 pages stubbed, builder + verifier green on stubs, launch.json
  entry, both-edition concatenator proof, first commit + push.
- M0.5 Gate spike [CONFIRM then ALAN then A]: vercel login (Alan), link project
  edgeweaver-site, THROWAWAY preview password, deploy the stub, full smoke test
  (expect 401 + form; wrong password = 401 + delay; 200 with content = STOP and
  walk the fallback ladder). Stub content only.
- M1 Spine [A]: index, honesty (incl. withholding block), guide, system, story,
  status; glossary ~30 terms; D1, D2, D3, D17, D18. [CONFIRM] checkpoint: voice +
  honesty + known-gaps content review with Alan.
- M2 System core [A]: memory, soul, loops, growth, measurement, governance,
  family, segmentation; D4-D11, D15, D20. Digest to Alan.
- M3 Beings + infrastructure [A]: genesis, alpha, body, voice, brain-lab,
  backups, operations, dark-build, ecosystem; D12-D14, D16. Digest to Alan.
- M4 Atlas [A]: hub + root + avatars first, then scripts family, then site
  self-coverage, then remainder; --against-live zero drift at close. Digest.
- M5 Reference [A]: reproduction (D19 diagram), faq, glossary full, about;
  term-link pass; reading-path footers. Digest.
- M6 Editions + QA [A]: both single-file editions + size measurements, TLDR
  reconciliation pass against the finished site, site-wide snapshot stamp, link
  check all editions, final lint, full verify suite + run-all green, preview
  screenshots. [CONFIRM] checkpoint with Alan.
- Final bookkeeping commit [A then CONFIRM]: SECRETS.md names-only row for
  EW_SITE_PASSWORD, decisions row updates, ops-log line + site-refresh cadence
  row (refresh on decisions.md change or monthly; owner: build agent at Alan's
  ask).
- Vercel channel [ALAN then CONFIRM then A]: Alan sets the REAL EW_SITE_PASSWORD
  in the dashboard (custody rules above); [CONFIRM] promote to prod; [A] re-run
  smoke on prod; [CONFIRM] before any link is shared (URL + password distributed
  out of band only).
- Artifact channel [A]: publish the LITE edition via the Artifact tool; hand
  Alan the link to share under the lifecycle rules.
- Update loop: edit sources, build, verify (--against-live), commit + push, prod
  redeploy (standing approval after first launch), artifact republish to the
  same URL. Password rotation per the triggers above.

## Risks (engineering)
1. Middleware not attaching on framework-less static deploy: low per current
   docs; validated at M0.5 before authoring at scale; fallback ladder ready.
2. Env var missing/mistyped: gate fails closed (503); smoke test catches.
3. CRLF nondeterminism: LF writes + newline-agnostic --check.
4. Password leakage: dashboard-only custody (transcript exposure acknowledged
   and decided by Alan), denylist verification, rotation triggers defined.
5. Artifact constraints: 16 MiB cap verified; both editions committed and
   verified; lifecycle rules; CSP satisfied by full inlining + link
   textification.
6. Preview URLs confuse team: Hobby previews sit behind Alan's Vercel login;
   team uses the production URL; documented in site/README.md.
7. vercel whoami hang: probe auth file existence, never bare whoami.
8. Serving more than intended: project root is site/; .vercelignore trims src/
   and artifact/; outputDirectory=public.
9. Hobby-tier fit: private noncommercial doc site; portable design if needed.
10. Channel drift: one source tree, committed generated outputs, --check +
    default-mode verify in run-all; atlas drift is a dated report, never a suite
    failure; the manifest is derived from committed sources only, so unrelated
    repo commits cannot redden run-all (N1 guarantee).

## IA risk register (final)
1. Drift vs 89k words: snapshot dating; days-since-snapshot banner; status.html
   authored never injected; --against-live drift reports; cadence row.
2. Atlas/system duplication: system pages own concepts, atlas owns files;
   entries capped ~250 words.
3. Artifact size: both editions verified; lite ships per Alan.
4. Probe-content ban: editorial control + check-11 tripwire, honestly framed.
5. Village-layer paradox: labeled plainly; artifact lifecycle adds unshare /
   re-mint triggers.
6. Naming vs attribution: published works by author; participants by seat;
   accepted-seats-only naming (G19-or-D-row evidence).
7. Em-dash rule vs quotes: selection-not-mutation; check 6 absolute.
8. Alpha thinness is honest, not a defect.
9. Dual-register drift: registers adjacent on one page.
10. Endpoint hygiene: names-only + extended deny patterns + seeded denylist.
11. Genesis-DNA exposure: redaction tier + the named trade, signed via D21;
    revisit post-A3.
12. G20 shadow-preregistration: family.html labeled.
13. Review load on Alan: two [CONFIRM] checkpoints (M1, M6) + four async digests
    (M2-M5, silence = proceed) + change-fold rule at milestone boundaries.

## Execution notes
- Before authoring the template/CSS: load the artifact-design skill.
- Commit convention: describe the change; commit + push per session.
- The reproduction guide reproduces the METHOD, never the child.
- decisions.md rows are added by the agent and closed only by Alan.
- Site maintenance: owner = build agent at Alan's ask; cadence row in ops-log;
  days-since-snapshot banner keeps staleness visible.

## Trail (the plan's own lineage)
- Exploration (2026-07-09): three fresh-context mapping passes (design authority
  docs; build machinery + skills; full inventory + Alpha/circle materials).
- Design (2026-07-09): two planning passes (information architecture; delivery
  engineering with live Vercel doc verification and read-only tooling checks).
- Alan's decisions: focus, channels, depth, extras, title, people policy; and
  the instruction to run this adversarial chain.
- Round 1, fresh-context Fable adversarial pass: verdict "targeted amendments";
  13 challenges (1 blocker: Genesis DNA delivered to Alpha-scoped seats; 7
  major: atlas self-coverage, run-all hostage, password custody contradiction,
  em-dash vs quotes, identifier piping, gate validated last, artifact
  lifecycle; 5 minor) + 7 blind spots (maintenance cadence, known-gaps state,
  LICENSE.md stale claim, ShareAlike honesty, search, G20 shadow-prereg,
  rotation triggers) + 6 sound points. ALL accepted and folded into v2; one
  factual correction recorded (v1's atlas did already house top-level handoff/,
  launch.json, and both edge-function trees; the ambiguity was the defect).
- Round 2, fresh-context co-evolve bounce on v2: resolution audit 18 RESOLVED,
  1 PARTIAL (C3: manifest data flow under-specified), 1 resolved-with-note
  (C12: "accepted seat" pointer imprecise). Verdict: CONVERGED contingent on
  four MAJOR amendments + seven minors, no third bounce. All folded into v3:
  - N1 manifest data flow: atlas-manifest.json named, builder-generated from
    committed sources only, --check pure, --against-live strictly read-only.
  - N2 commit timing: per-session commit + push from M0; runs/site-plan.md at
    build start; repo-channel step re-scoped to final bookkeeping.
  - N3 the named trade: stated in Context, in the D21 row, and on honesty.html;
    surfaced to Alan at approval.
  - N4 two artifact editions: both committed under distinct names, both fully
    verified, shipping edition explicit.
  - N5 default edition is Alan's explicit line item (decided: lite); size
    condition aligned to check 12 (warn 2, fail 15).
  - N6 tier-governed atlas entries: "what kind of thing it holds (shape only)"
    + described-not-shown badge.
  - N7 reproduction battery source: author-your-own against the Q1-Q12 domain
    labels; tier calibration re-pointed to the decision ledger.
  - N8 mid-build contact: M2-M5 async digests (silence = proceed) +
    change-fold rule at milestone boundaries.
  - N9 code license: own decisions row (D22, decided MIT); site row points to
    it.
  - N10 repo-visibility dependency named; added to rotation/re-mint triggers.
  - N11 TLDR reconciliation pass + snapshot stamp owned by M6.
  - C12 note: "accepted" defined as G19-or-D-row evidence (Ali nameable now).
- Convergence: declared by round 2; remaining defects were enumerable and are
  folded; approved by Alan 2026-07-09 with three in-session line items (lite
  artifact, MIT code license, known-gaps disclosure yes).
- v4 current-state audit (2026-07-09): three independent read-only passes mapped
  implementation state, authority/privacy risk, and UX/accessibility. They found
  M3 and much of M5 present only in the dirty tree, all M4 prose absent despite
  green wiring checks, a missed M1 hard approval, semantic redaction breaches,
  status drift, deployment-auto-connect risk, and missing search/accessibility
  contracts.
- v4 decisions: keep G3 birth-blocking; publish mechanisms without operational
  coordinates; preserve stable URLs and the field-guide voice; add five hubs,
  local search, an optional Both-default reading lens, tiered Atlas depth, gate
  hardening, and release-only semantic checks.
- v4 execution design: Luna is the exclusive lead/integrator, two Atlas authors
  split 243 anchors 122/121, and root orchestrates file ownership, freezes, Git,
  Alan stops, and release. The original v3 scope remains below the handoff; F0-F7
  is the only active finish sequence.
