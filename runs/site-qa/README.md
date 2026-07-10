# Site QA matrix

Candidate under test: `ew-20260710-rc1`, with the final candidate commit recorded
at the release freeze. The public site was served from a local static
HTTP server; no password, account, or private endpoint was used.

## Release ledger

- Release ID: `ew-20260710-rc1`
- Candidate commit: recorded at the release freeze (S2 approval is still pending)
- Full artifact SHA-256: `541CC8E9206939AA2AE22394C54A7AFDBF9BEAB81B8E2315D20890D2024E4120`
- Lite artifact SHA-256: `FEA2085B5590E0A191E1673775ABA8360F11891DAE50577249449B59DDFD9304`
- Public-byte manifest SHA-256 (58 sorted `site/public/` paths): `941F9524F20E38CDC20F03A62CB3C0E25F8ECCD64C3BBD793A59347BF7F7CF84`
- Deployed-byte hashes: not applicable until the inspected RC is manually promoted under F7.

## Automated and browser checks

- Builder, default, live-drift, redaction, release, and the 29-script repository
  suite were green before this QA pass.
- axe-core 4.12.1 ran in a same-origin local wrapper over overview, concept,
  being, Atlas, 404, full artifact, and lite artifact templates in light and dark
  themes: zero hard violations. The only incomplete review items were the dynamic
  `aria-controls` reference and SVG/CSS-variable contrast calculations; the
  rendered controls and frame labels were checked in the browser snapshots.
- 2560x1440 extra-high desktop: no horizontal overflow; contextual rail, 760 px
  reading column, and 210 px on-page rail rendered as designed.
- 200 percent equivalent at 1280 CSS px: no horizontal overflow and readable
  navigation, content, controls, and diagram scroll frame.
- Responsive widths 320, 375, 768, 1024, and 1440: no horizontal overflow.
- At 320 px, the JavaScript drawer opened as a modal, locked background scrolling,
  exposed a close control, and closed on Escape with focus restoration behavior.
- Search returned two exact build-script destinations for
  `scripts/site/build-site.mjs`; artifact search returned 37 results for `waking`.
  Plain, Technical, Both, and dark-theme controls changed their visible state.
- Full and lite artifacts each had one main landmark, the expected toolbar, local
  search behavior, and no extra-high horizontal overflow. Full contained 246 Atlas
  entries; lite contained the one-line mapped destinations.
- No-JS sandbox checks on Home, System, and the full artifact showed no `.js` class,
  hidden Search/Lens/Menu enhancements, and both registers visible where paired.
- Headless Edge print checks produced valid PDFs: Home 130,397 bytes and 4 pages,
  System 194,561 bytes and 8 pages, full artifact 4,723,386 bytes and 274 pages.

## Screenshot evidence

Screenshots are cropped viewport captures in ignored `state/site-qa/`:

| Capture | SHA-256 |
|---|---|
| `extra-high-index-light.png` | `2E7DDB05B87CAF179E1D847B073B3C2FF0E0A76C061E82E1F44D9124FEC16858` |
| `extra-high-index-dark.png` | `9BF9E20641817934E37827744A3076B3D7B725788632FEA7B5DF5854DD1D5318` |
| `zoom200-index-light.png` | `46BA8FD135398028B7C9D6207FE07921A086CE35F65311B1959C16F290FE4D59` |
| `zoom200-index-dark.png` | `5900919CC8E383BEFE7F0D49407D0C0C5263B4EA0C29596554A102A116D9DD09` |
| `mobile-index-light.png` | `39C111E3E285A382040EA1AD1CBBFED9E73C8CF845A5AC346B60F761CDC66196` |
| `mobile-index-dark.png` | `1B30BBEC326FE29DC818B252EA9E94581D21B0193BD51CA9ABF15128AF1AC268` |

## Remaining human evidence

- Static HTTP, no-JS, print, and gate-header checks are recorded above. Direct
  `file://` navigation was blocked by the browser QA policy, so local HTTP was used
  for the same static bytes and the artifacts.
- Windows Narrator smoke testing on Home, one system page, one Atlas page, and
  both artifacts is Alan-facing evidence and remains part of the S2 review.
