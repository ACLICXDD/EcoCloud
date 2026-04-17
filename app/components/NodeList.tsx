"use client";

import type { Datacenter } from "../lib/datacenters";

type Props = {
  nodes: Datacenter[];
  optimalId?: string | null;
  baselineId?: string | null;
};

function intensityTone(g: number) {
  if (g < 100) return { label: "Pristine", tone: "leaf" as const };
  if (g < 250) return { label: "Clean",    tone: "aqua" as const };
  if (g < 450) return { label: "Mixed",    tone: "amber" as const };
  return { label: "Heavy", tone: "rose" as const };
}

const TONE: Record<string, string> = {
  leaf: "text-emerald-300 bg-emerald-300/10 border-emerald-300/25",
  aqua: "text-cyan-300 bg-cyan-300/10 border-cyan-300/25",
  amber: "text-amber-300 bg-amber-300/10 border-amber-300/25",
  rose: "text-rose-300 bg-rose-300/10 border-rose-300/25",
};

export default function NodeList({ nodes, optimalId, baselineId }: Props) {
  const sorted = [...nodes].sort((a, b) => a.carbonIntensity - b.carbonIntensity);
  return (
    <section className="glass p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Global grid</span>
          <h2 className="text-[17px] font-semibold tracking-tight">Live data centers</h2>
        </div>
        <span className="text-[11px] text-[color:var(--ink-mute)] numeric">
          {nodes.length} regions
        </span>
      </header>

      <ul className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1 -mr-1">
        {sorted.map((dc) => {
          const t = intensityTone(dc.carbonIntensity);
          const isOpt = dc.id === optimalId;
          const isBase = dc.id === baselineId;
          return (
            <li
              key={dc.id}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                isOpt
                  ? "border-emerald-300/40 bg-emerald-300/[0.06]"
                  : isBase
                  ? "border-rose-300/30 bg-rose-300/[0.04]"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  t.tone === "leaf" ? "bg-emerald-300" :
                  t.tone === "aqua" ? "bg-cyan-300" :
                  t.tone === "amber" ? "bg-amber-300" : "bg-rose-300"
                }`}
                style={{ boxShadow: `0 0 10px currentColor` }}
              />
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13.5px] font-medium tracking-tight truncate">
                    {dc.city}
                  </span>
                  <span className="text-[10.5px] text-[color:var(--ink-mute)] truncate">
                    {dc.region}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-[color:var(--ink-mute)] numeric">
                  <span>{dc.carbonIntensity} g/kWh</span>
                  <span className="size-0.5 rounded-full bg-current opacity-40" />
                  <span>{dc.latency} ms</span>
                  <span className="size-0.5 rounded-full bg-current opacity-40" />
                  <span>${dc.cost.toFixed(3)}</span>
                </div>
              </div>
              {isOpt && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-300/40 text-emerald-300 bg-emerald-300/10">
                  CHOSEN
                </span>
              )}
              {isBase && !isOpt && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-rose-300/30 text-rose-300 bg-rose-300/[0.08]">
                  baseline
                </span>
              )}
              {!isOpt && !isBase && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TONE[t.tone]}`}>
                  {t.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
