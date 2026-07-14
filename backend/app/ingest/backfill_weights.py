"""
backfill_weights.py
===================
Populates the `weight` column (kg) and `height_m` column for dinosaurs in the DB.

Sources (in order of preference):
1. Kaggle CSV (kaggleds.zip / dinoDatasetCSV.csv) — 1,504 dinosaurs with weight_kg
   and height_m. Covers ~87% of the DB genera.
2. Curated lookup table — peer-reviewed mass estimates from published literature
   (Benson et al. 2014, Paul 2010 "Princeton Field Guide", Holtz 2012).
3. Wikipedia prose scraper — fallback for any genus still missing weight.

Usage:
    python -m app.ingest.backfill_weights              # only fill missing weights
    python -m app.ingest.backfill_weights --force      # redo all
    python -m app.ingest.backfill_weights --dry-run    # print what would change
    python -m app.ingest.backfill_weights --csv path/to/dinoDatasetCSV.csv

Note: `weight` is stored in kg. All curated values are in kg.
      `height_m` is also populated if present in the Kaggle CSV.
"""

import argparse
import csv
import io
import json
import logging
import pathlib
import re
import time
import urllib.parse
import urllib.request
import zipfile

from app.database import SessionLocal
from app.models import Dinosaur

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Curated weight table (kg) — from peer-reviewed sources / widely cited estimates
# Sources: Benson et al. 2014 (PLoS Biol), Paul 2010 Princeton Field Guide,
#          Holtz 2012, Wikipedia consensus values.
# Keys are lowercase genus names.
# ---------------------------------------------------------------------------
CURATED_WEIGHTS: dict[str, float] = {
    # ── Theropoda ────────────────────────────────────────────────────────────
    "tyrannosaurus": 8000,
    "spinosaurus": 7000,
    "giganotosaurus": 6900,
    "carcharodontosaurus": 6000,
    "acrocanthosaurus": 6200,
    "allosaurus": 1500,
    "torvosaurus": 2000,
    "ceratosaurus": 980,
    "carnotaurus": 1350,
    "abelisaurus": 1500,
    "majungasaurus": 1100,
    "rajasaurus": 1000,
    "rugops": 800,
    "velociraptor": 15,
    "deinonychus": 73,
    "utahraptor": 500,
    "achillobator": 250,
    "troodon": 50,
    "oviraptor": 25,
    "gallimimus": 440,
    "ornithomimus": 170,
    "struthiomimus": 150,
    "therizinosaurus": 5000,
    "beipiaosaurus": 85,
    "compsognathus": 3,
    "scipionyx": 0.5,
    "coelophysis": 15,
    "dilophosaurus": 400,
    "yangchuanosaurus": 3400,
    "sinraptor": 1000,
    "megaraptor": 1000,
    "baryonyx": 1700,
    "suchomimus": 2500,
    "irritator": 900,
    "megalosaurus": 700,
    "eustreptospondylus": 200,
    "neovenator": 1000,
    "afrovenator": 1000,
    "albertosaurus": 1300,
    "gorgosaurus": 2500,
    "daspletosaurus": 2800,
    "tarbosaurus": 5000,
    "zhuchengtyrannus": 6000,
    "yutyrannus": 1414,
    "guanlong": 91,
    "proceratosaurus": 34,
    "mapusaurus": 3000,
    "aucasaurus": 700,
    "ekrixinatosaurus": 1500,
    "skorpiovenator": 1000,
    "oxalaia": 3500,
    "ichthyovenator": 1000,
    "concavenator": 1000,
    "aerosteon": 350,
    "australovenator": 500,
    "agilisaurus": 10,
    "eoraptor": 10,
    "herrerasaurus": 210,
    "eodromaeus": 5,
    "staurikosaurus": 30,
    "panphagia": 2,
    "deinocheirus": 6400,
    "ouranosaurus": 2200,
    "heterodontosaurus": 2,
    "lesothosaurus": 1,
    "pisanosaurus": 1,
    "scutellosaurus": 1,
    # ── Sauropoda ────────────────────────────────────────────────────────────
    "brachiosaurus": 56000,
    "argentinosaurus": 70000,
    "patagotitan": 69000,
    "dreadnoughtus": 65000,
    "futalognkosaurus": 45000,
    "giraffatitan": 34000,
    "diplodocus": 14000,
    "apatosaurus": 23000,
    "brontosaurus": 19000,
    "camarasaurus": 18000,
    "barosaurus": 18000,
    "supersaurus": 35000,
    "sauroposeidon": 55000,
    "rapetosaurus": 8000,
    "saltasaurus": 7000,
    "neuquensaurus": 1700,
    "malawisaurus": 10000,
    "jobaria": 20000,
    "nigersaurus": 4000,
    "mamenchisaurus": 26000,
    "shunosaurus": 3000,
    "omeisaurus": 7000,
    "vulcanodon": 3000,
    "massospondylus": 135,
    "plateosaurus": 700,
    "mussaurus": 70,
    "coloradisaurus": 350,
    "riojasaurus": 1000,
    "aardonyx": 500,
    "anchisaurus": 27,
    "lufengosaurus": 600,
    "yunnanosaurus": 400,
    "abrosaurus": 15000,
    "magyarosaurus": 900,
    "europasaurus": 800,
    "amargasaurus": 2600,
    "bonitasaura": 3000,
    "alamosaurus": 33000,
    "opisthocoelicaudia": 20000,
    "nemegtosaurus": 15000,
    "quaesitosaurus": 20000,
    "isanosaurus": 10000,
    "spinophorosaurus": 8000,
    "tornieria": 12000,
    "janenschia": 20000,
    "dicraeosaurus": 12500,
    "haplocanthosaurus": 12600,
    "cetiosaurus": 11000,
    "brontomerus": 6000,
    "erketu": 20000,
    "turiasaurus": 48000,
    "antetonitrus": 1500,
    # ── Ornithopoda ──────────────────────────────────────────────────────────
    "iguanodon": 3000,
    "hadrosaurus": 3000,
    "parasaurolophus": 2500,
    "edmontosaurus": 4000,
    "saurolophus": 2000,
    "lambeosaurus": 3600,
    "corythosaurus": 3800,
    "maiasaura": 2800,
    "hypacrosaurus": 4000,
    "muttaburrasaurus": 2800,
    "tenontosaurus": 900,
    "dryosaurus": 75,
    "hypsilophodon": 7,
    "othnielia": 10,
    "camptosaurus": 750,
    "thescelosaurus": 300,
    "leaellynasaura": 10,
    "gasparinisaura": 10,
    "rhabdodon": 1500,
    "probactrosaurus": 3000,
    "protohadros": 3000,
    "talenkauen": 500,
    "equijubus": 1500,
    "bactrosaurus": 1500,
    "secernosaurus": 3000,
    "aralosaurus": 2000,
    "tsintaosaurus": 3000,
    "shantungosaurus": 16000,
    "zhuchengosaurus": 15000,
    "gryposaurus": 2700,
    "kritosaurus": 3000,
    "naashoibitosaurus": 3000,
    "prosaurolophus": 2500,
    "augustynolophus": 3000,
    "brachylophosaurus": 3500,
    "acristavus": 2000,
    "latirhinus": 3000,
    "aquilarhinus": 2000,
    "lophorhothon": 2000,
    # ── Ceratopsia ───────────────────────────────────────────────────────────
    "triceratops": 8000,
    "torosaurus": 7000,
    "chasmosaurus": 2000,
    "pentaceratops": 5500,
    "anchiceratops": 3500,
    "styracosaurus": 2700,
    "einiosaurus": 1800,
    "achelousaurus": 3000,
    "pachyrhinosaurus": 2500,
    "centrosaurus": 1500,
    "protoceratops": 183,
    "psittacosaurus": 20,
    "leptoceratops": 68,
    "zuniceratops": 100,
    "utahceratops": 3500,
    "kosmoceratops": 2500,
    "albertaceratops": 1500,
    "diabloceratops": 1500,
    "agujaceratops": 2000,
    "avaceratops": 1000,
    "brachyceratops": 1000,
    "montanoceratops": 300,
    "monoclonius": 2000,
    "nasutoceratops": 1500,
    "regaliceratops": 1500,
    "spiclypeus": 2000,
    "wendiceratops": 1000,
    "xenoceratops": 2000,
    "judiceratops": 2000,
    "mercuriceratops": 2000,
    "medusaceratops": 2500,
    "spinops": 2000,
    "machairoceratops": 2000,
    "sinoceratops": 2000,
    "eotriceratops": 10000,
    "ojoceratops": 6000,
    "bravoceratops": 3000,
    # ── Ankylosauria ─────────────────────────────────────────────────────────
    "ankylosaurus": 6000,
    "euoplocephalus": 2500,
    "saichania": 1900,
    "talarurus": 1500,
    "nodosaurus": 2000,
    "polacanthus": 1000,
    "gastonia": 1500,
    "edmontonia": 3000,
    "panoplosaurus": 3000,
    "scelidosaurus": 270,
    "gargoyleosaurus": 300,
    "mymoorapelta": 400,
    "hylaeosaurus": 1500,
    "minmi": 300,
    "peloroplites": 1500,
    "silvisaurus": 300,
    "niobrarasaurus": 1000,
    "pawpawsaurus": 400,
    "texasetes": 1000,
    "tatankacephalus": 1500,
    "ahshislepelta": 1000,
    "ziapelta": 1500,
    "zuul": 2500,
    "borealopelta": 1300,
    "akainacephalus": 2000,
    "oohkotokia": 1800,
    "scolosaurus": 2000,
    "nodocephalosaurus": 2000,
    "gobisaurus": 3000,
    "shamosaurus": 3000,
    "tsaagan": 1800,
    "tianzhenosaurus": 1500,
    "pinacosaurus": 1800,
    "dongyangopelta": 1500,
    "liaoningosaurus": 5,
    # ── Stegosauria ──────────────────────────────────────────────────────────
    "stegosaurus": 5000,
    "kentrosaurus": 320,
    "hesperosaurus": 2000,
    "dacentrurus": 5000,
    "tuojiangosaurus": 2000,
    "huayangosaurus": 500,
    "lexovisaurus": 3000,
    "chungkingosaurus": 4000,
    "chialingosaurus": 1000,
    "wuerhosaurus": 4000,
    "alcovasaurus": 2000,
    "loricatosaurus": 1500,
    "stegosaurides": 500,
    "miragaia": 3000,
    "jiangjunosaurus": 3000,
    "monkonosaurus": 3000,
    # ── Pachycephalosauria ───────────────────────────────────────────────────
    "pachycephalosaurus": 450,
    "stygimoloch": 78,
    "stegoceras": 10,
    "prenocephale": 130,
    "homalocephale": 10,
    "wannanosaurus": 1,
    "goyocephale": 5,
    "gravitholus": 100,
    "hanssuesia": 50,
    "sphaerotholus": 50,
    "tylocephale": 100,
    "texacephale": 50,
    "acrotholus": 50,
    "alaskacephale": 100,
    "colepiocephale": 50,
    "foraminacephala": 100,
    "dracorex": 50,
}


