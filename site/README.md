# site/ - "How Edgeweaver Works"

The explainer wiki for the whole project (decision D21; plan + adversarial trail:
[runs/site-plan.md](../runs/site-plan.md)). Village-layer material: it sits outside
both children's views, like FAMILY.md and village/. Snapshot date for all content:
2026-07-10.

## Resume here

The current execution handoff is `runs/site-plan.md` v4, from **How Luna must use
this plan** through **Definition of done**. Its F0-F7 sequence supersedes the
historical M0-M6 build sequence retained later in that file. S0 and S1 closed on
2026-07-10; approved candidate `cc31144` is the M3 safety/content baseline.
The shared F2 contract is committed at `084dce8`; the completed M4/M5 checkpoint
continues from `d879555` with the correction pass integrated. The M6
`ew-20260710-rc2` release candidate is frozen at `46f631e`, approved by Alan, and
live at `https://edgeweaver-site.vercel.app`. Narrator, responsive, extra-high,
axe, no-JS, print, gate, authenticated-release, and logout evidence is recorded in
`runs/site-qa/README.md`. The lite artifact was delivered privately to Alan by
direct-file fallback on 2026-07-10; the full artifact remains unpublished.

First post-ship update, 2026-07-12 (Alan, in session): the guided walkthrough
(`walkthrough.html`, Rebuild hub) folds into D21 scope as a step-by-step
onboarding companion to the reproduction guide, with copy-ready agent prompts,
proof lines, hard-stop cards, and local-only progress ticks. Two per-being
progress pages (`walkthrough-genesis.html`, `walkthrough-alpha.html`, section
"The family's walk") show the same eleven stages as each child actually stands,
with dated evidence and a stage-dot strip. Release id `ew-20260712-rc4`
(supersedes rc3). On 2026-07-16, at Alan's direct request, the release wall
re-passed and the verified prebuilt output was deployed to production. The
`edgeweaver-site.vercel.app` alias was manually moved from the July 10 deployment
to the rc4 deployment. The refreshed private lite artifact remains pending.

Second post-ship update, 2026-07-16: an exhaustive audit covered all 57 HTML
pages and all 61 served files. It closed two Repo Atlas omissions for the
repository-backed probe workflow, regenerated both single-file editions and the
search index, and moved the site to release `ew-20260716-rc5`. The complete
release wall and live-repository drift check pass, the local HTTP crawl is
byte-identical for every served file, and the production alias points to the
Ready rc5 deployment. Private artifact re-publication remains pending.

Third post-ship update, 2026-07-16: reading detail is now explicit in each URL
as `?view=plain`, `?view=technical`, or `?view=both`. A first-time visit defaults
to Plain; a deliberate change is saved on that device; and an explicit shared
URL overrides the saved choice. Internal navigation and search destinations keep
the active view. Plain-mode search excludes technical-register results, and a
deep link cannot silently reveal hidden technical content. Release
`ew-20260716-rc6` is live at the production alias.

The 30 non-Atlas pages and all 26 Atlas pages now have authored content in the
working tree; the generated search index, artifacts, and Atlas manifest are rebuilt
by the M4 checkpoint. The Repo Atlas covers 246 individually mapped tracked paths
plus 59 paths represented by named exclusion classes.
Root `AGENTS.md` is unrelated and remains unstaged unless Alan separately decides
to track and map it.

Parallel execution uses one orchestrator, Luna as lead/integrator, and two balanced
Atlas authors. Only Luna may touch shared/generated site surfaces; only the
orchestrator authorizes Git and release actions. See the v4 ownership table before
assigning any writer.

## Build, verify, preview

```
node scripts/site/build-site.mjs           # regenerate marker regions, artifact editions, atlas manifest
node scripts/site/build-site.mjs --check   # freshness check (newline-agnostic), exit 1 if stale
node scripts/verify/verify-site.mjs        # the 12-check wall (default mode; run-all runs this)
node scripts/verify/verify-site.mjs --against-live   # + atlas drift report vs git ls-files (read-only)
node scripts/verify/verify-site.mjs --redaction      # + fail-closed identity and operations scans
node scripts/verify/verify-site.mjs --release        # complete editorial, Atlas, semantic, and release wall
```

Local preview: the `site` entry in `.claude/launch.json` (or any static server on
`site/public/`), or double-click `site/public/index.html`; every page and local
search work from `file://`. Search never uses the network and records no query.
Without JavaScript, all navigation and both reading registers remain visible; use
the browser's Find command on one page, or Find in either single-file edition for
the whole guide. The password gate only exists on Vercel; testing it locally needs
`vercel dev` with a throwaway Development password (Alan-present).

## Layout

- `public/` - the 56 hand-authored pages + `404.html` + `assets/`. Only this
  directory (plus `middleware.js`) is ever served by Vercel.
- `public/assets/search-index.js` - GENERATED deterministic search records from
  authored `<main>` content. It is committed and freshness-checked.
