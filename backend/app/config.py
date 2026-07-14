from pathlib import Path

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

    def resolve_path(self, relative: str) -> Path:
        return (BACKEND_DIR / relative).resolve()


settings = Settings()
