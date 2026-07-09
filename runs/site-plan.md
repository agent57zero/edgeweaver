# The site plan: "How Edgeweaver Works" (approved, with adversarial trail)

> Lineage record, per the house convention that plans carry their revision trail.
> Produced 2026-07-09 in session with Alan: three exploration passes, two design
> passes, a fresh-context Fable adversarial pass (round 1), and a co-evolve bounce
> (round 2, declared convergence). Approved by Alan 2026-07-09. Decision row: D21
> (site) and D22 (code license) in decisions.md. The build ledger lives in
> site/README.md. This file is the plan as approved; if practice diverges, the
> divergence gets recorded, not hidden (living-plan stipulation).

Version: v3, FINAL. Converged after a fresh-context Fable adversarial pass (round 1)
and a co-evolve bounce (round 2), per Alan's instruction and the project's own
witnessed-revision method. Full trail at the end. Snapshot date for all site
content: 2026-07-09.

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

## Build sequence
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
