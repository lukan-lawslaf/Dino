import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Rotate3d, Bone, Leaf, Fish, Worm } from "lucide-react";
import * as topojson from "topojson-client";
import type { Topology, Objects } from "topojson-specification";
import type { Feature, FeatureCollection, Polygon, MultiPolygon, Position } from "geojson";
import AppShell from "../components/AppShell";
import { api, type DinosaurDetail } from "../lib/api";
import { useAsync } from "../lib/useAsync";

export default function Detail() {
  const { name = "" } = useParams();
  const { data, loading, error } = useAsync<DinosaurDetail>(() => api.getDinosaur(name), [name]);

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        {loading && (
          <div className="flex justify-center py-32 t-muted">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {error && (
          <div className="text-center py-32 text-red-400">
            Couldn't load “{name}” ({error}).{" "}
            <Link to="/encyclopedia" className="underline">
              Back to encyclopedia
            </Link>
          </div>
        )}
        {data && <DetailBody d={data} />}
      </div>
    </AppShell>
  );
}

/** Resolve which lucide icons represent this diet, same style as the homepage circles. */
function dietIconComponents(diet: string | null): React.ElementType[] {
  if (!diet) return [Bone, Leaf];
  const d = diet.toLowerCase();
  if (d.includes("pisci")) return [Fish];
  if (d.includes("insecti")) return [Worm];
  if (d.includes("omni")) return [Bone, Leaf];
  if (d.includes("carni")) return [Bone];
  if (d.includes("herbi")) return [Leaf];
  return [Bone, Leaf];
}

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
};
const labelStyle = { color: "rgba(255,255,255,0.45)", minWidth: "5.5rem" };

function StatCard({ label, icon, value }: { label: string; icon: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={cardStyle}>
      <span className="text-sm font-medium shrink-0" style={labelStyle}>{label}:</span>
      <span className="flex items-center gap-2 font-bold tracking-wide text-sm">
        <span style={{ fontSize: "1.05rem" }}>{icon}</span>
        <span className="uppercase">{value}</span>
      </span>
    </div>
  );
}

function PlainCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={cardStyle}>
      <span className="text-sm font-medium shrink-0" style={labelStyle}>{label}:</span>
      <span className="font-bold tracking-wide text-sm uppercase">{value}</span>
    </div>
  );
}

function DietCard({ diet }: { diet: string | null }) {
  const icons = dietIconComponents(diet);
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={cardStyle}>
      <span className="text-sm font-medium shrink-0" style={labelStyle}>Food:</span>
      <span className="flex items-center gap-2">
        {icons.map((Icon, i) => (
          <span
            key={i}
            className="grid place-items-center w-8 h-8 rounded-full border border-gray-600 bg-black text-gray-400"
          >
            <Icon size={15} />
          </span>
        ))}
        <span className="ml-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.7)" }}>
          {diet ?? "Unknown"}
        </span>
      </span>
    </div>
  );
}

// ── World Map ──────────────────────────────────────────────────────────────
const W = 800, H = 400;

function project(lon: number, lat: number) {
  return [
    ((lon + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ] as [number, number];
}

function ringToD(ring: Position[]): string {
  return ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function featureToD(feature: Feature<Polygon | MultiPolygon>): string {
  const { geometry } = feature;
  if (!geometry) return "";
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToD).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((poly) => poly.map(ringToD)).join(" ");
  }
  return "";
}

function WorldMapSVG({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    fetch("/assets/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology<Objects>) => {
        const fc = topojson.feature(
          topo,
          topo.objects[Object.keys(topo.objects)[0]]
        ) as FeatureCollection<Polygon | MultiPolygon>;
        const ds = fc.features.map(featureToD).filter(Boolean);
        setPaths(ds);
      })
      .catch(() => {});
  }, []);

  const pin = lat != null && lng != null ? project(lng, lat) : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ background: "#0a0a0a", display: "block" }}
    >
      {/* Graticule grid */}
      {[-60, -30, 0, 30, 60].map((la) => (
        <line key={la} x1={0} y1={((90 - la) / 180) * H} x2={W} y2={((90 - la) / 180) * H}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.6} />
      ))}
      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lo) => (
        <line key={lo} x1={((lo + 180) / 360) * W} y1={0} x2={((lo + 180) / 360) * W} y2={H}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.6} />
      ))}
      {/* Country fills */}
      {paths.map((d, i) => (
        <path key={i} d={d} fill="rgba(255,255,255,0.82)" stroke="#0a0a0a" strokeWidth={0.4} />
      ))}
      {/* Location pin */}
      {pin && (
        <g>
          <circle cx={pin[0]} cy={pin[1]} r={6} fill="#f87171" opacity={0.95} />
          <circle cx={pin[0]} cy={pin[1]} r={11} fill="none" stroke="#f87171" strokeWidth={1.5} opacity={0.5} />
        </g>
      )}
    </svg>
  );
}

