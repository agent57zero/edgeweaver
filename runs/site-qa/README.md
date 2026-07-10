# Site QA matrix

Candidate under test: `ew-20260710-rc2`, with the final candidate commit recorded
at the release freeze. The public site was served from a local static
HTTP server; no password, account, or private endpoint was used.

## Release ledger

- Release ID: `ew-20260710-rc2`
- Candidate commit: recorded at the release freeze (S2 approval is still pending)
- Full artifact SHA-256: `94074E723D6A881939D8D92A42CB5A9D7DDFA761803BE11E1720BA16A31EE9CB`
- Lite artifact SHA-256: `E98C432C49677F85C6CB1795332BA6AD7F41D0C27A2A15357636A53729FDEF0F`
- Public-byte manifest SHA-256 (58 sorted path + file-SHA rows): `B5E3BA3F2CA78C056A69213B831BED160E5921A6153225F970C18006F46284A9`
- Deployed-byte hashes: not applicable until the inspected RC is manually promoted under F7.

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

## Screenshot evidence

Screenshots are cropped viewport captures in ignored `state/site-qa/`:

| Capture | SHA-256 |
|---|---|
| `rc2-extra-high-index-light.png` | `5BE115B081DCEF68E48FE213666A70AC370741BA7EC733F3599265BE9065C6FB` |
| `rc2-extra-high-index-dark.png` | `62DC998A60D71DA0A267052CCBD2B66B054997998BB51DCD23F712489B427A76` |
| `rc2-mobile-index-light.png` | `04A321F4D485F1F9500FADB8A9443A926F295D4B5F1394699D433F54192F15B8` |
| `rc2-mobile-index-dark.png` | `4A091BBEC421E1AA131EB5FC06B8BA5FFAF6EFD2B6DFF9F24F28AB84AE9CDDAE` |

## Remaining human evidence

- Static HTTP, no-JS, print, and gate-header checks are recorded above. Direct
  `file://` navigation was blocked by the browser QA policy, so local HTTP was used
  for the same static bytes and the artifacts.
- Windows Narrator smoke testing on Home, one system page, one Atlas page, and
  both artifacts is Alan-facing evidence and remains part of the S2 review.
