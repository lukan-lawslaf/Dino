import logging
import time

import requests

from app.config import settings

logger = logging.getLogger(__name__)


def _to_float(value) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def fetch_occurrences(genus: str) -> list[dict]:
    """Fetch PBDB fossil occurrences for a genus. Never raises; returns [] on any failure or empty result."""
    params = {"base_name": genus, "show": "full", "vocab": "pbdb"}
    try:
        response = requests.get(settings.pbdb_base_url, params=params, timeout=15)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("PBDB fetch failed for genus=%s: %s", genus, exc)
        return []
    finally:
        time.sleep(settings.pbdb_request_delay_seconds)

    records = payload.get("records") or []
    occurrences = []
    for record in records:
        occurrences.append(
            {
                "occurrence_no": record.get("occurrence_no"),
                "lat": _to_float(record.get("lat")),
                "lng": _to_float(record.get("lng")),
                "early_interval": record.get("early_interval"),
                "late_interval": record.get("late_interval"),
                "max_ma": _to_float(record.get("max_ma")),
                "min_ma": _to_float(record.get("min_ma")),
                "formation": record.get("formation"),
                "country_or_region": record.get("state") or record.get("cc"),
                "collection_name": record.get("collection_name"),
            }
        )
    return occurrences
