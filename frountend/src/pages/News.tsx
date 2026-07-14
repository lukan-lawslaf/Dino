import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import AppShell from "../components/AppShell";
import { api, type NewsArticle, type PaginatedNews } from "../lib/api";
import { useAsync } from "../lib/useAsync";

export default function News() {
  const { data, loading, error } = useAsync<PaginatedNews>(() => api.listNews(1, 40), []);
  const [source, setSource] = useState<string>("All");

  const articles = data?.items ?? [];

  const sources = useMemo(() => {
    const set = new Set(articles.map((a) => a.source_name));
    return ["All", ...Array.from(set)];
  }, [articles]);

  const filtered = source === "All" ? articles : articles.filter((a) => a.source_name === source);
  const [featured, ...rest] = filtered;

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <p className="text-center t-muted mb-6">The latest accurate and interesting dinosaur news and insights.</p>

        {/* Topic chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={
                "px-5 py-2 rounded-full text-sm transition-colors " +
                (source === s ? "pill-active" : "surface-plain t-muted hover-surface")
              }
            >
              {s}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-32 t-muted">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {error && (
          <div className="text-center py-20 text-red-400">Couldn't load news ({error}). Is the backend running?</div>
        )}

        {/* Featured */}
        {featured && <Featured a={featured} />}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {rest.map((a) => (
            <Card key={a.id} a={a} />
          ))}
        </div>

        {!loading && filtered.length === 0 && !error && (
          <div className="text-center t-faint py-16">No articles.</div>
        )}
      </div>
    </AppShell>
  );
}

function Featured({ a }: { a: NewsArticle }) {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center surface-plain rounded-3xl overflow-hidden p-6 md:p-10">
      <div>
        <span className="inline-block px-4 py-1 rounded-full surface text-xs mb-4">{a.source_name}</span>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight mb-4">{a.title}</h1>
        {a.summary && <p className="t-muted line-clamp-3 mb-6">{a.summary}</p>}
        <a
          href={a.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full pill-active text-sm font-medium hover:opacity-90"
        >
          Read more <ArrowRight size={16} />
        </a>
      </div>
      <div className="aspect-video rounded-2xl surface-plain overflow-hidden">
        {a.image_url ? (
          <img src={a.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-5xl opacity-20">🦕</div>
        )}
      </div>
    </div>
  );
}

function Card({ a }: { a: NewsArticle }) {
  return (
    <a
      href={a.link}
      target="_blank"
      rel="noreferrer"
      className="group rounded-2xl surface hover-border overflow-hidden transition-colors flex flex-col"
    >
      <div className="aspect-video surface-plain overflow-hidden">
        {a.image_url ? (
          <img src={a.image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full grid place-items-center text-3xl opacity-20">🦕</div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[10px] uppercase tracking-widest t-faint mb-2">{a.source_name}</span>
        <h3 className="font-semibold leading-snug line-clamp-2 mb-2">{a.title}</h3>
        {a.summary && <p className="t-faint text-sm line-clamp-2 mt-auto">{a.summary}</p>}
      </div>
    </a>
  );
}
