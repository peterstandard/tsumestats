# 詰 tsumestats

[![Live Dashboard](https://img.shields.io/badge/Live%20Dashboard-peterstandard.github.io%2Ftsumestats-88C13F?style=for-the-badge&logo=github)](https://peterstandard.github.io/tsumestats/)
[![Deploy to GitHub Pages](https://github.com/peterstandard/tsumestats/actions/workflows/deploy.yml/badge.svg)](https://github.com/peterstandard/tsumestats/actions/workflows/deploy.yml)

> 🚀 **Live Site:** **[https://peterstandard.github.io/tsumestats/](https://peterstandard.github.io/tsumestats/)**

A client-side analytics and visualization dashboard for **101weiqi** (101围棋网) and **Tsumego Hero** (tsumego.com) problem solvers.

Built with **SvelteKit** (Svelte 5 runes), **Tailwind CSS v4** ("Fresh Kiwi" design system), and **Apache ECharts**.

---

## Features

- **Dual-Platform Architecture**: Switch seamlessly between **101weiqi** and **Tsumego Hero** via the navbar switcher, each maintaining independent local storage, KPIs, and specialized analytics.
- **100% Client-Side & Private**: All parsing, metrics, clustering, and storage run locally in your browser (`localStorage`). No database, server, or cloud account required.
- **Pre-Loaded Sample Datasets**: Ships with pre-loaded sample datasets for both 101weiqi (394 checkpoint challenge tests) and Tsumego Hero (503 problem solves across 9 collections) for immediate out-of-the-box exploration.

### 101weiqi Analytics
- **KPI Overview Cards**: Total tests, problems, overall accuracy %, pass rate %, average seconds per problem/test, active practice days, and difficulty progression.
- **Dual-Axis Timeline**: 7-test rolling accuracy line + individual test scores alongside solving speed (seconds per problem), with an interactive timeline brush slider.
- **Difficulty Progression Milestones**: Tracks the exact date you first cleared each rank difficulty (15k → 7k) and how many attempts it took to break through.
- **Speed Milestones & Personal Bests by Rank**: Tracks personal best speed records per difficulty, seconds shaved off, and tests/days spent breaking each record, plus golden diamond PB badges.
- **Speed vs. Accuracy Correlation & Regression**: Scatter plot of duration vs accuracy with Ordinary Least Squares (OLS) linear regression ($y = mx + b$) and $R^2$.
- **Temporal Habit Analysis**: 24-hour distribution of test count and weekend vs weekday metrics.
- **Searchable Test History Table**: Filterable log with direct review links to 101weiqi.

### Tsumego Hero Analytics
- **Elo Rating Trajectory & Daily Volume**: High-resolution rating progression curve overlaid with daily solve volume intensity.
- **Automated Training Session Detection**: Clusters consecutive solves into distinct training sessions (breaks > 15 min), calculating session duration, problem volume, and pace.
- **Recognition Cadence & Pacing**: Classifies practice into Speed Blitz (<20s/prob), Steady Reading (20–60s), and Deep Calculation (>60s) grind sessions.
- **Practice Consistency & Routine**: 24-hour distribution and day-of-week habit breakdowns showing practice regularity.
- **Collection Mastery & Summary Table**: Visual book overview with completion sparkbars, unique solve counts, and recent form dots. Clicking any collection smoothly filters the problem breakdown below.
- **Problem Mastery & Repeat Solves Table**: Consolidated problem-by-problem view tracking lifetime attempts:
  - **Needs Practice**: Filters to problems where your latest attempt had misplays or failed.
  - **Overcome**: Celebrates problems where you stumbled previously, but mastered with 0 misplays on your latest attempt!
  - **Flawless**: 100% clean solves across every attempt.
  - **Drilled Multi-Times**: Problems you have practiced $\ge 2$ times.
  - **Progression Dots**: `● → ● → ●` colored green (0), amber (1), red (2+) misplays.
  - **Best vs Recent**: Direct comparison of best misplays and solve pace against your latest attempt.
  - **Expandable Drawer**: Complete chronological attempt timeline with XP, rating changes, and direct practice links.
- **Pure Solve History Log**: Unburdened chronological audit trail of all individual solve events.

### Importers & Scrapers
- **1-Click Direct Profile Scraper (Tsumego Hero)**: Paste your public profile URL (e.g. `https://tsumego.com/users/view/32551`) or user ID to automatically fetch, paginate, and import your complete solve history in seconds (via local Vite dev proxy or VPS Nginx reverse proxy).
- **1-Click Bookmarklets**: Browser bookmarklets to scrape history with 1 click directly on 101weiqi (`https://www.101weiqi.com/guan/my/`) or Tsumego Hero (`https://tsumego.com/users/solveHistory/`).
- **Drag-and-Drop Ingestion**: Supports `.json` exports and saved `.html` pages.

---

## Color Palette ("Fresh Kiwi")

- **Fresh Kiwi Green** (`#88C13F`): 101weiqi primary accent, pass badges, flawless indicators
- **Softened Royal Purple** (`#8052cf`): Tsumego Hero primary accent, brand icons, buttons
- **Warm Kiwi Brown** (`#8B5E3C`): Secondary accent, action buttons, structural borders
- **Icon Beige** (`#FDF5E6` / `#FAF0DA`): App canvas background, card surfaces
- **Dark Espresso** (`#3D2A1F`): Primary text, high-contrast icons, outlines
- **Toasted Almond** (`#D6BA96`): Secondary borders, dividers, subtle text
- **Coral Fail** (`#C84B31`): Misplay / needs-practice accent

---

## Development

```bash
# Install dependencies
npm install

# Start development server (includes /api/tsumego dev proxy)
npm run dev

# Type check (TypeScript + Svelte 5)
npm run check

# Build production static bundle to build/
npm run build

# Preview static bundle
npm run preview
```

---

## Production Deployment (Nginx / Static)

Since `tsumestats` is built with `@sveltejs/adapter-static`, `npm run build` outputs static files to the `build/` directory.

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name tsumestats.example.com;

    root /var/www/tsumestats;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Tsumego Hero Reverse Proxy (bypasses browser CORS for 1-click scraping)
    location /api/tsumego/ {
        proxy_pass https://tsumego.com/;
        proxy_ssl_server_name on;
        proxy_set_header Host tsumego.com;
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }

    # Cache static assets
    location /_app/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

