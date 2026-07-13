import logging
import time

import requests

logger = logging.getLogger(__name__)

WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"
BATCH_SIZE = 50
REQUEST_DELAY_SECONDS = 1.0
MAX_RETRIES = 5
THUMB_SIZE = 400
# Wikimedia asks all API clients to send a descriptive User-Agent.
HEADERS = {"User-Agent": "DinosaurFossilAPI/0.1 (ingestion script; contact: admin@localhost)"}

EMPTY = {"image_url": None, "image_thumb_url": None, "wikipedia_url": None}


def _chunks(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _request_with_retry(params: dict) -> dict | None:
    """GET the API with exponential backoff on 429/5xx, honoring Retry-After.
    Returns parsed JSON, or None if every attempt failed."""
    backoff = 2.0
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(WIKIPEDIA_API_URL, params=params, headers=HEADERS, timeout=20)
            if response.status_code == 429 or response.status_code >= 500:
                retry_after = response.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else backoff
                logger.warning(
                    "Wikipedia %s (attempt %d/%d), waiting %.1fs",
                    response.status_code, attempt, MAX_RETRIES, wait,
                )
                time.sleep(wait)
                backoff = min(backoff * 2, 30.0)
                continue
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.warning("Wikipedia request error (attempt %d/%d): %s", attempt, MAX_RETRIES, exc)
            time.sleep(backoff)
            backoff = min(backoff * 2, 30.0)
    return None


def _fetch_batch(names: list[str]) -> dict[str, dict]:
    """Query up to BATCH_SIZE genus names at once. Returns {name_lower: image dict}.
    Never raises; returns {} for the whole batch on persistent failure."""
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages|info",
        "piprop": "thumbnail|original",
        "pithumbsize": THUMB_SIZE,
        "pilimit": len(names),
        "inprop": "url",
        "titles": "|".join(names),
    }
    payload = _request_with_retry(params)
    time.sleep(REQUEST_DELAY_SECONDS)
    if payload is None:
        return {}

    query = payload.get("query", {})
    # Wikipedia may normalize a requested title (case/underscores); map back to what we asked for.
    normalized = {n["to"]: n["from"] for n in query.get("normalized", [])}

    results: dict[str, dict] = {}
    for page in query.get("pages", {}).values():
        title = page.get("title")
        if not title:
            continue
        requested = normalized.get(title, title)
        results[requested.lower()] = {
            "image_url": (page.get("original") or {}).get("source"),
            "image_thumb_url": (page.get("thumbnail") or {}).get("source"),
            "wikipedia_url": page.get("fullurl"),
        }
    return results


def fetch_images(names: list[str]) -> dict[str, dict]:
    """Fetch lead images + Wikipedia page URLs for many genus names via batched API calls.
    Returns {name_lower: {image_url, image_thumb_url, wikipedia_url}} for every input name
    (empties where nothing was found)."""
    out: dict[str, dict] = {name.lower(): dict(EMPTY) for name in names}
    for batch in _chunks(names, BATCH_SIZE):
        out.update(_fetch_batch(batch))
    return out
