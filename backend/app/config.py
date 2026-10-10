from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    pbdb_base_url: str = "https://paleobiodb.org/data1.2/occs/list.json"
    pbdb_request_delay_seconds: float = 0.5
    database_url: str = "sqlite:///./dinosaurs.db"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,https://*.onrender.com"
    dino_facts_csv: str = "../dino_facts.csv"
    dino_stats_csv: str = "../dino_stats.csv"
    news_feeds: str = (
        "ScienceDaily|https://www.sciencedaily.com/rss/fossils_ruins/dinosaurs.xml,"
        "BBC|https://feeds.bbci.co.uk/news/topics/c1xp198n9prt/rss.xml,"
        "Dinosaur Society|https://www.dinosaursociety.com/category/dinosaur-news/feed/"
    )

    # NewsAPI.org (web-wide news search). When a key is configured it is the primary
    # source; NEWS_FEEDS above is used only as a fallback when no key is present.
    # Accepts the key under several env names so common spellings all work.
    newsapi_key: str = Field(
        default="",
        validation_alias=AliasChoices("NEWSAPI_KEY", "NewsApi", "NEWSAPI", "newsapi"),
    )
    # Topic query. Deliberately avoids a bare "fossil" (it matches "fossil fuels" and
    # floods results with energy/climate news) — paleo terms give clean, on-topic hits.
    newsapi_query: str = (
        '"dinosaur" OR "paleontology" OR "palaeontology" OR "paleontologist" '
        'OR "tyrannosaur" OR "sauropod" OR "theropod" OR "velociraptor" '
        'OR "triceratops" OR "stegosaurus"'
    )
    newsapi_page_size: int = 100
    # Shared secret required by POST /news/refresh (the endpoint the cron job hits).
    news_refresh_token: str = Field(
        default="",
        validation_alias=AliasChoices("NEWS_REFRESH_TOKEN", "news_refresh_token"),
    )

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".." / ".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def news_feeds_list(self) -> list[tuple[str, str]]:
        """Parses NEWS_FEEDS env var: 'Name|url,Name|url,...' -> [(name, url), ...]"""
        feeds = []
        for entry in self.news_feeds.split(","):
            entry = entry.strip()
            if not entry or "|" not in entry:
                continue
            name, url = entry.split("|", 1)
            feeds.append((name.strip(), url.strip()))
        return feeds

    @property
    def newsapi_enabled(self) -> bool:
        return bool(self.newsapi_key.strip())

    def resolve_path(self, relative: str) -> Path:
        return (BACKEND_DIR / relative).resolve()


settings = Settings()
