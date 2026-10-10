from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.ingest import refresh_news
from app.models import NewsArticle
from app.schemas import PaginatedNews

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=PaginatedNews)
def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(NewsArticle)
    if source:
        query = query.filter(NewsArticle.source_name.ilike(source))

    total = query.with_entities(func.count(NewsArticle.id)).scalar()
    items = (
        query
        # newest first; articles without a parsed date sort last
        .order_by(NewsArticle.published_at.is_(None), NewsArticle.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedNews(total=total, page=page, page_size=page_size, items=items)


@router.post("/refresh")
def refresh(x_refresh_token: str | None = Header(default=None)):
    """Trigger a news refresh in-process.

    Exists so the Render cron job (a separate container that cannot share the SQLite
    file) can wake this service and have the write happen where the DB actually lives.
    Guarded by NEWS_REFRESH_TOKEN; refuses to run if no token is configured.
    """
    if not settings.news_refresh_token:
        raise HTTPException(status_code=503, detail="NEWS_REFRESH_TOKEN is not configured")
    if x_refresh_token != settings.news_refresh_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return refresh_news.run(datetime.now(timezone.utc).isoformat())
