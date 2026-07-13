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

Fetches articles from the RSS feeds listed in `NEWS_FEEDS` (`.env`, format `Name|url,Name|url,...` — currently ScienceDaily, BBC, and Dinosaur Society) and upserts them into `news_articles`, deduped by article link. Safe to re-run any time (e.g. on a daily cron/scheduled task) — it only adds articles it hasn't seen before, so it never creates duplicates and never touches existing rows.

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

## Frontend notes

- **Images** (`image_thumb_url`, `image_url`): direct Wikimedia Commons URLs, safe to `<img>`.
- **360°/3D** (`model_3d_url`): a Sketchfab embed URL — drop it straight into an `<iframe>` for a rotatable/zoomable 360° viewer. Show `model_3d_attribution` and link `model_3d_source_url` to credit the CC creator. Genera without a model return `null` for these fields, so guard for that in the UI.
- **News tab**: `GET /news` for the feed list. `source_name` is one of `ScienceDaily`, `BBC`, `Dinosaur Society` — usable for a filter/tab UI. `published_at` is ISO 8601 or `null` if the source didn't provide a date (sorts last). `image_url` is only populated for sources that include one (currently BBC); guard for `null` elsewhere.

CORS is enabled for the origins listed in `CORS_ORIGINS` (defaults to `localhost:3000` and `localhost:5173`) so a local React dev server can call the API directly.
