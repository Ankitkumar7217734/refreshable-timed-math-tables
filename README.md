<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Refreshable Timed Math Tables

Timed 9×9 addition & subtraction tables plus a rapid-fire squares (2–30) & cubes (2–20) trainer — with instant self-checking, per-table stopwatches, and 5 color themes.

**🔗 Live app: https://ankitkumar7217734.github.io/refreshable-timed-math-tables/**

## Features

- **9×9 Addition & Subtraction grids** — shared random dataset (all headers 10–99), auto-computed answer keys
- **Refresh button** — regenerates the shared dataset and resets both tables & stopwatches
- **Stopwatches** — start on first keystroke, freeze when all 81 cells are filled & checked; frozen time is appended to the score
- **Instant checking** — green/red per-cell feedback; re-typing clears the mark; negative subtraction answers supported
- **Crosshair highlight** — focusing a cell traces its row & column headers
- **Keyboard-first** — arrow keys move between cells (caret-aware), Enter checks, Esc passes in the powers trainer
- **Squares & Cubes trainer** — Enter submits, Esc passes/reveals, streak + best-streak + accuracy stats, last-20 history, collapsible reference tables
- **5 themes** (Ocean · Forest · Sunset · Classic · Berry) — repaint every surface live, no reload
- **Accessible** — proper tabs/radiogroup ARIA, `aria-live` timer pills, tabular numerals, responsive layout

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev` → http://localhost:3000
3. Type check:
   `npm run lint`
4. Production build:
   `npm run build`

## Deploying to GitHub Pages

```bash
npm run build:pages   # builds with --base=/refreshable-timed-math-tables/
npx gh-pages -d dist  # or push dist/ to the gh-pages branch
```

The app is fully client-side — no API keys or backend required.

---

<sub>Originally scaffolded in [Google AI Studio](https://ai.studio/apps/a22e8dfb-724d-4e87-8d98-ac0df48aa9f4).</sub>
