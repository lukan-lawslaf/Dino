import logging
import time

import requests

logger = logging.getLogger(__name__)

SKETCHFAB_SEARCH_URL = "https://api.sketchfab.com/v3/search"
# Only permissive licenses: CC0 (public domain) and CC-BY (attribution).
LICENSES = "cc0,by"
REQUEST_DELAY_SECONDS = 0.4
HEADERS = {"User-Agent": "DinosaurFossilAPI/0.1 (ingestion script; contact: admin@localhost)"}

EMPTY = {"model_3d_url": None, "model_3d_source_url": None, "model_3d_attribution": None}

LICENSE_LABEL = {"cc0": "CC0", "by": "CC-BY"}


def find_model(genus: str) -> dict:
    """Find a CC0/CC-BY 3D model for a genus via the Sketchfab API.
    Returns {model_3d_url (embed), model_3d_source_url (viewer page), model_3d_attribution}.
    Never raises; returns empties when nothing suitable is found."""
    params = {
        "type": "models",
        "q": genus,
        "licenses": LICENSES,
        "count": 1,
        "sort_by": "-likeCount",  # prefer the most-liked (usually highest quality) model
    }
    try:
        response = requests.get(SKETCHFAB_SEARCH_URL, params=params, headers=HEADERS, timeout=20)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Sketchfab fetch failed for genus=%s: %s", genus, exc)
        return dict(EMPTY)
    finally:
        time.sleep(REQUEST_DELAY_SECONDS)

    results = payload.get("results") or []
    if not results:
        return dict(EMPTY)

    model = results[0]
    author = (model.get("user") or {}).get("displayName") or "Unknown"
    license_slug = (model.get("license") or {}).get("slug") or ""
    license_label = LICENSE_LABEL.get(license_slug, "CC")
    name = model.get("name") or "3D model"

    return {
        "model_3d_url": model.get("embedUrl"),
        "model_3d_source_url": model.get("viewerUrl"),
        "model_3d_attribution": f'"{name}" by {author} ({license_label}, via Sketchfab)',
    }
