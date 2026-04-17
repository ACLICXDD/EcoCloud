"use client";

import { useState } from "react";
import type { Priority } from "../lib/datacenters";

type Props = {
  onDeploy: (input: { model: string; priority: Priority; latencyLimit: number }) => void;
  isDeploying: boolean;
};

const PRIORITIES: { id: Priority; label: string; sub: string; icon: string }[] = [
  { id: "low_carbon", label: "Low Carbon", sub: "min CO₂",   icon: "leaf" },
  { id: "balanced",   label: "Balanced",   sub: "tradeoff",  icon: "scale" },
  { id: "low_cost",   label: "Low Cost",   sub: "min $",     icon: "coin" },
];

export default function ControlPanel({ onDeploy, isDeploying }: Props) {
  const [model, setModel] = useState("claude-opus-4-7");
  const [priority, setPriority] = useState<Priority>("low_carbon");
  const [latencyLimit, setLatencyLimit] = useState(220);

  return (
    <section className="glass p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Deployment</span>
          <h2 className="text-[17px] font-semibold tracking-tight">
            New AI workload
          </h2>
        </div>
        <span className="pill pill-live">
          <span className="size-1.5 rounded-full bg-emerald-300 breath" />
          Live grid
        </span>
      </header>

      {/* Model name */}
      <div className="flex flex-col gap-2">
        <label className="eyebrow" htmlFor="model">Model</label>
        <div className="relative">
          <input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. claude-opus-4-7"
            className="field pl-9"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-300/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
        </div>
      </div>

      {/* Priority segmented control */}
      <div className="flex flex-col gap-2">
        <label className="eyebrow">Priority</label>
        <div className="seg" role="tablist">
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={priority === p.id}
              data-active={priority === p.id}
              onClick={() => setPriority(p.id)}
              className="seg-btn"
              type="button"
            >
              <Icon name={p.icon} className="size-3.5" />
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-[color:var(--ink-mute)] leading-relaxed">
          {priority === "low_carbon" &&
            "Picks the greenest grid — favors hydro, geothermal & wind regions."}
          {priority === "balanced" &&
            "Weights cost, carbon and latency equally for general-purpose deploys."}
          {priority === "low_cost" &&
            "Optimises for $/inference while staying within your latency budget."}
        </p>
      </div>

      {/* Latency limit slider */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label className="eyebrow" htmlFor="lat">Latency limit</label>
          <span className="numeric text-sm text-[color:var(--ink-soft)]">
            {latencyLimit} ms
          </span>
        </div>
        <input
          id="lat"
          type="range"
          min={60}
          max={300}
          step={5}
          value={latencyLimit}
          onChange={(e) => setLatencyLimit(Number(e.target.value))}
          className="range"
          style={{ ["--val" as any]: `${((latencyLimit - 60) / 240) * 100}%` }}
        />
        <div className="flex justify-between text-[10px] text-[color:var(--ink-mute)] numeric">
          <span>60</span>
          <span>180</span>
          <span>300</span>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={isDeploying}
        onClick={() => onDeploy({ model, priority, latencyLimit })}
        className="btn-primary mt-1"
      >
        {isDeploying ? (
          <>
            <span className="size-1.5 rounded-full bg-[#04140d] breath" />
            Routing workload…
          </>
        ) : (
          <>
            Route workload
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>

      <div className="flex items-center gap-2 text-[11px] text-[color:var(--ink-mute)]">
        <Icon name="lock" className="size-3" />
        Region grid intensity from mocked government API · refreshed 2 min ago
      </div>
    </section>
  );
}

function Icon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19c8 0 14-6 14-14-7 0-13 4-13 11 0 1 .3 2 1 3z" />
          <path d="M5 19c1-3 3-6 7-8" />
        </svg>
      );
    case "scale":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16M4 8h16M6 8l-2 6a4 4 0 0 0 8 0L10 8M14 8l-2 6a4 4 0 0 0 8 0l-2-6" />
        </svg>
      );
    case "coin":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="M9 9h4.5a2 2 0 0 1 0 4H9M9 13h5a2 2 0 0 1 0 4H9M11 6v2M13 16v2" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    default:
      return null;
  }
}
