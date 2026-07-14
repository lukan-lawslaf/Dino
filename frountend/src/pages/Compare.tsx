import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Search, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { api, type DinosaurSummary } from "../lib/api";

const HUMAN_HEIGHT_M = 1.8;

export default function Compare() {
  const [selected, setSelected] = useState<DinosaurSummary[]>([]);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DinosaurSummary[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.searchDinosaurs(q).then(setResults).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const add = (d: DinosaurSummary) => {
    if (!selected.some((s) => s.name === d.name)) setSelected((p) => [...p, d]);
    setPicking(false);
    setQuery("");
  };
  const remove = (name: string) => setSelected((p) => p.filter((s) => s.name !== name));

  // Scale: tallest thing (a dino length used as a rough size proxy, or human) maps to chart top.
  const maxM = useMemo(() => {
    const dinoMax = Math.max(0, ...selected.map((d) => d.length_m ?? 0));
    return Math.max(dinoMax, HUMAN_HEIGHT_M) * 1.1;
  }, [selected]);

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setSelected([])}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full surface-plain hover-surface text-sm transition-colors"
          >
            <RotateCcw size={15} /> Start again
          </button>

          {selected.map((d) => (
            <span key={d.name} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full pill-active text-sm">
              <span className="w-7 h-7 rounded-full bg-black/10 grid place-items-center overflow-hidden">
                {d.image_thumb_url ? (
                  <img src={d.image_thumb_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  "🦖"
                )}
              </span>
              <span className="font-medium">{d.name}</span>
              <button onClick={() => remove(d.name)} aria-label={`Remove ${d.name}`}>
                <X size={15} />
              </button>
            </span>
          ))}

          <button
            onClick={() => setPicking(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full surface-plain hover-surface text-sm transition-colors"
          >
            Add <Plus size={15} />
          </button>
        </div>

        {/* Picker */}
        {picking && (
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 t-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a dinosaur to add…"
                className="w-full surface rounded-full pl-11 pr-4 py-3 text-sm outline-none hover-border"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-2 rounded-2xl border b-app max-h-72 overflow-y-auto" style={{ background: "var(--app-bg-2)" }}>
                {results.slice(0, 30).map((d) => (
                  <button
                    key={d.name}
                    onClick={() => add(d)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover-surface text-left"
                  >
                    <span className="w-8 h-8 rounded-full surface-plain grid place-items-center overflow-hidden">
                      {d.image_thumb_url ? <img src={d.image_thumb_url} alt="" className="w-full h-full object-cover" /> : "🦖"}
                    </span>
                    <span className="text-sm">{d.name}</span>
                    <span className="t-faint text-xs ml-auto">{d.length_m != null ? `${d.length_m} m` : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        {selected.length === 0 ? (
          <div className="text-center t-faint py-24">
            Add dinosaurs to compare their size against a human.
          </div>
        ) : (
          <div className="relative border-l border-b b-app h-[520px] flex items-end gap-8 md:gap-16 px-8 pt-8">
            {/* gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <div key={f} className="absolute left-0 right-0 border-t b-app flex" style={{ bottom: `${f * 100}%` }}>
                <span className="text-[10px] t-faint -translate-y-1/2 -ml-8 w-8 text-right pr-1">
                  {(maxM * f).toFixed(0)}m
                </span>
              </div>
            ))}

            {/* human reference */}
            <Figure heightM={HUMAN_HEIGHT_M} maxM={maxM} label="Human" human />

            {selected.map((d) => (
              <Figure key={d.name} heightM={d.length_m ?? 1} maxM={maxM} label={d.name} img={d.image_thumb_url} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Figure({
  heightM,
  maxM,
  label,
  img,
  human,
}: {
  heightM: number;
  maxM: number;
  label: string;
  img?: string | null;
  human?: boolean;
}) {
  const pct = Math.max(4, (heightM / maxM) * 100);
  return (
    <div className="relative flex flex-col items-center justify-end h-full" style={{ height: "100%" }}>
      <div className="flex items-end justify-center" style={{ height: `${pct}%` }}>
        {human ? (
          <img
            src="/assets/skeleton.png"
            alt="Human ~1.8m"
            title="Human ~1.8m"
            className="h-full w-auto object-contain object-bottom opacity-90"
          />
        ) : img ? (
          <img src={img} alt={label} className="max-h-full w-auto object-contain drop-shadow" />
        ) : (
          <div className="w-16 h-full surface-plain rounded-t-lg grid place-items-end justify-center pb-2 text-2xl">🦖</div>
        )}
      </div>
      <span className="mt-2 text-[11px] text-center max-w-24 truncate">{label}</span>
    </div>
  );
}
