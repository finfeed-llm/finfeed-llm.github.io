#!/usr/bin/env python3
"""Scrape Finviz top news headlines (titles only) and write data/news.json.

- Source: https://finviz.com/news.ashx  (free, market + stock headlines)
- We keep ONLY the title text (no body, no links).
- Headlines are grouped by date label like "June 1" (Central / Texas time).
- We keep the most recent N_DAYS of history so the site shows a rolling feed.
"""

import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import requests

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("America/Chicago")  # Texas / US Central
except Exception:  # pragma: no cover - fallback if tzdata missing
    TZ = None

NEWS_URL = "https://finviz.com/news.ashx"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "news.json"
MAX_TITLES = 40   # how many top headlines to keep per day
N_DAYS = 90       # how many days of history to retain (fills the calendar)


def fetch_titles() -> list[str]:
    resp = requests.get(NEWS_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    # Finviz renders each headline as an anchor with class "nn-tab-link".
    raw = re.findall(r'class="[^"]*nn-tab-link[^"]*"[^>]*>([^<]+)<', resp.text)
    titles: list[str] = []
    seen: set[str] = set()
    for t in raw:
        title = html.unescape(t).strip()
        if not title or title in seen:
            continue
        seen.add(title)
        titles.append(title)
    return titles[:MAX_TITLES]


def date_label(dt: datetime) -> str:
    # e.g. "June 1" (no leading zero, no year)
    return f"{dt:%B} {dt.day}"


def load_existing() -> dict:
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"updated": "", "days": []}


def main() -> int:
    now = datetime.now(TZ) if TZ else datetime.now()
    today = date_label(now)
    today_iso = now.strftime("%Y-%m-%d")

    titles = fetch_titles()
    if not titles:
        print("ERROR: no titles scraped — leaving existing data untouched.", file=sys.stderr)
        return 1

    data = load_existing()
    days = [d for d in data.get("days", []) if d.get("date") != today]
    days.insert(0, {"date": today, "iso": today_iso, "items": titles})
    days = days[:N_DAYS]

    data = {
        "updated": now.isoformat(timespec="seconds"),
        "source": "Finviz",
        "days": days,
    }

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(titles)} headlines for {today} -> {DATA_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
