"use client";

import { useEffect, useState } from "react";
import type {
  Datacenter,
  DatacenterDetail,
  Offer,
} from "../lib/datacenters";

type Props = { datacenters: Datacenter[] };

const PROVIDER_TONE: Record<string, { ring: string; text: string; bg: string }> = {
  aws:   { ring: "ring-amber-300/30",  text: "text-amber-300",  bg: "bg-amber-300/10" },
  gcp:   { ring: "ring-cyan-300/30",   text: "text-cyan-300",   bg: "bg-cyan-300/10" },
  azure: { ring: "ring-emerald-300/30",text: "text-emerald-300",bg: "bg-emerald-300/10" },
};

export default function DatacentersSection({ datacenters }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DatacenterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "aws" | "gcp" | "azure">("all");

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/datacenters/${encodeURIComponent(activeId)}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .finally(() => setLoading(false));
  }, [activeId]);

  const filtered =
    filter === "all" ? datacenters : datacenters.filter((d) => d.provider === filter);

  return (
    <section className="relative min-h-screen w-full px-8 py-12 flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="eyebrow text-white/45">03 · LIVE GRID</span>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.03em] text-white">
            Live data centers.
          </h2>
          <p className="text-[13px] text-white/45 mt-2 max-w-[60ch]">
            Streaming directly from <span className="font-mono text-emerald-300/80">cloud.db</span>.
            {" "}
            <span className="text-white/70 numeric">{datacenters.length}</span> regions ·
            {" "}
            <span className="text-white/70 numeric">
              {datacenters.reduce((s, d) => s + d.offers, 0)}
            </span>{" "}
            SKUs. Click a region to inspect every offer.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(["all", "aws", "gcp", "azure"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              data-active={filter === p}
              className="px-3 h-8 rounded-lg text-[12px] tracking-wide uppercase text-white/60 data-[active=true]:bg-white/10 data-[active=true]:text-white transition"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((dc) => {
          const tone = PROVIDER_TONE[dc.provider] ?? PROVIDER_TONE.aws;
          return (
            <li key={dc.id}>
              <button
                onClick={() => setActiveId(dc.id)}
                className="group w-full text-left rounded-2xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/20 transition p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[15px] font-medium text-white tracking-tight truncate">
                      {dc.city}
                    </span>
                    <span className="text-[11px] text-white/45 truncate">
                      {dc.country} · {dc.regionCode}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-[0.15em] uppercase ring-1 ${tone.ring} ${tone.text} ${tone.bg}`}
                  >
                    {dc.provider}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 numeric">
                  <Mini label="from" value={`$${dc.minPrice.toFixed(2)}`} accent />
                  <Mini label="avg"  value={`$${dc.avgPrice.toFixed(2)}`} />
                  <Mini label="skus" value={String(dc.offers)} />
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-white/40">
                  <span>up to {dc.cpuMax} cores · {dc.vramMax}GB</span>
                  <span className="opacity-0 group-hover:opacity-100 transition text-emerald-300">
                    inspect →
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {activeId && (
        <DetailModal
          loading={loading}
          detail={detail}
          onClose={() => setActiveId(null)}
        />
      )}
    </section>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/[0.06] px-2 py-1.5 flex flex-col leading-tight">
      <span className="text-[9.5px] uppercase tracking-[0.16em] text-white/35">{label}</span>
      <span className={`text-[13px] ${accent ? "text-emerald-300" : "text-white/85"}`}>
        {value}
      </span>
    </div>
  );
}

/* ───────── Detail modal ───────── */

function DetailModal({
  detail, loading, onClose,
}: {
  detail: DatacenterDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-6"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        aria-hidden
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0a0e12]/95 backdrop-blur-2xl shadow-[0_30px_120px_-20px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        {loading || !detail ? (
          <div className="p-10 text-center text-white/55 text-sm">
            <span className="inline-block size-2 rounded-full bg-emerald-300 mr-2 breath align-middle" />
            loading region detail…
          </div>
        ) : (
          <DetailBody detail={detail} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function DetailBody({
  detail, onClose,
}: {
  detail: DatacenterDetail;
  onClose: () => void;
}) {
  const dc = detail.datacenter;
  const tone = PROVIDER_TONE[dc.provider] ?? PROVIDER_TONE.aws;
  return (
    <>
      <div className="p-6 flex items-start justify-between gap-4 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-white/45">DATACENTER</span>
          <h3 className="text-[24px] font-semibold tracking-tight text-white">
            {dc.city}
            <span className="text-white/40 font-normal text-[16px] ml-2">{dc.country}</span>
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-[0.15em] uppercase ring-1 ${tone.ring} ${tone.text} ${tone.bg}`}>
              {dc.provider}
            </span>
            <span className="text-[11.5px] text-white/45 font-mono">{dc.regionLabel}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="size-9 rounded-lg grid place-items-center text-white/55 hover:text-white hover:bg-white/5 transition"
          aria-label="close"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>

      <div className="p-6 grid grid-cols-3 gap-3 border-b border-white/[0.06]">
        <Stat label="From"        value={`$${dc.minPrice.toFixed(2)}/hr`} tone="leaf" />
        <Stat label="Average"     value={`$${dc.avgPrice.toFixed(2)}/hr`} />
        <Stat label="Peak"        value={`$${dc.maxPrice.toFixed(2)}/hr`} tone="warn" />
        <Stat label="Offers"      value={String(dc.offers)} />
        <Stat label="Max CPU"     value={`${dc.cpuMax} cores`} />
        <Stat label="Max VRAM"    value={`${dc.vramMax} GB`} />
      </div>

      <div className="p-6 max-h-[40vh] overflow-y-auto">
        <span className="eyebrow text-white/45">OFFERS</span>
        <ul className="mt-3 flex flex-col gap-1.5">
          {detail.offers.map((o, i) => (
            <OfferRow key={o.id} offer={o} highlight={i === 0} />
          ))}
        </ul>
      </div>
    </>
  );
}

function Stat({
  label, value, tone,
}: { label: string; value: string; tone?: "leaf" | "warn" }) {
  const color =
    tone === "leaf" ? "text-emerald-300"
    : tone === "warn" ? "text-amber-300"
    : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="text-[10px] tracking-[0.18em] uppercase text-white/40">{label}</div>
      <div className={`text-[16px] font-semibold tracking-tight numeric ${color}`}>
        {value}
      </div>
    </div>
  );
}

function OfferRow({ offer, highlight }: { offer: Offer; highlight?: boolean }) {
  return (
    <li
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
        highlight
          ? "border-emerald-300/30 bg-emerald-300/[0.06]"
          : "border-white/[0.05] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-white/45 numeric w-8">#{offer.id}</span>
        <span className="text-[13px] text-white">
          {offer.cpu} <span className="text-white/45">CPU</span>{" "}
          <span className="text-white/30 mx-1">·</span>{" "}
          {offer.vram} <span className="text-white/45">GB VRAM</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {highlight && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-300 bg-emerald-300/15 border border-emerald-300/30">
            CHEAPEST
          </span>
        )}
        <span className={`numeric text-[14px] ${highlight ? "text-emerald-300" : "text-white/85"}`}>
          ${offer.pricePerHour.toFixed(2)}/hr
        </span>
      </div>
    </li>
  );
}
