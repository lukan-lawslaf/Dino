import logging
import time
from datetime import datetime, timezone

import feedparser

logger = logging.getLogger(__name__)

REQUEST_DELAY_SECONDS = 0.5


def _to_iso(entry) -> str | None:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    try:
        return datetime(*parsed[:6], tzinfo=timezone.utc).isoformat()
    except (TypeError, ValueError):
        return None


def _extract_image(entry) -> str | None:
    thumbs = entry.get("media_thumbnail")
    if thumbs:
        return thumbs[0].get("url")
    for enc in entry.get("enclosures") or []:
        if str(enc.get("type", "")).startswith("image/") or enc.get("href", "").lower().endswith(
            (".jpg", ".jpeg", ".png", ".gif")
        ):
            return enc.get("href")
    return None


def fetch_feed(source_name: str, url: str) -> list[dict]:
    """Fetch and normalize one RSS/Atom feed. Never raises; returns [] on any failure."""
    try:
        parsed = feedparser.parse(url)
        if parsed.bozo and not parsed.entries:
            # bozo=True with entries present usually just means minor XML quirks (tolerated);
            # bozo=True with no entries means the fetch/parse genuinely failed.
            raise parsed.bozo_exception or ValueError("feed parse failed")
    except Exception as exc:  # feedparser can raise a variety of things depending on transport
        logger.warning("News feed fetch failed for source=%s url=%s: %s", source_name, url, exc)
        return []
    finally:
        time.sleep(REQUEST_DELAY_SECONDS)

    articles = []
    for entry in parsed.entries:
        link = entry.get("link")
        title = entry.get("title")
        if not link or not title:
            continue
        articles.append(
            {
                "title": title,
                "link": link,
                "summary": entry.get("summary"),
                "image_url": _extract_image(entry),
                "source_name": source_name,
                "published_at": _to_iso(entry),
            }
        )
    return articles


def fetch_all_feeds(feeds: list[tuple[str, str]]) -> list[dict]:
    """feeds: [(source_name, url), ...]. Returns combined, normalized article list."""
    all_articles = []
    for source_name, url in feeds:
        articles = fetch_feed(source_name, url)
        logger.info("Fetched %d articles from %s", len(articles), source_name)
        all_articles.extend(articles)
    return all_articles
