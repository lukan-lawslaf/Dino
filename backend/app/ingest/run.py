import logging

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.ingest.pbdb_client import fetch_occurrences
from app.ingest.sources import load_facts_csv, load_stats_csv, merge_sources
from app.ingest.wikipedia_client import fetch_images
from app.models import Dinosaur, FossilOccurrence

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def upsert_dinosaur(db, key: str, data: dict) -> Dinosaur:
    dinosaur = db.query(Dinosaur).filter(Dinosaur.name == data["name"]).one_or_none()
    if dinosaur is None:
        dinosaur = Dinosaur(name=data["name"])
        db.add(dinosaur)

    for field in (
        "diet", "type", "family", "class_name", "region", "period",
        "length_m", "weight", "taxonomy", "named_by", "species", "link",
    ):
        setattr(dinosaur, field, data[field])
    db.flush()

    db.query(FossilOccurrence).filter(FossilOccurrence.dinosaur_id == dinosaur.id).delete()
    return dinosaur


def run():
    Base.metadata.create_all(bind=engine)

    facts_path = settings.resolve_path(settings.dino_facts_csv)
    stats_path = settings.resolve_path(settings.dino_stats_csv)
    logger.info("Loading facts CSV from %s", facts_path)
    facts = load_facts_csv(facts_path)
    logger.info("Loading stats CSV from %s", stats_path)
    stats = load_stats_csv(stats_path)

    merged = merge_sources(facts, stats)
    logger.info("Merged %d unique dinosaur genera", len(merged))

    logger.info("Fetching Wikipedia images (batched)")
    images = fetch_images([data["name"] for data in merged.values()])

    db = SessionLocal()
    total_occurrences = 0
    empty_pbdb = 0
    no_image = 0
    try:
        for i, (key, data) in enumerate(merged.items(), start=1):
            dinosaur = upsert_dinosaur(db, key, data)

            image = images.get(data["name"].lower(), {})
            dinosaur.image_url = image.get("image_url")
            dinosaur.image_thumb_url = image.get("image_thumb_url")
            dinosaur.wikipedia_url = image.get("wikipedia_url")
            if not image.get("image_thumb_url"):
                no_image += 1

            occurrences = fetch_occurrences(data["name"])
            if not occurrences:
                empty_pbdb += 1
            for occ in occurrences:
                db.add(FossilOccurrence(dinosaur_id=dinosaur.id, **occ))
            total_occurrences += len(occurrences)

            db.commit()
            if i % 25 == 0 or i == len(merged):
                logger.info("Processed %d/%d genera", i, len(merged))
    finally:
        db.close()

    logger.info(
        "Ingestion complete: %d dinosaurs, %d fossil occurrences, "
        "%d genera with no PBDB data, %d with no image",
        len(merged), total_occurrences, empty_pbdb, no_image,
    )


if __name__ == "__main__":
    run()
