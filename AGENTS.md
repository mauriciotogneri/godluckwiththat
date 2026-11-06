## Project

A hybrid incremental strategy game (Vite + Vue 3, JavaScript, Composition API with `<script setup>`, ESLint + @stylistic).

## Reference Docs

- `docs/architecture.md` — visual design, class architecture, game mechanics. Read when working on related areas.
- `docs/specs.md` — game specs, buildings, seasons, progression. Read when working on related areas.
- `docs/javascript.md` — constants, imports, getters, asset paths. Read when editing JavaScript files.
- `docs/audio.md` — bitrate requirements. Read when adding or converting audio files and features.
- `docs/localization.md` — locale files, key format, `t()` usage. Read when adding or changing user-facing text.
- `docs/ui.md` — shared styles, colors, CSS units, frontend-design skill. Read when editing Vue components or CSS.
- `docs/testing.md` — test layout, factory helpers, mocks, coverage. Read when adding or changing tests.
- `docs/performance.md` — performance overlay metrics. Read when working on the game loop, UI sync, or performance.
- `docs/simulation.md` — headless balance simulation (bots, options, baseline). Read when working on balancing, challenges, or `scripts/simulation/`.

## Rules

- **After completing code changes**: Run `npm run lint:fix` and fix remaining errors, run `npm test` and fix any failures.
- **Browser Testing**: After changing the app, start it with `npm run dev` and test the change in the browser using the Claude in Chrome tools; check the console for errors.
- **Doc Maintenance**: After changes, check if `AGENTS.md`, `docs/architecture.md`, and `docs/specs.md` need updating.
