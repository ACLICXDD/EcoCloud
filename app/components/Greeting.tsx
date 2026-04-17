"use client";

type Props = { username: string };

export default function Greeting({ username }: Props) {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Soft aurora */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none drift"
        style={{
          background:
            "radial-gradient(60% 40% at 30% 40%, rgba(75,228,197,0.12), transparent 60%)," +
            "radial-gradient(50% 35% at 70% 60%, rgba(90,215,255,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 text-center px-6">
        <p className="eyebrow text-emerald-300/80 mb-6">SIGNED IN</p>
        <h2 className="text-white tracking-[-0.04em] font-semibold leading-[0.95] text-[clamp(48px,9vw,128px)]">
          Hello,{" "}
          <span className="text-grad-eco">{username || "friend"}.</span>
        </h2>
        <p className="mt-8 text-[18px] md:text-[20px] text-white/65 max-w-[40ch] mx-auto leading-relaxed">
          Welcome to <span className="text-white">EcoCloud</span> — your global
          control room for routing AI workloads to the cheapest, fastest cloud.
        </p>

        <div className="mt-12 flex items-center justify-center gap-3 text-white/40 text-[12px]">
          <span className="size-1.5 rounded-full bg-emerald-300 breath" />
          Live grid · 100 SKUs across 34 regions
        </div>
      </div>
    </section>
  );
}
