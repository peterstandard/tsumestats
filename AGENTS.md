# Antigravity Context & Architecture Guide (AGENTS.md)

Welcome! This document provides context, architectural decisions, and workflows for Antigravity sessions working on **tsumestats**.

---

## 1. Project Mission & Core Tenets

**tsumestats** is an analytics and visualization dashboard for Go (Baduk / Weiqi) problem solvers on **101weiqi** (101围棋网) and **Tsumego Hero** (tsumego.com).

### Core Tenets
1. **100% Client-Side & Static**: Built using `@sveltejs/adapter-static`. Everything compiles into static HTML, CSS, and JS (`build/`). There is no Node.js backend server or database.
2. **Absolute Privacy**: All solve records are parsed in-browser and stored exclusively in browser `localStorage`. No user credentials, cookies, telemetry, or external storage.
3. **No Breaking Changes to Data Schemas**: Preserve existing `localStorage` keys and data structures so users never lose their saved test/solve history across updates.

---

## 2. Multi-Platform System

The app provides a segmented switcher in the header between two distinct platforms:

| Platform | Primary Theme Accent | Data Type | Key Store | LocalStorage Key |
| :--- | :--- | :--- | :--- | :--- |
| **101weiqi** | Fresh Kiwi Green (`#88C13F`) | Checkpoint Challenge Tests | `recordsStore` | `tsumestats_records_v1` |
| **Tsumego Hero** | Softened Royal Purple (`#8052cf`) | Public Solve History | `heroStore` | `tsumestats_hero_v1` |

Platform state is managed globally by `platformStore` (`src/lib/stores/platform.svelte.ts`).

---

## 3. Tsumego Hero Architecture

### 3.1 Scraping & The `/api/tsumego` Reverse Proxy
Tsumego Hero solve logs (`https://tsumego.com/users/solveHistory/{userId}`) are public and unauthenticated, serving 500 solves per page.
- Direct browser `fetch()` is blocked by CORS.
- **Solution**: The app uses a transparent reverse proxy endpoint `/api/tsumego`.
  - **Local Dev**: Configured in `vite.config.ts` via Vite's `server.proxy['/api/tsumego']`.
  - **Production (VPS / Nginx)**: Handled by Nginx reverse proxying `/api/tsumego/` to `https://tsumego.com/` with `proxy_ssl_server_name on;` and a standard browser `User-Agent`.
  - **Fallback**: If the proxy is unavailable (e.g. static hosting on GitHub Pages), `ImportModal.svelte` gracefully catches network errors and guides the user to the 1-click **Bookmarklet** tab.
- **Safety**: Max 50 pages (25,000 solves), 200ms delay between pages, user cancellation via `AbortController`.

### 3.2 Visual & Dashboard Hierarchy
The Tsumego Hero dashboard (`src/routes/+page.svelte`) follows a structured layout:
1. **KPI Cards** (`HeroKpiCards.svelte`): Solves, Clean Rate, Sessions, Pace, Rating, XP.
2. **Filter Bar** (`HeroFilterBar.svelte`): Date presets & text search.
3. **Rating & Volume Chart** (`HeroRatingChart.svelte`): Elo curve + daily solve volume.
4. **Session Pacing Chart** (`HeroSessionPacingChart.svelte`): Speed Blitz (<20s), Steady (20-60s), Deep (>60s).
5. **Consistency Chart** (`HeroTemporalChart.svelte`): Day of week and hourly distribution.
6. **Collection Mastery Table** (`HeroCollectionSummaryTable.svelte`): Overview of all Go books/collections, completion sparkbars, and recent form dots. Clicking a row filters the problem table below.
7. **Problem Mastery Table** (`HeroProblemMasteryTable.svelte`): Consolidated problem-by-problem breakdown across all attempts.
   - **Needs Practice**: Latest attempt had misplays or failed.
   - **Overcome**: Struggled previously, but conquered cleanly (0 misplays) on latest retry.
   - **Flawless**: 0 misplays across every attempt.
   - **Drilled Multi-Times**: Problems with $\ge 2$ solves.
   - **Progression Dots**: `● → ● → ●` colored green (0), amber (1), red (2+) misplays.
   - **Best vs Recent**: Misplays and solve duration comparison.
   - **Expandable Drawer**: Complete attempt timeline for each problem.
8. **Pure Solve History Log** (`HeroHistoryTable.svelte`): Unburdened chronological audit trail of all individual solve events.

---

## 4. Codebase Conventions & Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`).
- **Styling**: Tailwind CSS v4 using the "Fresh Kiwi" palette:
  - App background: `#FDF5E6` / `#FAF0DA`
  - Text: `#3D2A1F` (primary), `#5e4537` (secondary)
  - Borders: `#D6BA96`
  - Weiqi accent: `#88C13F`
  - Hero accent: `#8052cf`
- **Charts**: Apache ECharts (`echarts` and `echarts-stat`).
- **Icons**: `lucide-svelte`.
- **Versioning**:
  - Current version is defined in `src/lib/version.ts`.
  - A Git pre-commit hook in `.githooks/pre-commit` automatically runs `node scripts/bump-version.js patch` and stages `version.ts` and `package.json` on every commit.

---

## 5. Development & Deployment Commands

```bash
# Verify TypeScript & Svelte types (must have 0 errors)
npm run check

# Build static production files to build/
npm run build

# Preview build locally
npm run preview
```

### Production Build
Static files are emitted to `build/` and can be served by any static web server (Nginx, Caddy, etc.).

