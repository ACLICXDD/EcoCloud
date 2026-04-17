"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Datacenter, Decision } from "../lib/datacenters";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-white/40 text-xs">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-emerald-300 breath" />
        booting WebGL…
      </div>
    </div>
  ),
});

type Line = { kind: "in" | "out" | "ok" | "err" | "info"; text: string };

type Props = {
  username: string;
  datacenters: Datacenter[];
  decision: Decision | null;
  onDecide: (d: Decision | null) => void;
};

export default function WorkloadSection({
  username,
  datacenters,
  decision,
  onDecide,
}: Props) {
  const [cpu, setCpu] = useState(8);
  const [vram, setVram] = useState(32);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Line[]>([
    { kind: "info", text: `ecocloud://session opened — operator: ${username || "guest"}` },
    { kind: "info", text: "type a workload spec, then press Provision." },
  ]);

  const append = (line: Line) => setLog((prev) => [...prev, line]);

  const provision = async () => {
    setBusy(true);
    append({ kind: "in", text: `provision --cpu ${cpu} --vram ${vram}` });
    append({ kind: "out", text: "scanning 100 SKUs across 34 regions…" });

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpu, vram }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `HTTP ${res.status}`);
      }
      const d: Decision = await res.json();
      onDecide(d);
      append({ kind: "ok", text: `${d.totalMatches} matching offers found` });
      append({
        kind: "ok",
        text: `optimal: ${d.optimal.provider.toUpperCase()} · ${d.optimal.region}`,
      });
      append({
        kind: "out",
        text: `$${d.optimal.pricePerHour.toFixed(2)}/hr — saving ${d.savingsPct.toFixed(1)}% vs worst match`,
      });
    } catch (e) {
      append({ kind: "err", text: `error: ${(e as Error).message}` });
      onDecide(null);
    } finally {
      setBusy(false);
    }
  };

  const optimalDcId = decision
    ? `${decision.optimal.provider}::${decision.optimal.region.split(" ")[0]}`
    : null;

  return (
    <section className="relative min-h-screen w-full px-8 py-12 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <span className="eyebrow text-white/45">02 · WORKLOAD</span>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.03em] text-white">
            Provision a model.
          </h2>
        </div>
        <p className="text-[12.5px] text-white/45 max-w-[42ch] hidden md:block">
          Set the CPU & VRAM you need. The router picks the cheapest cloud
          region that fits — live, from cloud.db.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-5 min-h-[640px]">
        {/* Terminal — 1/4 of the screen */}
        <div className="col-span-12 lg:col-span-3">
          <Terminal
            cpu={cpu}
            vram={vram}
            setCpu={setCpu}
            setVram={setVram}
            log={log}
            busy={busy}
            onProvision={provision}
            decision={decision}
          />
        </div>

        {/* Globe — 3/4 of the screen */}
        <div className="col-span-12 lg:col-span-9 relative rounded-[28px] overflow-hidden border border-white/10 bg-[#020608]">
          <div className="absolute inset-0">
            <Globe
              nodes={datacenters}
              optimalId={optimalDcId}
              vivid
            />
          </div>

          {/* Globe overlay header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-5 flex items-start justify-between pointer-events-none">
            <div className="glass-soft px-3.5 py-2.5 pointer-events-auto">
              <div className="eyebrow">Live grid</div>
              <div className="text-[12.5px] text-white">
                {datacenters.length} regions · 3 providers
              </div>
            </div>
            <div className="glass-soft px-3.5 py-2.5 pointer-events-auto flex items-center gap-3">
              <span className="size-2 rounded-full bg-emerald-300" style={{ boxShadow: "0 0 12px #86efac" }} />
              <div className="flex flex-col leading-tight">
                <span className="eyebrow">Routed to</span>
                <span className="text-[12.5px] text-emerald-300">
                  {decision ? `${decision.optimal.provider.toUpperCase()} · ${decision.optimal.region}` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 50%, transparent 60%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ───────── Terminal ───────── */

function Terminal({
  cpu, vram, setCpu, setVram, log, busy, onProvision, decision,
}: {
  cpu: number;
  vram: number;
  setCpu: (n: number) => void;
  setVram: (n: number) => void;
  log: Line[];
  busy: boolean;
  onProvision: () => void;
  decision: Decision | null;
}) {
  return (
    <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[#06080b] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] h-full flex flex-col font-mono">
      {/* title bar */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11.5px] text-white/45 tracking-wide">
          ~/ecocloud — router
        </span>
      </div>

      {/* inputs */}
      <div className="px-4 py-4 flex flex-col gap-3 border-b border-white/[0.06]">
        <Knob
          label="CPU"
          unit="cores"
          value={cpu}
          min={2}
          max={64}
          step={2}
          onChange={setCpu}
        />
        <Knob
          label="VRAM"
          unit="GB"
          value={vram}
          min={1}
          max={256}
          step={1}
          onChange={setVram}
        />
        <button
          disabled={busy}
          onClick={onProvision}
          className="mt-1 h-10 rounded-lg bg-emerald-300 text-black font-semibold text-[13px] tracking-tight hover:bg-emerald-200 disabled:opacity-60 disabled:cursor-progress flex items-center justify-center gap-1.5"
        >
          {busy ? "routing…" : "Provision workload"}
          {!busy && (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>

      {/* log */}
      <div className="flex-1 px-4 py-3 overflow-y-auto text-[12px] leading-[1.6] flex flex-col">
        {log.map((l, i) => (
          <LogLine key={i} {...l} />
        ))}
        {busy && (
          <div className="text-emerald-300/70 mt-1 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-300 breath" />
            scanning…
          </div>
        )}
        {!busy && (
          <div className="text-white/35 mt-1">
            <span className="text-emerald-300">$</span>
            <span className="ml-2 inline-block w-1.5 h-3 bg-emerald-300/70 align-middle" />
          </div>
        )}
      </div>

      {decision && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-emerald-300/[0.04] flex items-center justify-between gap-2">
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[10px] tracking-[0.18em] text-white/45 uppercase">Saving</span>
            <span className="text-emerald-300 text-[18px] font-semibold tracking-tight">
              {decision.savingsPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col items-end leading-tight min-w-0">
            <span className="text-[10px] tracking-[0.18em] text-white/45 uppercase">Best $/hr</span>
            <span className="text-white text-[14px] tracking-tight">
              ${decision.optimal.pricePerHour.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Knob({
  label, unit, value, min, max, step, onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-white/55 tracking-wide">--{label.toLowerCase()}</span>
        <span className="text-white/40">{unit}</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/10 px-2 h-10">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="size-7 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition"
          type="button"
        >−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
          className="flex-1 bg-transparent text-emerald-300 text-[15px] text-center outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="size-7 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition"
          type="button"
        >+</button>
      </div>
    </div>
  );
}

function LogLine({ kind, text }: Line) {
  if (kind === "in") {
    return (
      <div className="text-white/85">
        <span className="text-emerald-300">$</span>{" "}
        <span>{text}</span>
      </div>
    );
  }
  if (kind === "ok") {
    return (
      <div className="text-emerald-300/85">
        <span className="opacity-50">›</span> {text}
      </div>
    );
  }
  if (kind === "err") {
    return (
      <div className="text-rose-300/90">
        <span className="opacity-50">›</span> {text}
      </div>
    );
  }
  if (kind === "info") {
    return (
      <div className="text-white/40 italic">{text}</div>
    );
  }
  return <div className="text-white/55">{text}</div>;
}