function LocationMapCard({
  region, fossils,
}: {
  region: string | null;
  fossils: { lat?: number | null; lng?: number | null; formation?: string | null; country_or_region?: string | null }[];
}) {
  const firstWithCoords = fossils.find((f) => f.lat != null && f.lng != null);
  const formation = fossils[0]?.formation ?? null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs text-gray-500 mb-2">Location & land formation:</p>
        <p className="font-bold uppercase tracking-wider text-white text-sm leading-tight">
          {region ?? "Unknown"}
        </p>
        {formation && (
          <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: "#f87171", opacity: 0.8 }}>
            {formation}
          </p>
        )}
      </div>
      <WorldMapSVG lat={firstWithCoords?.lat} lng={firstWithCoords?.lng} />
    </div>
  );
}

// ── Geological Time Stages ─────────────────────────────────────────────────
const GEO_PERIODS: Record<string, { start: number; end: number; epochs: { name: string; stages: { name: string; start: number; end: number }[] }[] }> = {
  triassic: {
    start: 251.9, end: 201.4,
    epochs: [
      { name: "Early", stages: [{ name: "Induan", start: 251.9, end: 251.2 }, { name: "Olenekian", start: 251.2, end: 247.2 }] },
      { name: "Middle", stages: [{ name: "Anisian", start: 247.2, end: 242 }, { name: "Ladinian", start: 242, end: 237 }] },
      { name: "Late", stages: [{ name: "Carnian", start: 237, end: 227 }, { name: "Norian", start: 227, end: 208.5 }, { name: "Rhaetian", start: 208.5, end: 201.4 }] },
    ],
  },
  jurassic: {
    start: 201.4, end: 145,
    epochs: [
      { name: "Early", stages: [{ name: "Hettangian", start: 201.4, end: 199.3 }, { name: "Sinemurian", start: 199.3, end: 190.8 }, { name: "Pliensbachian", start: 190.8, end: 182.7 }, { name: "Toarcian", start: 182.7, end: 174.1 }] },
      { name: "Middle", stages: [{ name: "Aalenian", start: 174.1, end: 170.3 }, { name: "Bajocian", start: 170.3, end: 168.3 }, { name: "Bathonian", start: 168.3, end: 166.1 }, { name: "Callovian", start: 166.1, end: 163.5 }] },
      { name: "Late", stages: [{ name: "Oxfordian", start: 163.5, end: 157.3 }, { name: "Kimmeridgian", start: 157.3, end: 152.1 }, { name: "Tithonian", start: 152.1, end: 145 }] },
    ],
  },
  cretaceous: {
    start: 145, end: 66,
    epochs: [
      { name: "Early", stages: [{ name: "Berriasian", start: 145, end: 139.8 }, { name: "Valanginian", start: 139.8, end: 132.9 }, { name: "Hauterivian", start: 132.9, end: 129.4 }, { name: "Barremian", start: 129.4, end: 125 }, { name: "Aptian", start: 125, end: 113 }, { name: "Albian", start: 113, end: 100.5 }] },
      { name: "Late", stages: [{ name: "Cenomanian", start: 100.5, end: 93.9 }, { name: "Turonian", start: 93.9, end: 89.8 }, { name: "Coniacian", start: 89.8, end: 86.3 }, { name: "Santonian", start: 86.3, end: 83.6 }, { name: "Campanian", start: 83.6, end: 72.1 }, { name: "Maastrichtian", start: 72.1, end: 66 }] },
    ],
  },
};

function detectPeriodKey(period: string | null, maxMa: number | null): string {
  if (maxMa != null) {
    if (maxMa > 201.4) return "triassic";
    if (maxMa > 145) return "jurassic";
    return "cretaceous";
  }
  const p = (period ?? "").toLowerCase();
  if (p.includes("triassic")) return "triassic";
  if (p.includes("jurassic")) return "jurassic";
  return "cretaceous";
}

