# 詰 tsumestats

[![Live Dashboard](https://img.shields.io/badge/Live%20Dashboard-peterstandard.github.io%2Ftsumestats-88C13F?style=for-the-badge&logo=github)](https://peterstandard.github.io/tsumestats/)
[![Deploy to GitHub Pages](https://github.com/peterstandard/tsumestats/actions/workflows/deploy.yml/badge.svg)](https://github.com/peterstandard/tsumestats/actions/workflows/deploy.yml)

> 🚀 **Live Site:** **[https://peterstandard.github.io/tsumestats/](https://peterstandard.github.io/tsumestats/)**

A client-side analytics and visualization dashboard for **101weiqi** (101围棋网) and **Tsumego Hero** (tsumego-hero.com) problem solvers.

Built with **SvelteKit** (Svelte 5 runes), **Tailwind CSS v4** ("Fresh Kiwi" design system), and **Apache ECharts**.

---

## Features

- **Dual-Platform Architecture**: Switch seamlessly between **101weiqi** and **Tsumego Hero** via the navbar switcher, each maintaining independent local storage, KPIs, and specialized analytics.
- **100% Client-Side & Private**: All parsing, metrics, clustering, and storage run locally in your browser (`localStorage`). No database, server, or cloud account required.
- **Pre-Loaded Sample Datasets**: Ships with pre-loaded sample datasets for both 101weiqi (394 checkpoint challenge tests) and Tsumego Hero (500 problem solves across 9 collections) for immediate out-of-the-box exploration.

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
- **Collection Mastery & Clean-Rate Ladder**: Ranks all tackled books and collections by first-try flawless rate (0 misplays) and average misplay count.
- **Practice Consistency & Active Hours**: 24-hour distribution showing training volume and clean rate by time of day.
- **Solve History Log**: Chronological table of solves with collection name, problem #, misplays, rating updates, and direct links to Tsumego Hero problems and sets.

### 1-Click Scrapers & Importers
- **101weiqi**: One-click bookmarklet to copy test records directly from `https://www.101weiqi.com/guan/my/`.
- **Tsumego Hero**: Multi-page auto-fetching bookmarklet for `https://tsumego-hero.com/users/solveHistory/` that automatically crawls all paginated records in the background and copies the full JSON in ~1 second.
- **Drag-and-Drop Ingestion**: Supports `.json` files and saved `.html` pages. Automatically detects the data format and switches to the corresponding platform.

---

## Color Palette ("Fresh Kiwi")

- **Fresh Kiwi Green** (`#88C13F`): Primary accent, active states, pass badges
- **Warm Kiwi Brown** (`#8B5E3C`): Secondary accent, buttons, structural borders
- **Icon Beige** (`#FDF5E6` / `#FAF0DA`): App canvas background, card surfaces
- **Dark Espresso** (`#3D2A1F`): Primary text, high-contrast icons, outlines
- **Toasted Almond** (`#D6BA96`): Secondary borders, dividers, subtle text
- **Coral Fail** (`#C84B31`): Test failed status accent

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run check

# Build production static bundle
npm run build

# Preview static bundle
npm run preview
```

---

## Deploying to your VPS (Static / Nginx)

Since `tsumestats` is built with `@sveltejs/adapter-static`, running `npm run build` outputs pure HTML, CSS, and JS to the `build/` directory.

### Sample Nginx Configuration

```nginx
server {
    listen 80;
    server_name tsumestats.yourdomain.com;

    root /var/www/tsumestats/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /_app/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```
