# Dinosaur & Fossil API

FastAPI backend serving merged dinosaur facts, stats, and PBDB fossil occurrence data from a local SQLite database.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

Configuration lives in `../.env` (project root): PBDB base URL, request delay, database path, CORS origins, and the two source CSV paths.

## 1. Run ingestion (one-time, rebuild anytime)

```bash
python -m app.ingest.run
```

This loads `dino_facts.csv` and `dino_stats.csv`, merges them by dinosaur name, fetches fossil occurrences from the PBDB API for each genus (rate-limited, ~0.5s between calls — a full run over ~1,000 genera takes several minutes), fetches a lead image from Wikipedia for each genus (batched), and writes everything into `dinosaurs.db`. Safe to re-run; it upserts dinosaurs and replaces their fossil occurrences.

### Media backfills (optional, run after ingestion)

Images and 3D models can also be (re)populated independently without redoing the slow PBDB fetch:

```bash
# Wikipedia lead images (batched, ~1 min). Only fills genera missing an image; --force redoes all.
python -m app.ingest.backfill_images

# 3D models — CC0/CC-BY embeddable Sketchfab viewers for a curated set of famous genera (~1 min).
# Add --all to attempt every genus in the DB; --force redoes ones that already have a model.
python -m app.ingest.backfill_models
```

Images come from Wikipedia/Wikimedia Commons; 3D models come from the Sketchfab API, filtered to CC0 (public domain) and CC-BY (attribution) licenses only. Each model carries an attribution string and a source link for crediting the creator.

## News feed (run once, then periodically to refresh)

```bash
python -m app.ingest.refresh_news
```

Searches the web for the latest dinosaur/fossil/palaeontology news and upserts it into
`news_articles`, deduped by article link. Safe to re-run any time — it only adds articles
it hasn't seen before, so it never creates duplicates.

**Source selection**

- **If `NEWSAPI_KEY` is set** (`.env`) — web-wide search via [NewsAPI.org](https://newsapi.org)
  `/v2/everything`, so articles come from any of thousands of publishers, not a fixed list.
  Results are ranked by relevancy and then filtered by a keyword gate (an article must
  mention a dinosaur/palaeo term and must not mention "fossil fuel" etc., which otherwise
  floods results with energy/climate news). Free "Developer" tier covers this: 100
  requests/day, articles delayed ~24h, last-month window — one request per refresh, so a
  daily run is well within it. Note the free tier is licensed for development use only.
- **If `NEWSAPI_KEY` is unset** — falls back to the curated RSS feeds in `NEWS_FEEDS`
  (`.env`, format `Name|url,Name|url,...`).

**Images** — NewsAPI supplies `urlToImage` for most articles; for any article still
missing an image, the page's `og:image` is scraped so the UI shows a real thumbnail.
Existing image-less rows are topped up too, capped at 40 per run.

**Scheduled runs (Render)** — `render.yaml` defines a `rayquaza-news-refresh` cron that
runs daily at 06:17 UTC (change to `"17 6 */2 * *"` for every 2 days). A cron job runs in
its own container and so cannot write to the web service's SQLite file; instead it POSTs
to the API's protected `POST /news/refresh` endpoint, so the write happens in the process
that owns the database. Set `NEWS_REFRESH_TOKEN` (any random string — the endpoint refuses
to run without one) in the Render dashboard for both services.

## 2. Start the API server

```bash
uvicorn app.main:app --reload
```

Server runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## Endpoints

- `GET /dinosaurs?page=&page_size=` — paginated list (name, diet, period, length_m, weight, image_thumb_url)
- `GET /dinosaurs/{name}` — full detail incl. image, Wikipedia link, 3D model, and fossil occurrences
- `GET /dinosaurs/{name}/model` — just the 3D model embed URL + attribution (for a 360° viewer)
- `GET /dinosaurs/search?q=` — search by name
- `GET /dinosaurs/filter?diet=&period=&region=` — filter by diet/period/region
- `GET /fossils/{name}` — raw fossil occurrence records for map plotting
- `GET /news?page=&page_size=&source=` — paginated news feed, newest first, optional source filter
- `POST /news/refresh` — run a news refresh in-process. Requires an `X-Refresh-Token`
  header matching `NEWS_REFRESH_TOKEN` (401 otherwise; 503 if the token is unset).
  Used by the Render cron job; returns `{added, skipped, enriched, backfilled}`.

## Frontend notes

- **Images** (`image_thumb_url`, `image_url`): direct Wikimedia Commons URLs, safe to `<img>`.
- **360°/3D** (`model_3d_url`): a Sketchfab embed URL — drop it straight into an `<iframe>` for a rotatable/zoomable 360° viewer. Show `model_3d_attribution` and link `model_3d_source_url` to credit the CC creator. Genera without a model return `null` for these fields, so guard for that in the UI.
- **News tab**: `GET /news` for the feed list. `source_name` is whichever publisher the
  article came from (many, with NewsAPI) — usable for a filter/tab UI. `published_at` is
  ISO 8601 or `null` if the source didn't provide a date (sorts last). `image_url` is
  populated for most articles but can be `null` — guard for that in the UI.

CORS is enabled for the origins listed in `CORS_ORIGINS` (defaults to `localhost:3000` and `localhost:5173`) so a local React dev server can call the API directly.
