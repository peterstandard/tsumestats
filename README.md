# 詰 tsumestats

A client-side analytics and visualization dashboard for **101weiqi** (101围棋网) checkpoint challenge (`guan`) test records.

Built with **SvelteKit** (Svelte 5 runes), **Tailwind CSS v4** ("Fresh Kiwi" design system), and **Apache ECharts**.

---

## Features

- **100% Client-Side & Private**: All parsing, metrics, regression, and storage run locally in your browser (`localStorage`). No database, server, or cloud account required.
- **Pre-Loaded 2-Month Dataset**: Ships with 394 real checkpoint challenge tests (3,940 problems) from 15k to 6k over July–September 2026 for instant analysis.
- **KPI Overview Cards**: Total tests, total problems solved, overall accuracy %, pass rate %, average seconds per problem/test, active practice days, and difficulty progression.
- **Interactive Dual-Axis Timeline**: 7-test rolling accuracy line + individual test scores alongside solving speed (seconds per problem), with an interactive timeline brush slider.
- **Performance by Rank (Kyu / Dan)**: Compare accuracy %, pass rate %, and time taken across Kyu/Dan ranks to spot plateaus.
- **Speed vs. Accuracy Correlation & Regression**: Scatter plot of duration vs accuracy with Ordinary Least Squares (OLS) linear regression ($y = mx + b$) and $R^2$ goodness-of-fit.
- **Temporal Habit Analysis**:
  - **Time of Day**: 24-hour distribution of test count, accuracy %, and speed (morning vs afternoon vs late night).
  - **Weekend vs. Weekday**: Side-by-side comparison metrics showing whether relaxed weekend sessions yield better accuracy.
- **Searchable Test History Table**: Filterable and sortable log of all tests with direct review links to `https://www.101weiqi.com/guan/result/{number}/{guanid}/`.
- **Easy Ingestion & Bookmarklet**:
  - Drag-and-drop `.json` file upload or direct text paste.
  - Automatic deduplication by `guanid` so importing multiple exports merges seamlessly without duplicates.
  - Built-in one-click bookmarklet script to copy test records directly from 101weiqi (`https://www.101weiqi.com/guan/my/`) to your clipboard.

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
