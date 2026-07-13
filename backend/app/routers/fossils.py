from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dinosaur
from app.schemas import FossilOccurrenceOut

router = APIRouter(prefix="/fossils", tags=["fossils"])


@router.get("/{name}", response_model=list[FossilOccurrenceOut])
def get_fossils(name: str, db: Session = Depends(get_db)):
    dinosaur = db.query(Dinosaur).filter(Dinosaur.name.ilike(name)).one_or_none()
    if dinosaur is None:
        raise HTTPException(status_code=404, detail=f"No dinosaur found with name '{name}'")
    return dinosaur.fossil_occurrences
