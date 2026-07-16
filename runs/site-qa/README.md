# Site QA matrix

Candidate under test: `ew-20260710-rc2`, frozen at commit
`46f631e4dfa9452c59f37cc8adafbe6c2e2d1c32`. Alan approved S2 on
2026-07-10 after completing the Narrator review. Browser evidence below includes
both the local static candidate and the manually promoted production deployment.

## Release ledger

- Release ID: `ew-20260710-rc2`
- Candidate commit: `46f631e4dfa9452c59f37cc8adafbe6c2e2d1c32`
- Full artifact SHA-256: `94074E723D6A881939D8D92A42CB5A9D7DDFA761803BE11E1720BA16A31EE9CB`
- Lite artifact SHA-256: `E98C432C49677F85C6CB1795332BA6AD7F41D0C27A2A15357636A53729FDEF0F`
- Public-byte manifest SHA-256: `B5E3BA3F2CA78C056A69213B831BED160E5921A6153225F970C18006F46284A9`.
  This is SHA-256 over 58 ordinally sorted `relative/path<TAB>UPPERCASE_FILE_SHA256`
  rows, UTF-8 encoded, LF-separated, with a final LF.
- Final production deployment: `dpl_6AQGarn5uenhD6bwcnfVesQW9UnS` at
  `https://how-edgeweaver-works-xk75g43d1-alan-shurafas-projects.vercel.app`,
  assigned to `https://edgeweaver-site.vercel.app`.
- Deployed-byte proof: all 58 static output files matched the frozen candidate
  file-for-file; middleware source and bundle both had SHA-256
  `81885E2DA0B8C0D534511131B1905F512DD6B1C7DA8E82D4C5D9F7A10DA18D77`.

## Update 1 release evidence (2026-07-16)

- Root cause of the walkthrough 404: `edgeweaver-site.vercel.app` was still a
  manual alias to the 2026-07-10 deployment. The walkthrough and both per-being
  progress pages were added afterward in commits `43af54a` and `a3910f0`.
- `build-site --check` reported 61 generated files fresh. The complete
  `verify-site --release` wall passed across 57 pages.
- A fresh Vercel prebuilt output contained 61 static files, including
  `walkthrough.html`, `walkthrough-genesis.html`, and `walkthrough-alpha.html`,
  plus the middleware function. Boundary inspection found no `src/`, `artifact/`,
  `state/`, README, `.env.local`, or `.gitignore` content in the static output.
- Production deployment `dpl_2kEXEA5KxLHfKGf57HrzMehWUMbB` reached Ready, and
  `edgeweaver-site.vercel.app` was explicitly reassigned to it. CLI inspection
  had proved that the alias previously resolved to the July 10 deployment.
- Unauthenticated smoke checks for the root, walkthrough route, and a missing
  route returned the expected password-gate 401 with `private, no-store` before
  and after deployment. The protected-page password smoke was not rerun because
  password custody remains with Alan; exact walkthrough inclusion was verified in the
  deployed prebuilt output and the final alias assignment succeeded.
- The private lite artifact refresh remains pending.

## Automated and browser checks

- Builder, default, live-drift, redaction, release, and the 29-script repository
  suite were green at the candidate freeze.
- axe-core 4.12.1 ran in a same-origin local wrapper over overview, concept,
  being, Atlas, 404, full artifact, and lite artifact templates in light and dark
  themes: zero hard violations. The only incomplete review items were the dynamic
  `aria-controls` reference and SVG/CSS-variable contrast calculations; the
  rendered controls and frame labels were checked in the browser snapshots.
- 2560x1440 extra-high desktop: no horizontal overflow; contextual rail, 760 px
  reading column, and 210 px on-page rail rendered as designed.
- 200 percent equivalent at 1280 CSS px: no horizontal overflow and readable
  navigation, content, controls, and diagram scroll frame.
- Responsive widths 320, 375, 768, 1024, and 1440: no horizontal overflow. The
  first rc2 pass found the 320 px header controls overflowing; the final candidate
  wraps the controls and passed the repeated matrix.
- At 320 px, the JavaScript drawer opened as a modal, locked background scrolling,
  exposed a close control, and closed on Escape with focus restoration behavior.
- Search returned two exact build-script destinations for
  `scripts/site/build-site.mjs`; full/lite artifact search returned 44/36 results
  for `waking`.
  Plain, Technical, Both, and dark-theme controls changed their visible state.
- Full and lite artifacts each had one main landmark, the expected toolbar, local
  search behavior, and no extra-high horizontal overflow. Full contained 53 page
  articles including the complete Atlas; lite contained 28 page/map articles.
- No-JS sandbox checks on Home, System, and the full artifact showed no `.js` class,
  hidden Search/Lens/Menu enhancements, and both registers visible where paired.
- Headless Edge print checks produced tagged, script-free PDFs: Home 126,120 bytes
  and 4 pages, System 189,901 bytes and 8 pages, full artifact 4,719,683 bytes and
  276 pages. Poppler renders of all Home/System pages plus representative full-edition
  pages exposed and then verified the fix for a clipped homepage diagram.
- Vercel Firewall is enabled with one active, valid rule: `POST /ew-login`, fixed
  600-second window, 10 requests per IP, default 429 rate-limit action, and no
  persistent timed block. The active API config is version 1 with no draft changes.
- Final unauthenticated production smoke checks returned 401 with no-store and
  noindex behavior for the root, a static asset, a nested Atlas page, a missing
  route, and the logout route; no protected content leaked. An invented wrong
  password returned 401 after the intended delay, set no cookie, and exposed no
  protected content. The rotated production password authenticated successfully,
  the protected Soul page showed release marker `ew-20260710-rc2`, logout cleared
  access, and a direct protected-page revisit returned to the password gate.
- Standard Protection intercepted preview deployments, so the final preview
  missing/short-sequence and firewall-exhaustion exercises were not run.
  Production fail-closed behavior had already been observed during the earlier
  failed deployment and rollback. The rate-limit exhaustion test was also omitted
  to avoid blocking Alan's IP; the active rule was verified through its API config.
- Private artifact handoff used the checksum-verified direct-file fallback on
  2026-07-10: the lite edition was delivered only to Alan with SHA-256
  `E98C432C49677F85C6CB1795332BA6AD7F41D0C27A2A15357636A53729FDEF0F`.
  D21's private sharing and re-mint/unshare lifecycle applies. The full edition
  remains unpublished.

## Screenshot evidence

Screenshots are cropped viewport captures in ignored `state/site-qa/`:

| Capture | SHA-256 |
|---|---|
| `rc2-extra-high-index-light.png` | `5BE115B081DCEF68E48FE213666A70AC370741BA7EC733F3599265BE9065C6FB` |
| `rc2-extra-high-index-dark.png` | `62DC998A60D71DA0A267052CCBD2B66B054997998BB51DCD23F712489B427A76` |
| `rc2-mobile-index-light.png` | `04A321F4D485F1F9500FADB8A9443A926F295D4B5F1394699D433F54192F15B8` |
| `rc2-mobile-index-dark.png` | `4A091BBEC421E1AA131EB5FC06B8BA5FFAF6EFD2B6DFF9F24F28AB84AE9CDDAE` |

## Human evidence and residual constraints

- Static HTTP, no-JS, print, and gate-header checks are recorded above. Direct
  `file://` navigation was blocked by the browser QA policy, so local HTTP was used
  for the same static bytes and the artifacts.
- Alan completed the Windows Narrator smoke review on Home, one system page, one
  Atlas page, and both artifacts before approving S2. There is no remaining launch
  blocker; the preview and rate-limit exercise constraints are disclosed above.
