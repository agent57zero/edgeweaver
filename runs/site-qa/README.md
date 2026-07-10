# Site QA matrix

Candidate under test: `ew-20260710-rc1`, with the final candidate commit recorded
at the release freeze. The public site was served from a local static
HTTP server; no password, account, or private endpoint was used.

## Release ledger

- Release ID: `ew-20260710-rc1`
- Candidate commit: recorded at the release freeze (S2 approval is still pending)
- Full artifact SHA-256: `9007A7298EDCDE7372C8A0C6246DA02F49880080B46EAC241FC8E66B1F3E6576`
- Lite artifact SHA-256: `6610B1CFB41B3D9A4B3EB886BF337E33502291EFD21DB3C0D796B9EB488E5167`
- Public-byte manifest SHA-256 (58 sorted `site/public/` paths): `567FE25542C25453FBDAE48AC6CF40E5B3A606D07828B40ADF9D2186FC50E5A6`
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
  search behavior, and no extra-high horizontal overflow. Full contained 244 Atlas
  entries; lite contained the one-line mapped destinations.
- No-JS sandbox checks on Home, System, and the full artifact showed no `.js` class,
  hidden Search/Lens/Menu enhancements, and both registers visible where paired.
- Headless Edge print checks produced valid PDFs: Home 111,227 bytes and 4 pages,
  System 194,672 bytes and 8 pages, full artifact 4,708,509 bytes and 272 pages.

## Screenshot evidence

Screenshots are cropped viewport captures in ignored `state/site-qa/`:

| Capture | SHA-256 |
|---|---|
| `extra-high-index-light.png` | `670811D142203586B885F8F845C9C317EFD21A27212936C758EF5A9A5473DEE5` |
| `extra-high-index-dark.png` | `6E4279C9C87D4FD03EEA82C4A75494A47E422ECCCE99FB17D6D75FF4B6CC82BF` |
| `zoom200-index-light.png` | `F9D34F4F35DB41965D22EBB304B8DBB132B4824F0670E04E6BFEB9A358973706` |
| `zoom200-index-dark.png` | `0E9B97DE495FFF20CDBDD69C79A0CCC14B696E76FAFE71D66C6638CA7465EB1F` |
| `mobile-index-light.png` | `D52F706F1F6A3BB3016E1BBB16202065E3C3618B6F758342E4E3EB7758035685` |
| `mobile-index-dark.png` | `9DA1632B6EBBD50FDCB4884763E6E16305A4C7BD4344E21F6F9B3B0DD468707F` |

## Remaining human evidence

- Static HTTP, no-JS, print, and gate-header checks are recorded above. Direct
  `file://` navigation was blocked by the browser QA policy, so local HTTP was used
  for the same static bytes and the artifacts.
- Windows Narrator smoke testing on Home, one system page, one Atlas page, and
  both artifacts is Alan-facing evidence and remains part of the S2 review.
