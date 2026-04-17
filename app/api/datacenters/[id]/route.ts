import { NextResponse } from "next/server";
import { allPrices } from "@/app/lib/db";
import { parseRegion } from "@/app/lib/regions";
import type { DatacenterDetail, Offer } from "@/app/lib/datacenters";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const decoded = decodeURIComponent(id);
  const [provider, regionCode] = decoded.split("::");

  const rows = allPrices().filter((r) => {
    const meta = parseRegion(r.region);
    return r.provider === provider && meta.code === regionCode;
  });

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const meta = parseRegion(rows[0].region);
  const prices = rows.map((r) => r.price_per_hour);

  const offers: Offer[] = rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    cpu: r.cpu,
    vram: r.vram,
    pricePerHour: r.price_per_hour,
    region: r.region,
  }));

  const detail: DatacenterDetail = {
    datacenter: {
      id: decoded,
      provider,
      regionCode,
      regionLabel: rows[0].region,
      city: meta.city,
      country: meta.country,
      lat: meta.lat,
      lon: meta.lon,
      offers: rows.length,
      minPrice: Math.min(...prices),
      avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length,
      maxPrice: Math.max(...prices),
      cpuMax: Math.max(...rows.map((r) => r.cpu)),
      vramMax: Math.max(...rows.map((r) => r.vram)),
    },
    offers: offers.sort((a, b) => a.pricePerHour - b.pricePerHour),
  };

  return NextResponse.json(detail);
}