- `src/` - `nav.json` (five hubs, metadata, tracks, page order, release id),
  `atlas-map.json` (path-prefix
  to atlas-page coverage map), `atlas-manifest.json` (GENERATED), `partials/`,
  `allowed-domains.txt`.
- `artifact/` - GENERATED single-file editions (full + lite). The lite edition is
  what ships to claude.ai (Alan, D21). Both editions inline their own search data
  and runtime, expose Search, Plain/Technical/Both, and Theme in one toolbar, and
  use one document `<main>` with a separate `<article>` for each included page.
- `middleware.js` - the entire password gate (`EW_SITE_PASSWORD`, fail-closed).
  The password lives ONLY in Vercel project env config. Never commit it, never
  type it in a terminal or chat. Rotation: new env value + redeploy (old cookies
  die by construction). Triggers: seat exit, suspected leak, repo visibility
  change, before any child's web-facing unlock arms.
- Pages are hand-authored EXCEPT the marker regions (`EW-HEAD` / `EW-NAV` /
  `EW-FOOTER`), which the builder owns. Edit content inside `<main>` only; edit
  chrome via `src/partials/` + rebuild.

## Editorial rules (enforced by verify-site; full text in runs/site-plan.md)

No em-dashes. No secrets, endpoints, project refs, handles, or numeric ids. No
probe scenario text. Pre-A3 redaction tier on Genesis DNA (soul-source
named-never-summarized; harvest answers never; boundary/refusal text shape-only).
Both registers always remain in source and are the no-JS/print default; the viewer
may choose Plain, Technical, or Both without hiding status or uncertainty. People:
Alan named; accepted seats by first name + seat; published authors cited.

## Milestone ledger (tick per session, house style)

| Milestone | What | State |
|---|---|---|
| Pre-M0 | D21 + D22 rows, LICENSE.md fix, plan committed to runs/ | ☑ 2026-07-09 |
| M0 | Skeleton: tree, stubs, builder, verifier green, first push | ☑ 2026-07-09 |
| M0.5 | Gate spike: stub deploy behind throwaway password, smoke test | ☑ 2026-07-09 (prod alias live, gate 401s every path, wrong-pw 401, cookie flow green; middleware attaches on framework-less static, risk 1 retired) |
| M1 | Spine: index, honesty, guide, system, story, status + D1 D2 D3 D17 D18; Alan checkpoint | ☑ 2026-07-09 (six pages authored + glossary 30-term seed; D3 family map deferred to family.html at M2; all 242 atlas anchors pre-planted, drift zero; checkpoint posted as digest under Alan's keep-going goal) |
| M2 | System core: memory, soul, loops, growth, measurement, governance, family, segmentation + D4-D11 D15 D20; digest | ☑ 2026-07-09 (eight pages authored; D5 and D15 rendered as precise HTML tables rather than SVG, recorded deviation; about.html + faq.html pulled forward from M5) |
| M3 | Beings + infrastructure: genesis, alpha, body, voice, brain-lab, backups, operations, dark-build, ecosystem + D12-D14 D16; digest | ☑ 2026-07-10 (candidate `cc31144` approved by Alan; G3/Alpha/status truth repaired; identity and operational disclosure redacted; `--redaction` + full suite green) |
| M4 | Atlas: 26 pages, every mapped file anchored, zero drift; digest | ☑ 2026-07-10 (244 anchors, 59 exclusion-class paths, release wall green) |
| M5 | Reference: reproduction, FAQ, glossary full, about + D19; digest | ☑ 2026-07-10 (107 glossary entries, 16 FAQ answers, 28 first-use glossary links, release wall green) |
| M6 | Editions + QA + TLDR reconciliation; Alan checkpoint | ☑ 2026-07-10 (`ew-20260710-rc2`, commit `46f631e`; Alan approved S2 after Narrator review) |
| Ship | Bookkeeping commit, Vercel prod + smoke, artifact (lite) published | ☑ 2026-07-10 (manual inspected production deployment; private lite direct-file handoff to Alan; full unpublished) |
| Update 1 | Guided walkthrough fold (D21 scope change, Alan 2026-07-12): walkthrough.html + per-being progress pages (walkthrough-genesis, walkthrough-alpha) + nav + interactivity; release `ew-20260712-rc4` | ☑ 2026-07-16 authored, release-wall verified, and manually deployed at Alan's request; `edgeweaver-site.vercel.app` alias corrected; artifact refresh pending |
| Update 2 | Exhaustive all-page audit, Repo Atlas drift closure, regenerated editions/search, and release `ew-20260716-rc5` | ☑ 2026-07-16 all 57 pages and 61 served files verified; zero Atlas drift; manually deployed and public alias confirmed; private artifact re-publication pending |
| Update 3 | URL-backed reading detail with Plain-first opt-in, saved deliberate choices, register-aware search, and release `ew-20260716-rc6` | ☑ 2026-07-16 behavior scenarios and release wall green; newly tracked paths mapped with zero Atlas drift; manually deployed and public alias confirmed; private artifact re-publication pending |