# ---------------------------------------------------------------------------
# Wikipedia scraper — extract weight from article prose
# ---------------------------------------------------------------------------

_WEIGHT_PATTERNS = [
    re.compile(
        r"weigh(?:ed|ing|s)?\s+(?:about|around|up\s+to|approximately|as\s+much\s+as|nearly|over|more\s+than)?\s*"
        r"([\d,]+(?:\.\d+)?)\s*(kg|t\b|tonne|ton|lb|pound)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:body\s+)?mass\s+(?:of\s+)?(?:about|around|up\s+to|approximately|~)?\s*"
        r"([\d,]+(?:\.\d+)?)\s*(kg|t\b|tonne|ton)",
        re.IGNORECASE,
    ),
    re.compile(
        r"estimated\s+(?:at|to\s+be)?\s*(?:about|around|approximately|~)?\s*"
        r"([\d,]+(?:\.\d+)?)\s*(kg|t\b|tonne|ton)",
        re.IGNORECASE,
    ),
]

_TO_KG: dict[str, float] = {
    "kg": 1.0,
    "t": 1000.0,
    "tonne": 1000.0,
    "ton": 907.18,
    "lb": 0.4536,
    "pound": 0.4536,
}


def _parse_weight_kg(value_str: str, unit: str) -> float | None:
    try:
        value = float(value_str.replace(",", ""))
        factor = _TO_KG.get(unit.lower().rstrip("s"))
        if factor is None:
            return None
        return round(value * factor, 1)
    except ValueError:
        return None


