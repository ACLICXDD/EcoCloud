"use client";

import { useEffect, useRef, useState } from "react";

import Hero from "./components/Hero";
import Greeting from "./components/Greeting";
import WorkloadSection from "./components/WorkloadSection";
import DatacentersSection from "./components/DatacentersSection";
import type { Datacenter, Decision } from "./lib/datacenters";

export default function Page() {
  const [username, setUsername] = useState("");
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const greetingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/datacenters")
      .then((r) => r.json())
      .then((d) => setDatacenters(d.datacenters ?? []))
      .catch(() => setDatacenters([]));
  }, []);

  return (
    <div className="relative bg-[#04080a] text-white">
      {/* 01 — Hero */}
      <Hero
        username={username}
        onUsername={setUsername}
        onContinue={() => {
          greetingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {/* 02 — Greeting */}
      <div ref={greetingRef}>
        <Greeting username={username} />
      </div>

      {/* 03 — Workload */}
      <WorkloadSection
        username={username}
        datacenters={datacenters}
        decision={decision}
        onDecide={setDecision}
      />

      {/* 04 — Live data centers */}
      <DatacentersSection datacenters={datacenters} />

      {/* footer */}
      <footer className="px-8 py-10 text-[11px] text-white/35 flex items-center justify-between border-t border-white/[0.05]">
        <span>EcoCloud · routing AI workloads to the cheapest cloud</span>
        <span className="font-mono">cloud.db · {datacenters.length} regions</span>
      </footer>
    </div>
  );
}
