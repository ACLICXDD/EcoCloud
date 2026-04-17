import { NextResponse } from "next/server";
import { priceQuery } from "../../lib/db";
import type { Decision, Offer } from "../../lib/datacenters";
import { parseRegion } from "../../lib/regions";

export const dynamic = "force-dynamic";

type Body = { cpu?: number; vram?: number };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const cpu = Math.max(1, Math.floor(body.cpu ?? 0));
  const vram = Math.max(0, Number(body.vram ?? 0));

  if (!cpu || !vram) {
    return NextResponse.json({ error: "cpu and vram are required" }, { status: 400 });
  }

  const rows = priceQuery({ minCpu: cpu, minVram: vram });
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No matching offers in the database for that workload." },
      { status: 404 }
    );
  }

  const matches: Offer[] = rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    cpu: r.cpu,
    vram: r.vram,
    pricePerHour: r.price_per_hour,
    region: r.region,
  }));

  const optimal = matches[0];
  const baseline = matches[matches.length - 1];
  const avg = matches.reduce((s, m) => s + m.pricePerHour, 0) / matches.length;
  const optimalRegionCode = parseRegion(optimal.region).code;

  const decision: Decision = {
    request: { cpu, vram },
    optimalDatacenterId: `${optimal.provider}::${optimalRegionCode}`,
    optimal,
    baseline,
    matches,
    savingsPct:
      baseline.pricePerHour > 0
        ? ((baseline.pricePerHour - optimal.pricePerHour) / baseline.pricePerHour) * 100
        : 0,
    avgPrice: avg,
    totalMatches: matches.length,
  };

  return NextResponse.json(decision);
}
