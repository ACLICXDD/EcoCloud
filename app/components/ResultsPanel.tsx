"use client";

import type { Decision } from "../lib/datacenters";

type Props = { decision: Decision | null };

export default function ResultsPanel({ decision }: Props) {
  if (!decision) {
    return (
      <section className="glass p-6 flex flex-col gap-5 min-h-[420px] justify-center items-center text-center">
        <div className="size-12 rounded-full border border-[color:var(--hairline-strong)] grid place-items-center breath">
          <svg viewBox="0 0 24 24" className="size-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            <circle cx="12" cy="12" r="4.5" />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Awaiting decision</span>
          <p className="text-sm text-[color:var(--ink-soft)] max-w-[26ch]">
            Configure a workload and route it to see the carbon-aware decision.
          </p>
        </div>
      </section>
    );
  }

  const { optimal, baseline, carbonSavingsPct, costSavingsPct, latencyDeltaMs,
          emissionsOptimalG, emissionsBaselineG, costOptimal, costBaseline } = decision;

  const carbonScale = Math.max(emissionsOptimalG, emissionsBaselineG);
  const costScale = Math.max(costOptimal, costBaseline);

  return (
    <section className="glass p-6 flex flex-col gap-6">
      {/* Selected node card */}
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Optimal node</span>
        <div className="flex items-baseline gap-3 mt-1">
          <h2 className="text-[22px] font-semibold tracking-tight text-grad-eco">
            {optimal.city}
          </h2>
          <span className="text-xs text-[color:var(--ink-mute)] numeric">
            {optimal.region}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="pill"><Dot color="leaf" /> {optimal.source}</span>
          <span className="pill numeric">{optimal.carbonIntensity} gCO₂/kWh</span>
          <span className="pill numeric">{optimal.latency} ms</span>
        </div>
      </div>

      {/* Savings headline */}
      <div className="grid grid-cols-2 gap-3">
        <Headline
          label="Carbon saved"
          value={carbonSavingsPct}
          tone="leaf"
          icon="leaf"
        />
        <Headline
          label="Cost saved"
          value={costSavingsPct}
          tone="aqua"
          icon="coin"
        />
      </div>

      {/* Comparison chart */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Optimised vs baseline</span>
          <span className="text-[10.5px] text-[color:var(--ink-mute)] flex items-center gap-3">
            <Legend color="eco" label="EcoCloud" />
            <Legend color="base" label="Naive nearest" />
          </span>
        </div>

        <ChartRow
          label="Emissions"
          unit="gCO₂"
          optimal={emissionsOptimalG}
          baseline={emissionsBaselineG}
          scale={carbonScale}
          format={(v) => v.toFixed(1)}
        />
        <ChartRow
          label="Cost"
          unit="$ / wkld"
          optimal={costOptimal}
          baseline={costBaseline}
          scale={costScale}
          format={(v) => `$${v.toFixed(3)}`}
        />
        <ChartRow
          label="Latency"
          unit="ms"
          optimal={optimal.latency}
          baseline={baseline.latency}
          scale={Math.max(optimal.latency, baseline.latency)}
          format={(v) => `${v.toFixed(0)} ms`}
          inverse
        />
      </div>

      {/* Baseline footnote */}
      <div className="glass-soft p-3.5 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="eyebrow">Baseline (naive nearest)</span>
          <span className="text-[13px] text-[color:var(--ink)] truncate">
            {baseline.city}<span className="text-[color:var(--ink-mute)]"> · {baseline.region}</span>
          </span>
        </div>
        <span className={`text-[12px] numeric ${latencyDeltaMs >= 0 ? "text-amber-300" : "text-emerald-300"}`}>
          {latencyDeltaMs >= 0 ? "+" : ""}{latencyDeltaMs} ms
        </span>
      </div>
    </section>
  );
}

function Headline({
  label, value, tone, icon,
}: {
  label: string;
  value: number;
  tone: "leaf" | "aqua";
  icon: "leaf" | "coin";
}) {
  const positive = value >= 0;
  const colorClass = tone === "leaf" ? "text-emerald-300" : "text-cyan-300";
  return (
    <div className="glass-soft p-4 flex flex-col gap-2 relative overflow-hidden">
      <span className="eyebrow">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className={`text-[28px] font-semibold tracking-tight numeric ${colorClass}`}>
            {positive ? "" : "−"}{Math.abs(value).toFixed(1)}
          </span>
          <span className="text-sm text-[color:var(--ink-mute)]">%</span>
        </div>
        <span className={`size-8 rounded-full grid place-items-center ${colorClass}`} style={{
          background: tone === "leaf"
            ? "radial-gradient(circle, rgba(134,239,172,0.18), transparent 70%)"
            : "radial-gradient(circle, rgba(90,215,255,0.18), transparent 70%)",
        }}>
          {icon === "leaf" ? (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 19c8 0 14-6 14-14-7 0-13 4-13 11 0 1 .3 2 1 3z" />
              <path d="M5 19c1-3 3-6 7-8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M9 9h4.5a2 2 0 0 1 0 4H9M9 13h5a2 2 0 0 1 0 4H9M11 6v2M13 16v2" />
            </svg>
          )}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px shimmer opacity-60" />
    </div>
  );
}

function ChartRow({
  label, unit, optimal, baseline, scale, format, inverse,
}: {
  label: string;
  unit: string;
  optimal: number;
  baseline: number;
  scale: number;
  format: (v: number) => string;
  inverse?: boolean;
}) {
  const oPct = (optimal / scale) * 100;
  const bPct = (baseline / scale) * 100;
  const better = inverse ? optimal <= baseline : optimal <= baseline;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-[color:var(--ink-soft)]">{label} <span className="text-[color:var(--ink-mute)]">· {unit}</span></span>
        <span className={`numeric ${better ? "text-emerald-300" : "text-rose-300"}`}>
          {format(optimal)} <span className="text-[color:var(--ink-mute)]">vs</span> {format(baseline)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="bar-track">
          <div className="bar-fill eco" style={{ width: `${Math.max(4, oPct)}%` }} />
        </div>
        <div className="bar-track">
          <div className="bar-fill base" style={{ width: `${Math.max(4, bPct)}%` }} />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: "eco" | "base"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-4 h-1.5 rounded-full"
        style={{
          background:
            color === "eco"
              ? "linear-gradient(90deg, #86efac, #4be4c5, #5ad7ff)"
              : "linear-gradient(90deg, #f59ec0, #fbbf24)",
        }}
      />
      {label}
    </span>
  );
}

function Dot({ color }: { color: "leaf" | "aqua" | "rose" }) {
  const cls =
    color === "leaf" ? "bg-emerald-300" :
    color === "aqua" ? "bg-cyan-300" : "bg-rose-300";
  return <span className={`size-1.5 rounded-full ${cls}`} />;
}
