import logging
import re
import time
from datetime import datetime, timezone

import feedparser
import requests

logger = logging.getLogger(__name__)

REQUEST_DELAY_SECONDS = 0.5

NEWSAPI_URL = "https://newsapi.org/v2/everything"

# A browser-ish UA — many publishers reject the default python-requests agent when we
# scrape their page for an og:image.
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# An article is kept only if its title/summary mentions one of these...
RELEVANT_KEYWORDS = (
    "dinosaur", "dino ", "dino,", "paleontolog", "palaeontolog", "fossil",
    "tyrannosaur", "t. rex", "t.rex", "sauropod", "theropod", "jurassic",
    "cretaceous", "triassic", "prehistoric", "plesiosaur", "pterosaur",
    "velociraptor", "triceratops", "stegosaurus", "brachiosaurus",
)
# ...and only if it does NOT mention one of these (guards against "fossil fuels" etc.).
IRRELEVANT_PHRASES = (
    "fossil fuel", "climate change", "supreme court", "halloween",
    "solar-powered", "electric vehicle", "natural gas", "carbon emission",
)


def _to_iso(entry) -> str | None:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    try:
        return datetime(*parsed[:6], tzinfo=timezone.utc).isoformat()
    except (TypeError, ValueError):
        return None


def _extract_image(entry) -> str | None:
    thumbs = entry.get("media_thumbnail")
    if thumbs:
        return thumbs[0].get("url")
    for enc in entry.get("enclosures") or []:
        if str(enc.get("type", "")).startswith("image/") or enc.get("href", "").lower().endswith(
            (".jpg", ".jpeg", ".png", ".gif")
        ):
            return enc.get("href")
    return None


def fetch_feed(source_name: str, url: str) -> list[dict]:
    """Fetch and normalize one RSS/Atom feed. Never raises; returns [] on any failure."""
    try:
        parsed = feedparser.parse(url)
        if parsed.bozo and not parsed.entries:
            # bozo=True with entries present usually just means minor XML quirks (tolerated);
            # bozo=True with no entries means the fetch/parse genuinely failed.
            raise parsed.bozo_exception or ValueError("feed parse failed")
    except Exception as exc:  # feedparser can raise a variety of things depending on transport
        logger.warning("News feed fetch failed for source=%s url=%s: %s", source_name, url, exc)
        return []
    finally:
        time.sleep(REQUEST_DELAY_SECONDS)

    articles = []
    for entry in parsed.entries:
        link = entry.get("link")
        title = entry.get("title")
        if not link or not title:
            continue
        articles.append(
            {
                "title": title,
                "link": link,
                "summary": entry.get("summary"),
                "image_url": _extract_image(entry),
                "source_name": source_name,
                "published_at": _to_iso(entry),
            }
        )
    return articles


def fetch_all_feeds(feeds: list[tuple[str, str]]) -> list[dict]:
    """feeds: [(source_name, url), ...]. Returns combined, normalized article list."""
    all_articles = []
    for source_name, url in feeds:
        articles = fetch_feed(source_name, url)
        logger.info("Fetched %d articles from %s", len(articles), source_name)
        all_articles.extend(articles)
    return all_articles


def _is_relevant(article: dict) -> bool:
    """Keyword gate for web-wide search results.

    NewsAPI's full-text search is loose ('dinosaur' matches theme-park news, a bare
    'fossil' matches 'fossil fuels'). This keeps articles that actually talk about
    dinosaurs/palaeontology and drops the obvious noise.
    """
    text = f"{article.get('title') or ''} {article.get('summary') or ''}".lower()
    if any(phrase in text for phrase in IRRELEVANT_PHRASES):
        return False
    return any(keyword in text for keyword in RELEVANT_KEYWORDS)


def fetch_newsapi(query: str, api_key: str, page_size: int = 100) -> list[dict]:
    """Search the whole web via NewsAPI.org, normalized to the same dict shape as
    fetch_feed. Never raises; returns [] on any failure.

    sortBy=relevancy (not publishedAt) matters: with publishedAt the query's relevance
    collapses and results fill with off-topic padding. We sort by date later instead.
    """
    try:
        resp = requests.get(
            NEWSAPI_URL,
            params={
                "q": query,
                "language": "en",
                "sortBy": "relevancy",
                "pageSize": min(page_size, 100),
            },
            headers={"X-Api-Key": api_key, "User-Agent": BROWSER_UA},
            timeout=20,
        )
    except requests.RequestException as exc:
        logger.warning("NewsAPI request failed: %s", exc)
        return []

    if resp.status_code != 200:
        # 401 bad key, 429 rate limit, 426 plan restriction, ...
        logger.warning("NewsAPI returned %s: %s", resp.status_code, resp.text[:200])
        return []

    try:
        payload = resp.json()
    except ValueError as exc:
        logger.warning("NewsAPI returned non-JSON response: %s", exc)
        return []

    if payload.get("status") != "ok":
        logger.warning("NewsAPI error: %s", payload.get("message"))
        return []

    articles = []
    for item in payload.get("articles") or []:
        title = (item.get("title") or "").strip()
        link = item.get("url")
        # NewsAPI uses "[Removed]" for articles pulled after publication.
        if not title or not link or title == "[Removed]":
            continue
        source = (item.get("source") or {}).get("name") or "Unknown"
        normalized = {
            "title": title,
            "link": link,
            "summary": item.get("description"),
            # urlToImage is often null or a tiny thumbnail; refresh_news fills gaps
            # from the article page's og:image.
            "image_url": item.get("urlToImage"),
            "source_name": source,
            "published_at": item.get("publishedAt"),
        }
        if _is_relevant(normalized):
            articles.append(normalized)

    logger.info(
        "NewsAPI: %d raw results, %d relevant kept",
        len(payload.get("articles") or []),
        len(articles),
    )
    return articles


_OG_IMAGE_PATTERNS = (
    # <meta property="og:image" content="...">  (attribute order as written)
    re.compile(
        r'<meta[^>]+(?:property|name)=["\'](?:og:image|og:image:url|twitter:image)["\']'
        r'[^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    ),
    # <meta content="..." property="og:image">  (content first)
    re.compile(
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+'
        r'(?:property|name)=["\'](?:og:image|og:image:url|twitter:image)["\']',
        re.IGNORECASE,
    ),
)


def extract_og_image(url: str) -> str | None:
    """Scrape the social-preview image from an article page. Never raises.

    Used only for articles whose feed result carried no image.
    """
    try:
        resp = requests.get(url, headers={"User-Agent": BROWSER_UA}, timeout=12)
        if resp.status_code != 200 or "html" not in resp.headers.get("content-type", ""):
            return None
        html = resp.text
    except requests.RequestException as exc:
        logger.debug("og:image fetch failed for %s: %s", url, exc)
        return None
    finally:
        time.sleep(REQUEST_DELAY_SECONDS)

    for pattern in _OG_IMAGE_PATTERNS:
        match = pattern.search(html)
        if match:
            image = match.group(1).strip()
            if image.startswith(("http://", "https://")):
                return image
    return None
