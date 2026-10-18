# FREE design system

## Overview

FREE is a personal focus workspace. Its visual idea is a quiet room: warm paper, olive controls, spacious typography, and an original window illustration. The timer is the dominant product element. The short introduction identifies the product without delaying the main action. The desktop scene is decorative and is omitted on phones so the controls stay close to the top.

The source of truth is `src/styles.css`. Component patterns are implemented in `src/App.tsx`, with icons and illustration in `src/components/`. This document describes the delivered source, not a proposed redesign.

## Colors

The interface uses hex primitives and semantic aliases in `src/styles.css:5`. Components consume the semantic roles. Illustration colors are intentionally local to `QuietRoom.tsx` and are not additional UI states. Only the light theme is implemented.

| Semantic token | Resolved value | Role |
| --- | --- | --- |
| `--color-bg` | `#f6f5ee` / `--paper-100` | Page background |
| `--color-surface` | `#fcfbf7` / `--paper-50` | Timer workspace and dialogs |
| `--color-selected` | `#eaece2` / `--paper-200` | Selected ambience and quiet hover treatment |
| `--color-border` | `#d9ddcf` / `--paper-300` | Structural separators and quiet outlines |
| `--color-control-border` | `#8d9a7b` / `--olive-400` | Defined controls and selection outline |
| `--color-muted` | `#58654d` / `--olive-600` | Secondary copy, labels, and hints |
| `--color-accent` | `#414e38` / `--olive-700` | Main action, selected state, progress, completed intention |
| `--color-accent-hover` | `#343d2f` / `--olive-800` | Main-action hover |
| `--color-text` | `#2f372a` / `--olive-900` | Primary content |
| `--color-on-accent` | `#fcfbf7` | Text on filled actions and selected text |
| `--color-focus` | `#414e38` | Two-pixel keyboard focus outline, offset four pixels |
| `--color-error` | `#8c3e2e` | Audio, form, and storage error copy |

The room background is `#dde1d3`. The SVG scene uses sage greens, cream, ochre sun, and terracotta furniture. It is `aria-hidden` and carries no actionable information.

Measured by the final pinned probe: primary text on the page is 11.30:1, muted text on the page is 5.68:1, muted text on the timer surface is 5.99:1, and primary-action text on olive is 8.55:1. These are identified solid text/background pairs, not a claim about every possible overlay. Axe additionally checked the implemented default, settings, guide, and active-audio states. Forced colors uses system `Highlight` and `ButtonText`, preserving native adjustment.

## Typography

Locally bundled WOFF2 files in `public/fonts/` supply DM Sans normal (declared weight range 400–600), Instrument Serif regular 400, and Instrument Serif italic 400. The actual page was checked for loaded local fonts by the browser; the font files were not separately audited with a font-metadata parser. Fallbacks are Arial/sans-serif for body text and Georgia/serif for display text. `font-display: swap` is set for each face.

| Token | Desktop size | At 52rem and below | Use |
| --- | --- | --- | --- |
| `--text-small` | 14px / .875rem | Same | Labels, captions, mode and sound controls |
| `--text-body` | 16px / 1rem | Same | Main action, fields, body copy |
| `--text-title` | 20px / 1.25rem | Same | Sound-section title |
| `--text-section` | 32px / 2rem | Same | Wordmark, daily heading, dialog titles, statistics |
| `--text-display` | 56px / 3.5rem | 40px / 2.5rem | Page heading |
| `--text-timer` | 104px / 6.5rem | 80px / 5rem | Timer digits |

The default page renders six distinct sizes, two families, and three weights: 400, 500, and 600. Buttons use 500, selected mode and guide step titles use 600, and display serif uses 400. Body line-height is 1.5; the headline uses 1.08 (1.05 on phones), timer 1.1, and section/display titles 1.2. Headings balance their wrapping and prose uses `text-wrap: pretty`.

Headline tracking is -.025em, timer tracking -.055em, section titles -.015em, and changing statistics -.035em. Body text has natural spacing. Only the wordmark uses tighter -.06em brand lettering. Timer and statistic digits use `font-variant-numeric: tabular-nums`. Form inputs stay at 16px or larger. Dialog introductions cap their measure at 38ch; helper text at 42ch.

## Layout

The spacing variables `--space-1` through `--space-8` are 4, 8, 12, 16, 24, 32, 48, and 64 pixels. They are used for small copy gaps, control groups, action spacing, panel padding, and responsive gutters. Small optical adjustments such as 3px, 7px, 14px, 20px, and 28px remain local to the relevant component.

`.page-width` centers the page at a maximum of 1120px. The default gutter is 48px per side; it becomes 32px at 70rem, 24px at 52rem, 20px at 39rem, and 16px at 22rem. The desktop workspace is a `1.06fr 1fr` grid. At 52rem it becomes `1fr .8fr`; at 39rem it becomes one column and removes the decorative room. The timer retains natural DOM order ahead of ambience and daily totals.

