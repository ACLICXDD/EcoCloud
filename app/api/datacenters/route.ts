import { NextResponse } from "next/server";
import { allPrices, type PriceRow } from "../../lib/db";
import { parseRegion } from "../../lib/regions";
import type { Datacenter } from "../../lib/datacenters";

export const dynamic = "force-dynamic";

function aggregate(rows: PriceRow[]): Datacenter[] {
  const groups = new Map<string, PriceRow[]>();
  for (const r of rows) {
    const meta = parseRegion(r.region);
    const key = `${r.provider}::${meta.code}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const out: Datacenter[] = [];
  for (const [key, arr] of groups) {
    const [provider, regionCode] = key.split("::");
    const meta = parseRegion(arr[0].region);
    const prices = arr.map((r) => r.price_per_hour);
    out.push({
      id: key,
      provider,
      regionCode,
      regionLabel: arr[0].region,
      city: meta.city,
      country: meta.country,
      lat: meta.lat,
      lon: meta.lon,
      offers: arr.length,
      minPrice: Math.min(...prices),
      avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length,
      maxPrice: Math.max(...prices),
      cpuMax: Math.max(...arr.map((r) => r.cpu)),
      vramMax: Math.max(...arr.map((r) => r.vram)),
    });
  }
  return out.sort((a, b) => a.minPrice - b.minPrice);
}

export async function GET() {
  const datacenters = aggregate(allPrices());
  return NextResponse.json({ datacenters });
}
