# FinFeed

A clean, installable **PWA** that shows top market headlines — **titles only, no body**.
Headlines are scraped once a day from [Finviz](https://finviz.com/news.ashx) and
grouped by date (e.g. `June 1`).

🔗 Live: https://finfeed-llm.github.io/

## How it works

```
scripts/fetch_news.py   →  data/news.json   →  index.html (PWA reads & renders)
        ▲
        └── runs daily at 9am Central via GitHub Actions, then commits the JSON
```

- **Front end** — static `index.html` + `app.js` + `styles.css`, served by GitHub Pages.
  Installable as a PWA (`manifest.webmanifest` + `sw.js`, offline-capable).
- **Data** — `data/news.json`, a rolling 7-day feed of headline titles.
- **Automation** — `.github/workflows/daily-news.yml` runs the scraper every morning
  at **9am Texas time (US Central)** and commits any new headlines.

## Run locally

```bash
python3 -m pip install -r requirements.txt
python3 scripts/fetch_news.py          # refresh data/news.json
python3 -m http.server 8000            # then open http://localhost:8000
```

## Settings

Edit constants in [`scripts/fetch_news.py`](scripts/fetch_news.py):

- `MAX_TITLES` — headlines kept per day (default 40)
- `N_DAYS` — days of history retained (default 7)

Change the schedule in [`.github/workflows/daily-news.yml`](.github/workflows/daily-news.yml).