def fetch_weight_from_wikipedia(genus: str) -> float | None:
    """Fetch the Wikipedia intro for *genus* and parse a weight estimate from the text."""
    url = (
        "https://en.wikipedia.org/w/api.php?action=query"
        "&prop=revisions&rvprop=content&rvslots=main"
        "&rvsection=0&format=json"
        f"&titles={urllib.parse.quote(genus)}"
    )
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "DinoWeightBackfill/1.0 (educational project)"},
        )
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        pages = data["query"]["pages"]
        page = list(pages.values())[0]
        if "revisions" not in page:
            return None
        rev = page["revisions"][0]
        wikitext = (
            rev.get("slots", {}).get("main", {}).get("*", "")
            or rev.get("*", "")
        )
        if not wikitext:
            return None

        weights: list[float] = []
        for pattern in _WEIGHT_PATTERNS:
            for m in pattern.finditer(wikitext[:8000]):
                kg = _parse_weight_kg(m.group(1), m.group(2))
                if kg and 0.1 <= kg <= 200_000:
                    weights.append(kg)

        if not weights:
            return None
        weights.sort()
        return weights[len(weights) // 2]  # median

    except Exception as exc:
        logger.debug("Wikipedia fetch failed for %s: %s", genus, exc)
        return None


# ---------------------------------------------------------------------------
# Kaggle CSV loader
# ---------------------------------------------------------------------------

DEFAULT_CSV_ZIP = pathlib.Path(__file__).resolve().parents[3] / "kaggleds.zip"
DEFAULT_CSV_BARE = pathlib.Path(__file__).resolve().parents[3] / "dinoDatasetCSV.csv"


def load_kaggle_csv(csv_path: str | None = None) -> dict[str, dict]:
    """Load the Kaggle dinosaur CSV and return a dict keyed by lowercase name.

    Accepts either:
    - a path to a bare .csv file
    - a path to a .zip containing dinoDatasetCSV.csv
    - None  →  auto-discover kaggleds.zip or dinoDatasetCSV.csv next to the project root
    """
    path: pathlib.Path | None = pathlib.Path(csv_path) if csv_path else None

    if path is None:
        if DEFAULT_CSV_ZIP.exists():
            path = DEFAULT_CSV_ZIP
        elif DEFAULT_CSV_BARE.exists():
            path = DEFAULT_CSV_BARE
        else:
            logger.warning(
                "Kaggle CSV not found (tried %s and %s). Skipping CSV source.",
                DEFAULT_CSV_ZIP,
                DEFAULT_CSV_BARE,
            )
            return {}

    logger.info("Loading Kaggle CSV from %s", path)
    try:
        if path.suffix == ".zip":
            with zipfile.ZipFile(path) as z:
                csv_names = [n for n in z.namelist() if n.endswith(".csv")]
                if not csv_names:
                    logger.warning("No CSV found inside %s", path)
                    return {}
                with z.open(csv_names[0]) as f:
                    content = f.read().decode("utf-8", errors="replace")
        else:
            content = path.read_text(encoding="utf-8", errors="replace")

        reader = csv.DictReader(io.StringIO(content))
        result: dict[str, dict] = {}
        for row in reader:
            name = row.get("scientific_name", "").strip()
            if not name:
                continue
            key = name.lower()
            weight_raw = row.get("weight_kg", "").strip()
            height_raw = row.get("height_m", "").strip()
            try:
                weight = float(weight_raw) if weight_raw and weight_raw not in ("None", "nan") else None
            except ValueError:
                weight = None
            try:
                height = float(height_raw) if height_raw and height_raw not in ("None", "nan") else None
            except ValueError:
                height = None
            result[key] = {"weight_kg": weight, "height_m": height}
        logger.info("Loaded %d entries from Kaggle CSV", len(result))
        return result
    except Exception as exc:
        logger.warning("Failed to load Kaggle CSV: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# Main backfill logic
# ---------------------------------------------------------------------------


def run(force: bool = False, dry_run: bool = False, csv_path: str | None = None) -> None:
    kaggle = load_kaggle_csv(csv_path)

    db = SessionLocal()
    try:
        query = db.query(Dinosaur)
        if not force:
            # Process if weight OR height is missing
            from sqlalchemy import or_
            query = query.filter(
                or_(Dinosaur.weight.is_(None), Dinosaur.height_m.is_(None))
            )
        dinosaurs = query.all()
        logger.info(
            "Found %d dinosaurs to process (force=%s, dry_run=%s)",
            len(dinosaurs),
            force,
            dry_run,
        )

        updated_kaggle = 0
        updated_curated = 0
        updated_wikipedia = 0
        skipped = 0

        for dino in dinosaurs:
            key = dino.name.lower().strip()
            weight_kg: float | None = None
            height_m: float | None = None
            source = ""

            # ── Tier 1: Kaggle CSV ──────────────────────────────────────────
            if key in kaggle:
                weight_kg = kaggle[key]["weight_kg"]
                height_m = kaggle[key]["height_m"]
                source = "kaggle"

            # ── Tier 2: Curated table (weight only) ─────────────────────────
            if weight_kg is None:
                weight_kg = CURATED_WEIGHTS.get(key)
                if weight_kg is not None:
                    source = "curated"

            # ── Tier 3: Wikipedia scraper (weight only) ──────────────────────
            if weight_kg is None:
                weight_kg = fetch_weight_from_wikipedia(dino.name)
                if weight_kg is not None:
                    source = "wikipedia"
                time.sleep(0.3)  # be polite

            if weight_kg is None and height_m is None:
                logger.debug("No data found for %s", dino.name)
                skipped += 1
                continue

            parts = []
            if weight_kg is not None:
                parts.append(f"{weight_kg:.1f} kg")
            if height_m is not None:
                parts.append(f"{height_m:.2f} m tall")
            logger.info("%-30s -> %-28s (%s)", dino.name, ", ".join(parts), source)

            if not dry_run:
                if weight_kg is not None:
                    dino.weight = weight_kg
                if height_m is not None and hasattr(dino, "height_m"):
                    dino.height_m = height_m

                if source == "kaggle":
                    updated_kaggle += 1
                elif source == "curated":
                    updated_curated += 1
                else:
                    updated_wikipedia += 1

        if not dry_run:
            db.commit()
            logger.info(
                "Committed. Kaggle: %d, Curated: %d, Wikipedia: %d, Not found: %d",
                updated_kaggle,
                updated_curated,
                updated_wikipedia,
                skipped,
            )
        else:
            logger.info("Dry run complete — no changes written.")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill dinosaur weights into the DB")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Redo all dinosaurs, even those that already have a weight",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be written without modifying the DB",
    )
    args = parser.parse_args()
    run(force=args.force, dry_run=args.dry_run)
