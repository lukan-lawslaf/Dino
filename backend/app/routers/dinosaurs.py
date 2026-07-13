from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dinosaur
from app.schemas import DinosaurDetail, DinosaurSummary, Model3D, PaginatedDinosaurs

router = APIRouter(prefix="/dinosaurs", tags=["dinosaurs"])


@router.get("", response_model=PaginatedDinosaurs)
def list_dinosaurs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(Dinosaur.id)).scalar()
    items = (
        db.query(Dinosaur)
        .order_by(Dinosaur.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedDinosaurs(total=total, page=page, page_size=page_size, items=items)


@router.get("/search", response_model=list[DinosaurSummary])
def search_dinosaurs(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    items = db.query(Dinosaur).filter(Dinosaur.name.ilike(f"%{q}%")).order_by(Dinosaur.name).all()
    return items


@router.get("/filter", response_model=list[DinosaurSummary])
def filter_dinosaurs(
    diet: str | None = None,
    period: str | None = None,
    region: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Dinosaur)
    if diet:
        query = query.filter(Dinosaur.diet.ilike(diet))
    if period:
        query = query.filter(Dinosaur.period.ilike(f"%{period}%"))
    if region:
        query = query.filter(Dinosaur.region.ilike(f"%{region}%"))
    return query.order_by(Dinosaur.name).all()


@router.get("/{name}/model", response_model=Model3D)
def get_model(name: str, db: Session = Depends(get_db)):
    dinosaur = db.query(Dinosaur).filter(Dinosaur.name.ilike(name)).one_or_none()
    if dinosaur is None:
        raise HTTPException(status_code=404, detail=f"No dinosaur found with name '{name}'")
    return dinosaur


@router.get("/{name}", response_model=DinosaurDetail)
def get_dinosaur(name: str, db: Session = Depends(get_db)):
    dinosaur = db.query(Dinosaur).filter(Dinosaur.name.ilike(name)).one_or_none()
    if dinosaur is None:
        raise HTTPException(status_code=404, detail=f"No dinosaur found with name '{name}'")
    return dinosaur
