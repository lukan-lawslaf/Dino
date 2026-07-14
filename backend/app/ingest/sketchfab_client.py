import logging
import re
import time

import requests

logger = logging.getLogger(__name__)

SKETCHFAB_SEARCH_URL = "https://api.sketchfab.com/v3/search"
# Only permissive licenses: CC0 (public domain) and CC-BY (attribution).
LICENSES = "cc0,by"
REQUEST_DELAY_SECONDS = 0.4
MAX_ATTEMPTS = 3
HEADERS = {"User-Agent": "DinosaurFossilAPI/0.1 (ingestion script; contact: admin@localhost)"}

EMPTY = {"model_3d_url": None, "model_3d_source_url": None, "model_3d_attribution": None}

LICENSE_LABEL = {"CC0 Public Domain": "CC0", "CC Attribution": "CC-BY"}

# Search results can mention a genus in their tags while showing an unrelated
# model. Do not surface comparison scenes, toys, or game assets as specimens.
REJECTED_TITLE_TERMS = re.compile(
    r"\b("
    r"comparison|vs\.?|fight|challenge|lego|toy|figure|figurine|plush|cartoon|chibi|"
    r"jurassic park|jurassic world|jwa|jwe|the isle|ark|primal carnage|"
    r"deadly shores|dino hunter|mod|skin"
    r")\b",
    re.IGNORECASE,
)


def _contains_genus(text: str, genus: str) -> bool:
    """Match a full genus name, not a substring of another word."""
    return bool(re.search(rf"(?<![a-z]){re.escape(genus)}(?![a-z])", text, re.IGNORECASE))


def _model_score(model: dict, genus: str) -> int | None:
    """Return a quality score for a direct genus match, or None when unsafe."""
    title = str(model.get("name") or "")
    if not _contains_genus(title, genus) or REJECTED_TITLE_TERMS.search(title):
        return None

    tags = " ".join(str(tag.get("name") or "") for tag in (model.get("tags") or []))
    score = 1_000
    if re.match(rf"^{re.escape(genus)}(?![a-z])", title, re.IGNORECASE):
        score += 200
    if _contains_genus(tags, genus):
        score += 40
    # Likes are only a tie-breaker after the direct taxonomic checks above.
    score += min(int(model.get("likeCount") or 0), 100)
    return score


def find_model(genus: str) -> dict:
    """Find a CC0/CC-BY 3D model for a genus via the Sketchfab API.
    Returns {model_3d_url (embed), model_3d_source_url (viewer page), model_3d_attribution}.
    Never raises; returns empties when nothing suitable is found."""
    params = {
        "type": "models",
        "q": genus,
        "licenses": LICENSES,
        "count": 24,
        "sort_by": "-likeCount",
    }
    payload = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = requests.get(SKETCHFAB_SEARCH_URL, params=params, headers=HEADERS, timeout=20)
            response.raise_for_status()
            payload = response.json()
            break
        except (requests.RequestException, ValueError) as exc:
            if attempt == MAX_ATTEMPTS:
                logger.warning("Sketchfab fetch failed for genus=%s: %s", genus, exc)
                return dict(EMPTY)
            wait_seconds = REQUEST_DELAY_SECONDS * attempt * 4
            logger.info(
                "Sketchfab fetch failed for genus=%s (attempt %d/%d); retrying in %.1fs",
                genus,
                attempt,
                MAX_ATTEMPTS,
                wait_seconds,
            )
            time.sleep(wait_seconds)
        finally:
            time.sleep(REQUEST_DELAY_SECONDS)

    results = (payload or {}).get("results") or []
    candidates = [
        (score, model)
        for model in results
        if (score := _model_score(model, genus)) is not None
    ]
    if not candidates:
        logger.info("No direct Sketchfab model match for genus=%s", genus)
        return dict(EMPTY)

    _, model = max(candidates, key=lambda candidate: candidate[0])
    author = (model.get("user") or {}).get("displayName") or "Unknown"
    license_name = (model.get("license") or {}).get("label") or ""
    license_label = LICENSE_LABEL.get(license_name, "Creative Commons")
    name = model.get("name") or "3D model"

    return {
        "model_3d_url": model.get("embedUrl"),
        "model_3d_source_url": model.get("viewerUrl"),
        "model_3d_attribution": f'"{name}" by {author} ({license_label}, via Sketchfab)',
    }
