import csv
import re
from pathlib import Path


def normalize_name(name: str) -> str:
    return name.strip().lower()


def canonical_name(name: str) -> str:
    return name.strip().title()


def parse_length(raw: str | None) -> float | None:
    if not raw:
        return None
    match = re.search(r"[\d.]+", raw)
    return float(match.group()) if match else None


def load_facts_csv(path: Path) -> dict[str, dict]:
    """hookerhillstudios dinosaurs.csv: occurrence_no,name,diet,type,length_m,max_ma,min_ma,region,lng,lat,class,family
    Aggregated to one facts row per unique dinosaur name (first non-empty value wins)."""
    facts: dict[str, dict] = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            key = normalize_name(row["name"])
            if not key:
                continue
            entry = facts.setdefault(
                key,
                {"diet": None, "type": None, "family": None, "class_name": None, "region": None, "length_m": None},
            )
            if not entry["diet"] and row.get("diet"):
                entry["diet"] = row["diet"]
            if not entry["type"] and row.get("type"):
                entry["type"] = row["type"]
            if not entry["family"] and row.get("family"):
                entry["family"] = row["family"]
            if not entry["class_name"] and row.get("class"):
                entry["class_name"] = row["class"]
            if not entry["region"] and row.get("region"):
                entry["region"] = row["region"]
            if entry["length_m"] is None and row.get("length_m"):
                try:
                    entry["length_m"] = float(row["length_m"])
                except ValueError:
                    pass
    return facts


def load_stats_csv(path: Path) -> dict[str, dict]:
    """Kaggle archive.zip data.csv: name,diet,period,lived_in,type,length,taxonomy,named_by,species,link"""
    stats: dict[str, dict] = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            key = normalize_name(row["name"])
            if not key:
                continue
            stats[key] = {
                "diet": row.get("diet") or None,
                "type": row.get("type") or None,
                "region": row.get("lived_in") or None,
                "period": row.get("period") or None,
                "length_m": parse_length(row.get("length")),
                "taxonomy": row.get("taxonomy") or None,
                "named_by": row.get("named_by") or None,
                "species": row.get("species") or None,
                "link": row.get("link") or None,
            }
    return stats


def merge_sources(facts: dict[str, dict], stats: dict[str, dict]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for key in sorted(set(facts) | set(stats)):
        f = facts.get(key, {})
        s = stats.get(key, {})
        merged[key] = {
            "name": canonical_name(key),
            "diet": s.get("diet") or f.get("diet"),
            "type": s.get("type") or f.get("type"),
            "family": f.get("family"),
            "class_name": f.get("class_name"),
            "region": s.get("region") or f.get("region"),
            "period": s.get("period"),
            "length_m": s.get("length_m") if s.get("length_m") is not None else f.get("length_m"),
            "weight": None,
            "taxonomy": s.get("taxonomy"),
            "named_by": s.get("named_by"),
            "species": s.get("species"),
            "link": s.get("link"),
        }
    return merged
