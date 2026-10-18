# FREE

A quiet focus timer for one thing at a time. FREE is a one-page React and TypeScript application with a finished static export in `dist/`.

The brief supplied the name **FREE** without a product category or existing assets. The implemented product is a personal focus workspace: a 25-minute timer, optional intention, adjustable breaks, locally generated ambient sounds, and a summary of completed focus sessions for the local calendar day.

## Install and run

Use Node.js 22.18 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. For the production version:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` replaces `dist/`. Serve that directory with any static HTTP server. Vite uses `base: './'`; scripts, styles, fonts, favicon, and share image resolve relative to the export, including when it is hosted under a gateway subpath. There are no application routes requiring a server rewrite. Opening `index.html` using `file://` is not a supported preview method because browsers restrict module loading there.

The supplied export is ready to serve. No API, account, RPC, private credentials, or environment file is needed. Fonts and visual assets are included locally. Publishing is outside this implementation.

## Using the workspace

- Choose Focus, Short break, or Long break, then start the timer. Pause, resume, and reset are available in the timer itself. Choosing another mode resets the current timer.
- Enter an optional intention and use its check control to mark it complete. Editing the intention clears that completion mark.
- Timer settings accepts whole numbers from 1 to 180 minutes and controls the completion chime. Saving settings resets the current timer.
- Select Rain, Ocean, or Brown noise to play a synthesized soundscape. Selecting the active sound again, or choosing Quiet, stops it. The volume slider affects ambience; the chime is controlled separately in settings.
- Completed focus sessions contribute to today's session count and focus minutes. Breaks and abandoned timers do not. Session completion never starts another timer without your action.

State is stored under `free-focus-v1` in browser local storage: intention, completion mark, durations, chime preference, timer state, and the latest 500 completed focus sessions. A running timer stores its deadline and catches up after a reload or background suspension. Sound starts only after a gesture and is intentionally quiet again after reload. Use one workspace tab at a time; simultaneous tabs do not merge their progress. Clearing site storage removes saved progress. If storage is blocked, the timer still works and the footer explains that progress lasts only for the page's lifetime.

Keep the page open for the completion chime. A sleeping device, browser suspension, or autoplay policy can delay or silence it. The visual timer catches up on return. This is a personal focus aid, not an alarm guaranteed to run while the browser is closed.

## Interaction validation

On a machine with Playwright's browser system libraries available:

```sh
npx playwright install chromium webkit
npm run build
npm run validate
```

The bounded validation script serves the actual export under `/preview/`, launches its browsers, performs the interactions, writes results and screenshots under `artifacts/`, and closes its server and browsers. It uses a simulated clock instead of waiting through a full focus session. Unavailable engines are explicitly recorded and never counted as passes.

The share card is already supplied in `public/share.png` and `dist/share.png`. To regenerate it after changing the branding, run `node scripts/share-card.mjs` with Chromium installed, then rebuild.

## Actual validation results

Final checks ran on 2026-10-18 against the delivered source and export. Dependencies and browsers were installed in temporary directories outside the repository; the build directory held exact copies of this source, manifest, and lockfile. The finished export was copied back without retaining obsolete hashed assets.

| Command/check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, TypeScript 7.0.2, exit 0 |
| `npm test` | 8 tests passed, 0 failed, exit 0 |
| `npm run build` | Passed, Vite 8.3.4, exit 0; 20 modules transformed |
| `npm run validate` | 13 Chromium checks passed; WebKit unavailable, explicitly recorded |
| Axe scans in default, settings, guide, and active-audio states | 0 violations for the selected WCAG A/AA tags |
| Pinned `taste.mjs --out test/scratch/taste --offline` | 16/16 checks passed on the final export |
| Responsive checks | No horizontal overflow at 320, 390, 624, 744, 834, 1120, and 1440 CSS pixels; longest timer and 200% root text enlargement also checked |
| Static subpath and offline-service checks | `/preview/` works; 0 external runtime requests, 0 failed resources, 0 console errors |

At 390 × 844, the complete primary button ends at y=529 CSS pixels. The title, product description, timer, and Start focus action are visible on the first screen. All 15 controls measured in the default phone view meet the 44-pixel comfortable target size. The production export is approximately 391 KiB, and the full delivered file payload is under 2 MiB before compression, within the 8 MiB assignment limit.

WebKit could not launch because its host system libraries were missing. Safari and physical iPhone behavior remain unverified. Native browser zoom, a manual screen-reader session, actual headphone listening, and localization beyond an RTL layout check were not performed. The browser connector could not reach the shell preview or access the checkout; rendered checks and screenshots instead came from local Playwright Chromium, including the pinned probe. These are worker-side checks, not an independent certification.

See [DESIGN.md](DESIGN.md) for the final design system and [artifacts/validation.md](artifacts/validation.md) for six-domain coverage, findings, fixes, and evidence. Machine-readable results are in [interaction-results.json](artifacts/interaction-results.json) and [taste-results.json](artifacts/taste-results.json). No dependency trees, package caches, registry mirrors, dependency archives, or submodules are included; no ignore file was created or changed.

## Source map

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Workspace, settings, guide, persistence, and interaction orchestration |
| `src/lib/focus.ts` | Timer transitions, restoration validation, formatting, and daily totals |
| `src/lib/audio.ts` | Procedural ambient sound and gentle completion chime |
| `src/components/QuietRoom.tsx` | Original vector room illustration |
| `src/components/Icon.tsx` | Original shared SVG icon set |
| `src/styles.css` | Tokens, typography, components, and responsive behavior |
| `tests/focus.test.ts` | Deadline, persistence, pause, completion, and invalid-data tests |
| `scripts/validate.mjs` | Production interaction and accessibility checks |
| `scripts/preview-server.mjs` | Subpath preview owned by the validation process |
| `scripts/share-card.mjs` | Reproducible PNG share-card generator |
| `public/` | Source runtime assets and font licenses |
| `dist/` | Finished static export |

Third-party attribution and design-guide credits are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
