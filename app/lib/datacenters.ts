// Shared types between server (API routes) and client.
// Carbon has been removed from the model — pricing & locality only.

export type Provider = "aws" | "gcp" | "azure" | string;

export type Datacenter = {
  // Composite id derived from provider+region so the same region from
  // different providers is treated as distinct nodes on the globe.
  id: string;
  provider: Provider;
  regionCode: string;       // e.g. us-east-1
  regionLabel: string;      // raw label from DB
  city: string;
  country: string;
  lat: number;
  lon: number;
  // Aggregated across all SKUs for this provider+region pair.
  offers: number;           // count of SKUs
  minPrice: number;         // cheapest $/hr in this region
  avgPrice: number;
  maxPrice: number;
  cpuMax: number;
  vramMax: number;
};

export type Offer = {
  id: number;
  provider: Provider;
  cpu: number;
  vram: number;
  pricePerHour: number;
  region: string;
};

export type Decision = {
  request: { cpu: number; vram: number };
  optimal: Offer;
  baseline: Offer;          // most expensive matching offer (worst case)
  matches: Offer[];
  savingsPct: number;       // optimal vs baseline
  avgPrice: number;
  totalMatches: number;
};

export type DatacenterDetail = {
  datacenter: Datacenter;
  offers: Offer[];
};
