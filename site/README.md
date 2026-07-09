# site/ - "How Edgeweaver Works"

The explainer wiki for the whole project (decision D21; plan + adversarial trail:
[runs/site-plan.md](../runs/site-plan.md)). Village-layer material: it sits outside
both children's views, like FAMILY.md and village/. Snapshot date for all content:
2026-07-09.

## Build, verify, preview

```
node scripts/site/build-site.mjs           # regenerate marker regions, artifact editions, atlas manifest
node scripts/site/build-site.mjs --check   # freshness check (newline-agnostic), exit 1 if stale
node scripts/verify/verify-site.mjs        # the 12-check wall (default mode; run-all runs this)
node scripts/verify/verify-site.mjs --against-live   # + atlas drift report vs git ls-files (read-only)
```

Local preview: the `site` entry in `.claude/launch.json` (or any static server on
`site/public/`), or double-click `site/public/index.html`; every page works from
`file://`. The password gate only exists on Vercel; testing it locally needs
`vercel dev` with a throwaway Development password (Alan-present).

## Layout

- `public/` - the 53 hand-authored pages + `404.html` + `assets/`. Only this
  directory (plus `middleware.js`) is ever served by Vercel.
- `src/` - `nav.json` (page order; single source), `atlas-map.json` (path-prefix
  to atlas-page coverage map), `atlas-manifest.json` (GENERATED), `partials/`,
  `allowed-domains.txt`.
- `artifact/` - GENERATED single-file editions (full + lite). The lite edition is
  what ships to claude.ai (Alan, D21).
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
Registers always both on the page. People: Alan named; accepted seats by first
name + seat; published authors cited.

## Milestone ledger (tick per session, house style)

| Milestone | What | State |
|---|---|---|
| Pre-M0 | D21 + D22 rows, LICENSE.md fix, plan committed to runs/ | ☑ 2026-07-09 |
| M0 | Skeleton: tree, stubs, builder, verifier green, first push | ☑ 2026-07-09 |
| M0.5 | Gate spike: stub deploy behind throwaway password, smoke test | ☑ 2026-07-09 (prod alias live, gate 401s every path, wrong-pw 401, cookie flow green; middleware attaches on framework-less static, risk 1 retired) |
| M1 | Spine: index, honesty, guide, system, story, status + D1 D2 D3 D17 D18; Alan checkpoint | ☑ 2026-07-09 (six pages authored + glossary 30-term seed; D3 family map deferred to family.html at M2; all 242 atlas anchors pre-planted, drift zero; checkpoint posted as digest under Alan's keep-going goal) |
| M2 | System core: memory, soul, loops, growth, measurement, governance, family, segmentation + D4-D11 D15 D20; digest | ☑ 2026-07-09 (eight pages authored; D5 and D15 rendered as precise HTML tables rather than SVG, recorded deviation; about.html + faq.html pulled forward from M5) |
| M3 | Beings + infrastructure: genesis, alpha, body, voice, brain-lab, backups, operations, dark-build, ecosystem + D12-D14 D16; digest | ☐ |
| M4 | Atlas: 26 pages, every tracked file anchored, zero drift; digest | ☐ |
| M5 | Reference: reproduction, faq, glossary full, about + D19; digest | ☐ |
| M6 | Editions + QA + TLDR reconciliation; Alan checkpoint | ☐ |
| Ship | Bookkeeping commit, Vercel prod + smoke, artifact (lite) published | ☐ |