function TimeStageCard({
  period, fossils,
}: {
  period: string | null;
  fossils: { max_ma?: number | null; min_ma?: number | null; early_interval?: string | null }[];
}) {
  const maxMa = fossils.find((f) => f.max_ma != null)?.max_ma ?? null;
  const minMa = fossils.find((f) => f.min_ma != null)?.min_ma ?? null;
  const periodKey = detectPeriodKey(period, maxMa);
  const geo = GEO_PERIODS[periodKey];
  if (!geo) return null;

  const allStages = geo.epochs.flatMap((e) => e.stages);
  const totalSpan = geo.start - geo.end;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-gray-400">Time stages:</span>
        {maxMa != null && minMa != null && (
          <span className="text-xs font-mono text-gray-300">{maxMa}ma – {minMa}ma</span>
        )}
      </div>

      {/* Stage bars */}
      <div className="relative px-2 pb-1" style={{ overflowX: "auto" }}>
        <div className="flex items-end gap-px min-w-0" style={{ height: "90px" }}>
          {allStages.map((stage) => {
            const stageFrac = (stage.start - stage.end) / totalSpan;
            const isActive =
              maxMa != null && minMa != null
                ? stage.start >= minMa && stage.end <= maxMa + 2
                : false;

            return (
              <div
                key={stage.name}
                className="relative flex flex-col justify-end items-center shrink-0"
                style={{ flex: `${stageFrac} 0 0`, minWidth: "28px", height: "90px" }}
              >
                {/* Active highlight bar */}
                {isActive && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm"
                    style={{ height: "60%", background: "rgba(251,146,60,0.35)", border: "1px solid rgba(251,146,60,0.6)", borderBottom: "none" }}
                  />
                )}
                {/* Grid bar background */}
                <div
                  className="relative w-full border-r"
                  style={{ height: "100%", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  {/* Stage name (rotated) */}
                  <span
                    className="absolute bottom-1 left-1/2 text-[9px] font-mono whitespace-nowrap select-none"
                    style={{
                      transform: "rotate(-90deg) translateX(50%)",
                      transformOrigin: "center bottom",
                      color: isActive ? "rgba(251,146,60,0.9)" : "rgba(255,255,255,0.35)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {stage.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Epoch labels row */}
        <div className="flex gap-px mt-0.5">
          {geo.epochs.map((epoch) => {
            const epochFrac = epoch.stages.reduce((s, st) => s + (st.start - st.end), 0) / totalSpan;
            return (
              <div
                key={epoch.name}
                className="text-center border-t border-r"
                style={{
                  flex: `${epochFrac} 0 0`,
                  minWidth: "28px",
                  fontSize: "8px",
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.05em",
                  borderColor: "rgba(255,255,255,0.15)",
                  padding: "2px 0",
                  fontFamily: "monospace",
                }}
              >
                {epoch.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* Period label */}
      <div
        className="text-center py-2 font-bold tracking-[0.2em] uppercase text-sm border-t"
        style={{ color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        {periodKey}
      </div>
    </div>
  );
}

function ClassRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b b-app text-sm">
      <span className="t-faint uppercase text-xs tracking-widest">{label}</span>
      <span className="uppercase text-right">{value}</span>
    </div>
  );
}

function DetailBody({ d }: { d: DinosaurDetail }) {
  const img = d.image_url ?? d.image_thumb_url;
  return (
    <>
      {/* Hero header */}
      <div className="mb-8">
        <div className="t-faint font-mono text-xs uppercase tracking-widest mb-2">
          {d.period ?? "Prehistoric"}
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">{d.name}</h1>
        {d.species && <p className="t-muted mt-1 italic">{d.species}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: stats + classification */}
        <div className="space-y-6">
          <div className="space-y-2">
            <DietCard diet={d.diet} />
            <StatCard label="Length" icon="📏" value={d.length_m != null ? `${d.length_m} m` : "Unknown"} />
            <StatCard label="Height" icon="📐" value={d.height_m != null ? `${d.height_m} m` : "Unknown"} />
            <StatCard
              label="Weight"
              icon="⚖️"
              value={
                d.weight != null
                  ? d.weight >= 1000
                    ? `${(d.weight / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`
                    : `${d.weight.toLocaleString()} kg`
                  : "Unknown"
              }
            />
            <PlainCard label="Type" value={d.type ?? "Unknown"} />
          </div>


          <div className="surface-plain rounded-2xl p-5">
            <h3 className="text-xs font-mono uppercase tracking-widest t-muted mb-3">
              Scientific Classification
            </h3>
            <ClassRow label="Class" value={d.class_name} />
            <ClassRow label="Family" value={d.family} />
            <ClassRow label="Genus" value={d.name} />
            <ClassRow label="Species" value={d.species} />
            <ClassRow label="Named by" value={d.named_by} />
          </div>
        </div>


        {/* Center: 3D / image */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="relative flex-1 min-h-[360px] rounded-2xl surface-plain grid place-items-center overflow-hidden">
            {d.model_3d_url ? (
              <iframe
                title={`${d.name} 3D model`}
                src={d.model_3d_url}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                className="w-full h-full min-h-[360px]"
              />
            ) : img ? (
              <img src={img} alt={d.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-6xl opacity-20">🦖</span>
            )}
            {d.model_3d_url && (
              <span className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1 text-xs">
                <Rotate3d size={14} /> 360° model
              </span>
            )}
          </div>
          {d.model_3d_attribution && (
            <p className="text-[10px] t-faint mt-2">
              {d.model_3d_source_url ? (
                <a
                  href={d.model_3d_source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  {d.model_3d_attribution}
                </a>
              ) : (
                d.model_3d_attribution
              )}
            </p>
          )}
        </div>

        {/* Right: location map + time stages */}
        <div className="space-y-4">
          <LocationMapCard region={d.region} fossils={d.fossil_occurrences} />
          <TimeStageCard period={d.period} fossils={d.fossil_occurrences} />
          {d.wikipedia_url && (
            <a
              href={d.wikipedia_url}
              target="_blank"
              rel="noreferrer"
              className="block text-center px-6 py-3 rounded-full surface hover-invert transition-colors text-sm"
            >
              Read on Wikipedia
            </a>
          )}
        </div>
      </div>
    </>
  );
}
