"""Fetch dinosaur news from configured RSS feeds (NEWS_FEEDS in .env) and upsert
into the news_articles table, deduped by article link. Unlike the main ingestion
(app.ingest.run), this is meant to be re-run periodically (e.g. daily) since news
content changes — each run just adds new articles and leaves existing ones alone.

Usage:  python -m app.ingest.refresh_news
"""
import logging

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.ingest.news_client import fetch_all_feeds
from app.models import NewsArticle

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run(now_iso: str):
    Base.metadata.create_all(bind=engine)

    feeds = settings.news_feeds_list
    logger.info("Fetching %d news feeds", len(feeds))
    articles = fetch_all_feeds(feeds)
    logger.info("Fetched %d total articles", len(articles))

    db = SessionLocal()
    added = 0
    skipped = 0
    try:
        for article in articles:
            exists = db.query(NewsArticle).filter(NewsArticle.link == article["link"]).one_or_none()
            if exists:
                skipped += 1
                continue
            db.add(NewsArticle(fetched_at=now_iso, **article))
            added += 1
        db.commit()
    finally:
        db.close()

    logger.info("News refresh complete: %d new articles added, %d already known", added, skipped)


if __name__ == "__main__":
    from datetime import datetime, timezone

    run(datetime.now(timezone.utc).isoformat())
