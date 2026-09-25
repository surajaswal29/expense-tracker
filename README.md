# expenzie
<h1>Expense Tracker Web App</h1>

App Preview => https://expenzie.netlify.app/
Application Status => Under Development ⚙

![Alt](https://repobeats.axiom.co/api/embed/d0e0b73a238ef14872deeef895393d4543fc1cf2.svg "Repobeats analytics image")

## ✨ Expenzie v2 — HTML, CSS & Canvas edition (`/app`)

A standalone rewrite of the tracker in plain HTML, modern CSS and ES-module JavaScript. It needs no build step and has no dependencies, and all charts are drawn by hand on `<canvas>`.

**Features**
- Dashboard for the selected month: net balance, income, expenses and savings rate, with animated count-ups and 6-month sparklines
- Canvas charts (HiDPI-aware, responsive, animated, with hover tooltips):
  - Spending-by-category donut, linked to its legend
  - 6-month cash-flow bars with a net line (click a month to open it)
  - Cumulative spending pace vs. your budget pace
- Category budgets with progress meters and warning/over states
- Add, edit and delete transactions (with undo), search, filter by type and category
- CSV import/export, demo data, light/dark theme; data stays in your browser (`localStorage`)
- Keyboard shortcuts: <kbd>N</kbd> new · <kbd>/</kbd> search · <kbd>←</kbd>/<kbd>→</kbd> change month

**Platform features used:** `<dialog>` with `@starting-style` animations, the Popover API with CSS anchor positioning, View Transitions, container queries, `:has()`, CSS nesting, cascade layers, `color-mix()`, `Intl` formatting, `ResizeObserver`, `Path2D`, and `prefers-reduced-motion` support.

**Run it**
```bash
npm start                     # Express serves it at http://localhost:4000
# or any static server:
npx serve app                 # or: python3 -m http.server -d app
```
> ES modules don't load over `file://`, so use a local server instead of opening `index.html` directly.
