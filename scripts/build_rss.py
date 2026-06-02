#!/usr/bin/env python3
"""Build an RSS 2.0 feed from data/news.json.

Same content as the website (titles only, grouped by day) — just emitted in a
machine-readable RSS/XML format that an LLM or a feed reader can consume.

Outputs two identical files at the repo root:
  - ``llm``      -> served at /llm        (the direct path, no extension)
  - ``llm.xml``  -> served at /llm.xml     (proper application/xml MIME)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "news.json"
SITE = "https://finfeed-llm.github.io"
OUTPUTS = [ROOT / "llm", ROOT / "llm.xml"]

# Each day's headlines get this UTC time so feed readers order them sensibly
# (14:00 UTC ≈ 9am US Central, when the feed is refreshed).
PUB_HOUR_UTC = 14


def parse_day_dt(day: dict) -> datetime | None:
    """Best-effort datetime for a day entry (from its iso field)."""
    iso = day.get("iso")
    if not iso:
        return None
    try:
        d = datetime.strptime(iso, "%Y-%m-%d")
        return d.replace(hour=PUB_HOUR_UTC, tzinfo=timezone.utc)
    except ValueError:
        return None


def rfc822(dt: datetime) -> str:
    return format_datetime(dt)


def build(data: dict) -> str:
    updated_iso = data.get("updated", "")
    try:
        last_build = datetime.fromisoformat(updated_iso).astimezone(timezone.utc)
    except (ValueError, TypeError):
        last_build = datetime.now(timezone.utc)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "  <channel>",
        "    <title>FinFeed — Market Headlines</title>",
        f"    <link>{SITE}/</link>",
        f'    <atom:link href="{SITE}/llm.xml" rel="self" type="application/rss+xml"/>',
        "    <description>Top market headlines (titles only), updated daily. "
        "Source: Finviz.</description>",
        "    <language>en</language>",
        f"    <lastBuildDate>{rfc822(last_build)}</lastBuildDate>",
        "    <generator>FinFeed build_rss.py</generator>",
    ]

    for day in data.get("days", []):
        day_dt = parse_day_dt(day)
        iso = day.get("iso", "")
        for idx, title in enumerate(day.get("items", [])):
            t = escape(title)
            guid = f"finfeed-{iso or 'd'}-{idx}"
            lines.append("    <item>")
            lines.append(f"      <title>{t}</title>")
            lines.append(f"      <link>{SITE}/</link>")
            lines.append(f"      <description>{t}</description>")
            lines.append(f'      <guid isPermaLink="false">{guid}</guid>')
            lines.append(f"      <category>{escape(day.get('date', ''))}</category>")
            if day_dt:
                lines.append(f"      <pubDate>{rfc822(day_dt)}</pubDate>")
            lines.append("    </item>")

    lines.append("  </channel>")
    lines.append("</rss>")
    return "\n".join(lines) + "\n"


def main() -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    xml = build(data)
    n_items = sum(len(d.get("items", [])) for d in data.get("days", []))
    for out in OUTPUTS:
        out.write_text(xml, encoding="utf-8")
    print(f"Wrote RSS feed ({n_items} items) -> {', '.join(o.name for o in OUTPUTS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