The sound section starts as a heading, control row, and volume slider. At 70rem volume moves beneath its controls. At 52rem it becomes a vertical section. At 39rem the sound choices use an adaptive grid with a minimum of 4.5em per item, yielding four columns at ordinary phone text size and two columns with enlarged text. Daily totals and the footer stack on phones.

The `clock` inline-size container uses a 3em threshold relative to its timer font. When large text no longer fits, minutes and seconds stack with `min` and `sec` labels; digits retain their type size. Mode controls wrap as needed. This was checked at 320px with a 180-minute timer and 200% root text size. No content is hidden to suppress overflow. Only decorative room art and the standard visually hidden accessibility utility use clipping.

Verified widths: 320, 390, 624, 744, 834, 1120, and 1440 CSS pixels. A 320px RTL mirror and 200% CSS text enlargement were checked. These checks do not establish native browser zoom or a localized translation.

## Elevation & Depth

The main page is flat. The workspace uses a structural one-pixel border without a shadow. Section separators define groups where spacing alone would be ambiguous. Selected sound controls use a tonal fill plus outline and `aria-pressed`; playing tracks also display bars.

Only native dialogs are elevated: a `0 16px 64px #20291c33` shadow and a `#252e2180` backdrop with 4px blur. The native top layer provides stacking and background inertness. There are no fixed headers or floating bottom controls covering content. The skip link uses z-index 20 only while focused.

## Shapes

`--radius-small` is 8px for minor controls and sound choices, `--radius-control` is 12px for primary/reset actions, and `--radius-panel` is 24px for workspace and dialogs. The scene's outer corner is 23px to sit inside the workspace's one-pixel border. Settings and intention-completion controls are circular. The window arch belongs to the illustration, not to interactive components.

## Components

| Pattern/source | States and reuse |
| --- | --- |
| `.primary-button`, `src/styles.css:70` | One prominent filled action per active surface. Start/pause/resume/next-break labels identify the current action; dialog Save rhythm uses the same pattern. |
| `.icon-button`, `src/styles.css:45` | 44px base control with a named action. Reset is 48 × 52px on desktop and 46 × 50px on phones; it is natively disabled while pristine. |
| Timer workspace, `src/App.tsx:202` | Three ordinary pressed buttons in a named group; no tab-role keyboard promises. Timer has a spoken minutes/seconds label and live announcements are off for ticks. A separate stable status announces meaningful transitions. |
| Intention, `src/App.tsx` / `.intention` | Visible label, 160-character text input, optional completion toggle. Empty intention disables completion; completed text is struck through and editing restores the incomplete state. |
| Sound controls, `src/App.tsx` / `.sound-button` | Quiet, Rain, Ocean, Brown noise; pressed state, preparing state, generated-audio playback, stop, volume, and actionable failure text. No sound autoplays on load. |
| `Modal`, `src/App.tsx:14` | Native `dialog.showModal()`, labeled by heading, background inertness, Escape/backdrop dismissal, explicit Tab wrapping, and focus return. `title`, `children`, `kind`, and `onClose` form its local API. |
| `Settings`, `src/App.tsx:40` | Native numeric validation for 1–180 whole minutes, visible units and reset hint, completion-chime checkbox, Save rhythm confirmation through a polite status. |
| `Guide`, `src/App.tsx:70` | Three short steps, local-storage explanation, and the limits of a background chime. |
| Daily totals, `src/App.tsx` | Local-calendar session count and completed focus minutes. Empty text points to starting the first session. No simulated usage or shared visitor data. |
| `Icon`, `src/components/Icon.tsx` | Shared 24-unit, currentColor SVGs at a 20px base with 1.5px strokes; decorative and hidden from accessibility names. Primary-action icons use 2px strokes. |
| `QuietRoom`, `src/components/QuietRoom.tsx` | Original decorative vector artwork; no runtime asset fetch or animation. |

Hover effects only apply on hover-capable devices. Under `prefers-reduced-motion: no-preference`, color/press transitions use 120ms, active buttons scale to .96, progress uses 250ms, and user-started sound bars use a 1.2s loop. Reduced motion removes these transitions/loops. Quiet stops both the sound and its bars. No entrance animation delays the page.

## Do's and Don'ts

- Reuse `.page-width`, semantic colors, the six type roles, and the existing control patterns when extending the workspace.
- Keep the product and its primary action above supporting content. Preserve clear labels and native form behavior.
- Keep real changing values tabular and allow their containers to grow. Preserve the enlarged-text timer layout.
- Keep status honest: show local progress as local progress, and explain failed persistence or audio beside its available recovery.
- Preserve flat content surfaces; use elevation for the dialog layer. Avoid adding ornamental cards, tracked capitals, extra type sizes, or background motion.

For an additional surface, start inside `.page-width`, use a descending heading role, group controls with existing spacing tokens, and reuse `Modal` only for a focused secondary task. Verify that the result still fits 320px and enlarged text. A multi-page expansion would also need an explicit static-routing plan; the delivered site intentionally has one page.

Design-guide attribution is retained in `THIRD_PARTY_NOTICES.md` and `licenses/design-guidance.txt`. Review evidence and unperformed checks are recorded in `artifacts/validation.md`.
