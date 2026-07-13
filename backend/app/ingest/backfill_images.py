"""One-off backfill: populate image fields on an already-ingested database
without re-running the slow PBDB fetch. Safe to re-run; skips genera that
already have an image unless --force is passed.

Usage:  python -m app.ingest.backfill_images [--force]
"""
import logging
import sys

from sqlalchemy import inspect, text

from app.database import Base, SessionLocal, engine
from app.ingest.wikipedia_client import fetch_images
from app.models import Dinosaur

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

NEW_COLUMNS = {
    "image_url": "VARCHAR",
    "image_thumb_url": "VARCHAR",
    "wikipedia_url": "VARCHAR",
}


def ensure_columns():
    """Add the image columns to an existing SQLite table if they're missing."""
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("dinosaurs")}
    with engine.begin() as conn:
        for name, sqltype in NEW_COLUMNS.items():
            if name not in existing:
                logger.info("Adding column dinosaurs.%s", name)
                conn.execute(text(f"ALTER TABLE dinosaurs ADD COLUMN {name} {sqltype}"))


def run(force: bool = False):
    ensure_columns()

    db = SessionLocal()
    found = 0
    missing = 0
    try:
        dinosaurs = db.query(Dinosaur).order_by(Dinosaur.name).all()
        targets = [d for d in dinosaurs if force or not d.image_thumb_url]
        found = len(dinosaurs) - len(targets)  # already-populated rows kept as-is
        total = len(targets)
        logger.info("Fetching images for %d dinosaurs (%d already have one)", total, found)

        images = fetch_images([d.name for d in targets])

        for i, dinosaur in enumerate(targets, start=1):
            image = images.get(dinosaur.name.lower(), {})
            dinosaur.image_url = image.get("image_url")
            dinosaur.image_thumb_url = image.get("image_thumb_url")
            dinosaur.wikipedia_url = image.get("wikipedia_url")
            if image.get("image_thumb_url"):
                found += 1
            else:
                missing += 1
            if i % 100 == 0 or i == total:
                db.commit()
                logger.info("Saved %d/%d dinosaurs", i, total)
        db.commit()
    finally:
        db.close()

    logger.info("Image backfill complete: %d with image, %d without", found, missing)


if __name__ == "__main__":
    run(force="--force" in sys.argv)
