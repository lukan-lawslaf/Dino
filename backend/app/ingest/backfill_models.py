"""Backfill 3D model embeds (Sketchfab, CC0/CC-BY only) onto an already-ingested
database. By default it only queries a curated list of famous genera (fast); pass
--all to attempt every dinosaur in the DB. Safe to re-run; skips genera that
already have a model unless --force is passed.

Usage:  python -m app.ingest.backfill_models [--all] [--force]

Use --force after changing the matching rules. It deliberately clears any
existing mapping for which Sketchfab no longer has a direct, safe genus match.
"""
import logging
import sys

from sqlalchemy import inspect, text

from app.database import Base, SessionLocal, engine
from app.ingest.sketchfab_client import find_model
from app.models import Dinosaur

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

NEW_COLUMNS = {
    "model_3d_url": "VARCHAR",
    "model_3d_source_url": "VARCHAR",
    "model_3d_attribution": "VARCHAR",
}

# Well-known genera most likely to have good-quality CC 3D models.
FAMOUS = [
    "Tyrannosaurus", "Triceratops", "Velociraptor", "Stegosaurus", "Spinosaurus",
    "Brachiosaurus", "Diplodocus", "Allosaurus", "Ankylosaurus", "Parasaurolophus",
    "Apatosaurus", "Brontosaurus", "Carnotaurus", "Giganotosaurus", "Iguanodon",
    "Pachycephalosaurus", "Compsognathus", "Deinonychus", "Dilophosaurus", "Gallimimus",
    "Therizinosaurus", "Utahraptor", "Baryonyx", "Suchomimus", "Styracosaurus",
    "Protoceratops", "Oviraptor", "Microraptor", "Archaeopteryx", "Dimetrodon",
    "Pteranodon", "Quetzalcoatlus", "Mosasaurus", "Plesiosaurus", "Elasmosaurus",
    "Argentinosaurus", "Mamenchisaurus", "Kentrosaurus", "Edmontosaurus", "Corythosaurus",
    "Maiasaura", "Sauropelta", "Nodosaurus", "Coelophysis", "Ceratosaurus",
    "Megalosaurus", "Troodon", "Ornithomimus", "Struthiomimus", "Sinosauropteryx",
    "Yutyrannus", "Concavenator", "Cryolophosaurus", "Herrerasaurus", "Plateosaurus",
    "Brachylophosaurus", "Psittacosaurus", "Sauroposeidon", "Amargasaurus", "Nigersaurus",
]


def ensure_columns():
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("dinosaurs")}
    with engine.begin() as conn:
        for name, sqltype in NEW_COLUMNS.items():
            if name not in existing:
                logger.info("Adding column dinosaurs.%s", name)
                conn.execute(text(f"ALTER TABLE dinosaurs ADD COLUMN {name} {sqltype}"))


def run(sweep_all: bool = False, force: bool = False):
    ensure_columns()

    db = SessionLocal()
    found = 0
    missing = 0
    try:
        if sweep_all:
            candidates = db.query(Dinosaur).order_by(Dinosaur.name).all()
        else:
            candidates = (
                db.query(Dinosaur)
                .filter(Dinosaur.name.in_(FAMOUS))
                .order_by(Dinosaur.name)
                .all()
            )

        targets = [d for d in candidates if force or not d.model_3d_url]
        total = len(targets)
        logger.info(
            "Querying Sketchfab for %d genera (%s set)", total, "all" if sweep_all else "famous"
        )

        for i, dinosaur in enumerate(targets, start=1):
            model = find_model(dinosaur.name)
            dinosaur.model_3d_url = model["model_3d_url"]
            dinosaur.model_3d_source_url = model["model_3d_source_url"]
            dinosaur.model_3d_attribution = model["model_3d_attribution"]
            if model["model_3d_url"]:
                found += 1
            else:
                missing += 1
            db.commit()
            if i % 10 == 0 or i == total:
                logger.info("Processed %d/%d genera", i, total)
    finally:
        db.close()

    logger.info("3D model backfill complete: %d with model, %d without", found, missing)


if __name__ == "__main__":
    run(sweep_all="--all" in sys.argv, force="--force" in sys.argv)
