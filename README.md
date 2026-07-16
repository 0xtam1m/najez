# Najez — Own Your Career

Track your goals, plans, and promotion evidence — all in one place.

A static web app built around the "Own Your Career" template: every sheet of the template is a page, and all the numbers gather in one dashboard.

## Pages

- **Dashboard** — every number in one place: completion rates, weekly trend, monthly accomplishments, and promotion readiness.
- **Annual Career Goals** — core projects, ongoing responsibilities, and development goals; each task has a priority, size, deadline, and value-add.
- **30/60/90 Day Plan** — three phases for starting a new role (or quarterly planning): goals with success metrics and checkable subtasks. Optional — can be hidden from Settings on the dashboard.
- **Weekly To-Do List** — to-dos, follow-ups, unplanned asks, and weekly accomplishments, with week navigation and per-item status.
- **Monthly Round-Up** — top accomplishments, feedback received, ongoing projects, and next-month goals.
- **Promotion Goals** — current/future job and target date, with documented evidence and a self-assessment per core responsibility.

## Features

- Catppuccin palette (Latte light / Mocha dark, follows system preference)
- JetBrains Mono typography
- Installable as a mobile app (PWA manifest)
- Demo data seeding to preview the dashboard in one click

## Running

Fully static (HTML/CSS/JS) with no dependencies or build step:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deploys automatically to GitHub Pages on every merge to `main` (via the `gh-pages` branch).

## Storage

Data is stored locally in your browser via `localStorage` — there is no server and your data never leaves your device.
