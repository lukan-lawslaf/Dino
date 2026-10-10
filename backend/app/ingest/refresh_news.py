"""Fetch the latest dinosaur/fossil news and upsert it into the news_articles table,
deduped by article link. Meant to be re-run periodically (daily) since news changes —
each run adds new articles and leaves existing ones alone.

Source selection:
  * If NEWSAPI_KEY is set -> web-wide search via NewsAPI.org (primary).
  * Otherwise            -> the curated RSS feeds in NEWS_FEEDS (fallback).

Articles that arrive without an image get their page's og:image scraped, so the News
UI shows real thumbnails instead of placeholders.

Usage:  python -m app.ingest.refresh_news
"""
import logging

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.ingest.news_client import extract_og_image, fetch_all_feeds, fetch_newsapi
from app.models import NewsArticle

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Cap on og:image scraping for pre-existing image-less articles per run, so a single
# run can't hammer dozens of publisher sites. The backlog clears over a few runs.
BACKFILL_LIMIT = 40


def _fetch_articles() -> list[dict]:
    if settings.newsapi_enabled:
        logger.info("Using NewsAPI (web-wide search)")
        return fetch_newsapi(
            settings.newsapi_query, settings.newsapi_key, settings.newsapi_page_size
        )
    logger.info("NEWSAPI_KEY not set - falling back to %d RSS feeds", len(settings.news_feeds_list))
    return fetch_all_feeds(settings.news_feeds_list)


def _backfill_images(db) -> int:
    """Fill in og:image for existing articles that never got one. Returns count filled."""
    pending = (
        db.query(NewsArticle)
        .filter(NewsArticle.image_url.is_(None))
        .order_by(NewsArticle.published_at.desc())
        .limit(BACKFILL_LIMIT)
        .all()
    )
    filled = 0
    for article in pending:
        image = extract_og_image(article.link)
        if image:
            article.image_url = image
            filled += 1
    return filled


def run(now_iso: str) -> dict:
    Base.metadata.create_all(bind=engine)

    articles = _fetch_articles()
    logger.info("Fetched %d candidate articles", len(articles))

    db = SessionLocal()
    added = 0
    skipped = 0
    enriched = 0
    backfilled = 0
    try:
        for article in articles:
            exists = db.query(NewsArticle).filter(NewsArticle.link == article["link"]).one_or_none()
            if exists:
                skipped += 1
                continue
            # New article with no image from the source -> scrape the page's og:image.
            if not article.get("image_url"):
                image = extract_og_image(article["link"])
                if image:
                    article["image_url"] = image
                    enriched += 1
            db.add(NewsArticle(fetched_at=now_iso, **article))
            added += 1
        db.commit()

        # Also top up images on older articles that predate this pipeline.
        backfilled = _backfill_images(db)
        db.commit()
    finally:
        db.close()

    summary = {
        "added": added,
        "skipped": skipped,
        "enriched": enriched,
        "backfilled": backfilled,
    }
    logger.info(
        "News refresh complete: %d new, %d already known, %d images scraped for new, "
        "%d backfilled",
        added, skipped, enriched, backfilled,
    )
    return summary


if __name__ == "__main__":
    from datetime import datetime, timezone

    run(datetime.now(timezone.utc).isoformat())
