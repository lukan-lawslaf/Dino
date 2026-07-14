import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronDown, LayoutGrid, List, Loader2, Search } from "lucide-react";
import AppShell from "../components/AppShell";
import { api, PERIOD_ORDER, periodGroup, type DinosaurSummary } from "../lib/api";

type View = "grid" | "list";

export default function Encyclopedia() {
  const [items, setItems] = useState<DinosaurSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DinosaurSummary[] | null>(null);

  const PAGE_SIZE = 60;

  // Paginated load (accumulates)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listDinosaurs(page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .searchDinosaurs(q)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const visible = searchResults ?? items;

  const grouped = useMemo(() => {
    const map = new Map<string, DinosaurSummary[]>();
    for (const d of visible) {
      const g = periodGroup(d.period);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(d);
    }
    return PERIOD_ORDER.filter((p) => map.has(p)).map((p) => [p, map.get(p)!] as const);
  }, [visible]);

  const hasMore = !searchResults && items.length < total;

  return (
    <AppShell>
      <div className="px-6 md:px-10 pt-10 pb-24 max-w-[1400px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-3">Tap a thumbnail to learn more</h1>
          <p className="t-muted max-w-2xl mx-auto">
            Explore the largest and most accurate dinosaur encyclopedia with 3D models, facts and interesting info.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-8">
          <div className="inline-flex surface-plain rounded-full p-1 self-start">
            <button
              onClick={() => setView("grid")}
              className={
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-colors " +
                (view === "grid" ? "pill-active" : "t-muted")
              }
            >
              <LayoutGrid size={15} /> Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-colors " +
                (view === "list" ? "pill-active" : "t-muted")
              }
            >
              <List size={15} /> List
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 t-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Encyclopedia"
              className="w-full surface rounded-full pl-11 pr-4 py-3 text-sm outline-none hover-border focus:outline-none transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="text-center text-red-400 py-10">
            Couldn't reach the API ({error}). Is the backend running on :8000?
          </div>
        )}

        {/* Groups */}
        {grouped.map(([period, dinos]) => (
          <PeriodGroup key={period} period={period} dinos={dinos} view={view} />
        ))}

        {visible.length === 0 && !loading && !error && (
          <div className="text-center t-faint py-16">No dinosaurs found.</div>
        )}

        {loading && (
          <div className="flex justify-center py-10 t-muted">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-8 py-3 rounded-full surface hover-invert text-sm transition-colors"
            >
              Load more ({items.length} / {total})
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PeriodGroup({ period, dinos, view }: { period: string; dinos: DinosaurSummary[]; view: View }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 surface-plain hover-surface rounded-2xl px-6 py-4 mb-4 transition-colors"
      >
        <ChevronDown size={18} className={"transition-transform " + (open ? "" : "-rotate-90")} />
        <span className="text-lg font-medium">{period}</span>
        <span className="t-faint text-sm ml-auto">{dinos.length}</span>
      </button>

      {open &&
        (view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {dinos.map((d) => (
              <DinoCard key={d.name} d={d} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dinos.map((d) => (
              <DinoRow key={d.name} d={d} />
            ))}
          </div>
        ))}
    </section>
  );
}

function DinoCard({ d }: { d: DinosaurSummary }) {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Link
        to={`/dinosaurs/${encodeURIComponent(d.name)}`}
        className="block rounded-2xl surface hover-border overflow-hidden transition-colors"
      >
        <div className="aspect-square surface-plain grid place-items-center overflow-hidden">
          {d.image_thumb_url ? (
            <img src={d.image_thumb_url} alt={d.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl opacity-20">🦖</span>
          )}
        </div>
        <div className="p-4">
          <div className="font-semibold uppercase text-sm tracking-wide truncate">{d.name}</div>
          <div className="t-faint text-xs uppercase truncate">{d.diet ?? "—"}</div>
        </div>
      </Link>
    </motion.div>
  );
}

function DinoRow({ d }: { d: DinosaurSummary }) {
  return (
    <Link
      to={`/dinosaurs/${encodeURIComponent(d.name)}`}
      className="flex items-center gap-4 rounded-full surface hover-border pr-6 transition-colors"
    >
      <div className="w-14 h-14 rounded-full surface-plain grid place-items-center overflow-hidden shrink-0">
        {d.image_thumb_url ? (
          <img src={d.image_thumb_url} alt={d.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="opacity-30">🦖</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-semibold uppercase text-sm tracking-wide truncate">{d.name}</div>
        <div className="t-faint text-xs uppercase truncate">{d.period ?? "—"}</div>
      </div>
    </Link>
  );
}
