// Typed client for the Dinosaur & Fossil FastAPI backend.
// In dev, requests go through Vite's /api proxy -> http://localhost:8000.
// Override with VITE_API_BASE if the backend lives elsewhere.

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

// ---- Types (mirror app/schemas.py) ----

export interface FossilOccurrence {
  occurrence_no: string | null;
  lat: number | null;
  lng: number | null;
  early_interval: string | null;
  late_interval: string | null;
  max_ma: number | null;
  min_ma: number | null;
  formation: string | null;
  country_or_region: string | null;
  collection_name: string | null;
}

export interface DinosaurSummary {
  name: string;
  diet: string | null;
  period: string | null;
  length_m: number | null;
  height_m: number | null;
  weight: number | null;
  image_thumb_url: string | null;
}

export interface DinosaurDetail {
  name: string;
  diet: string | null;
  type: string | null;
  family: string | null;
  class_name: string | null;
  region: string | null;
  period: string | null;
  length_m: number | null;
  height_m: number | null;
  weight: number | null;
  taxonomy: string | null;
  named_by: string | null;
  species: string | null;
  link: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
  wikipedia_url: string | null;
  model_3d_url: string | null;
  model_3d_source_url: string | null;
  model_3d_attribution: string | null;
  fossil_occurrences: FossilOccurrence[];
}

export interface PaginatedDinosaurs {
  total: number;
  page: number;
  page_size: number;
  items: DinosaurSummary[];
}

export interface Model3D {
  name: string;
  model_3d_url: string | null;
  model_3d_source_url: string | null;
  model_3d_attribution: string | null;
}

export interface NewsArticle {
  id: number;
  title: string;
  link: string;
  summary: string | null;
  image_url: string | null;
  source_name: string;
  published_at: string | null;
}

export interface PaginatedNews {
  total: number;
  page: number;
  page_size: number;
  items: NewsArticle[];
}

// ---- Fetch helper ----

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} (${path})`);
  }
  return (await res.json()) as T;
}

// ---- Endpoints ----

export const api = {
  listDinosaurs: (page = 1, pageSize = 20) =>
    get<PaginatedDinosaurs>("/dinosaurs", { page, page_size: pageSize }),

  getDinosaur: (name: string) => get<DinosaurDetail>(`/dinosaurs/${encodeURIComponent(name)}`),

  getModel: (name: string) => get<Model3D>(`/dinosaurs/${encodeURIComponent(name)}/model`),

  searchDinosaurs: (q: string) => get<DinosaurSummary[]>("/dinosaurs/search", { q }),

  filterDinosaurs: (opts: { diet?: string; period?: string; region?: string }) =>
    get<DinosaurSummary[]>("/dinosaurs/filter", opts),

  getFossils: (name: string) => get<FossilOccurrence[]>(`/fossils/${encodeURIComponent(name)}`),

  listNews: (page = 1, pageSize = 20, source?: string) =>
    get<PaginatedNews>("/news", { page, page_size: pageSize, source }),
};

// ---- Small shared helpers ----

/** Extracts a broad geologic period label (Permian/Triassic/Jurassic/Cretaceous) from the messy `period` string. */
export function periodGroup(period: string | null): string {
  if (!period) return "Unknown";
  const p = period.toLowerCase();
  if (p.includes("permian")) return "Permian";
  if (p.includes("triassic")) return "Triassic";
  if (p.includes("jurassic")) return "Jurassic";
  if (p.includes("cretaceous")) return "Cretaceous";
  return "Unknown";
}

export const PERIOD_ORDER = ["Permian", "Triassic", "Jurassic", "Cretaceous", "Unknown"];
