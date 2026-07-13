from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
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
