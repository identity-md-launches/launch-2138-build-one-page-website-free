# Third-party notices

FREE's implementation, vector room, icons, and procedural sound code were created for this assignment. The following third-party materials are used or credited.

## Fonts

DM Sans and Instrument Serif are distributed under the SIL Open Font License 1.1. The actual font license notices are retained alongside the local WOFF2 assets in `public/fonts/DM-Sans-OFL.txt` and `public/fonts/Instrument-Serif-OFL.txt`, and copied into the production export.

Font sources: [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans), [Instrument Serif](https://github.com/google/fonts/tree/main/ofl/instrumentserif). The local web fonts were obtained from Google Fonts; the running site does not contact Google Fonts.

## Design and documentation guidance

The assignment's pinned Better Interface guidance is adapted from Jakub Krehel's [Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`, MIT, copyright (c) 2026 Jakub Krehel.

The documentation method is adapted from Paul Bakaus's [Impeccable documentation reference](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, Apache-2.0, copyright 2025 Paul Bakaus.

The supplied MIT and Apache-2.0 notices and license texts are preserved together in `licenses/design-guidance.txt`. Each work retains its own license; the combined notice does not relicense either upstream work. These credits describe guidance applied to the interface and documentation, not a claim that those projects endorse FREE.

## Software dependencies

React and React DOM provide rendering; Vite and TypeScript provide the build and typecheck. Playwright and axe-core provide development-only validation. Exact versions and dependency resolutions are recorded in `package.json` and `package-lock.json`. The runtime MIT notice for React, React DOM, and Scheduler is retained in `public/REACT-LICENSE.txt` and included in `dist/REACT-LICENSE.txt`. Development dependencies and their package archives are not part of the static runtime export.
