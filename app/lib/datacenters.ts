// Mock data for the carbon-aware AI workload routing simulation.
// Latitude / longitude are used to plot the node on the globe.

export type Priority = "low_cost" | "low_carbon" | "balanced";

export type Datacenter = {
  id: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  // Watts per workload (lower is better)
  power: number;
  // gCO2 per kWh (lower is better, sourced from a mocked grid intensity API)
  carbonIntensity: number;
  // $ per workload (lower is better)
  cost: number;
  // ms (lower is better)
  latency: number;
  // Primary energy source label, for the node card.
  source: "Hydro" | "Solar" | "Wind" | "Geothermal" | "Mixed" | "Coal-heavy" | "Gas";
};

export const DATACENTERS: Datacenter[] = [
  { id: "isl-rkv", city: "Reykjavík",   region: "is-north-1",   country: "Iceland",      lat: 64.13, lon: -21.94, power: 240, carbonIntensity:  28, cost: 0.018, latency: 142, source: "Geothermal" },
  { id: "nor-osl", city: "Oslo",         region: "no-east-1",    country: "Norway",       lat: 59.91, lon:  10.75, power: 260, carbonIntensity:  41, cost: 0.022, latency: 118, source: "Hydro" },
  { id: "swe-sto", city: "Stockholm",    region: "eu-north-1",   country: "Sweden",       lat: 59.33, lon:  18.07, power: 270, carbonIntensity:  55, cost: 0.024, latency: 122, source: "Mixed" },
  { id: "fra-par", city: "Paris",        region: "eu-west-3",    country: "France",       lat: 48.85, lon:   2.35, power: 295, carbonIntensity:  78, cost: 0.029, latency:  96, source: "Mixed" },
  { id: "deu-fra", city: "Frankfurt",    region: "eu-central-1", country: "Germany",      lat: 50.11, lon:   8.68, power: 305, carbonIntensity: 312, cost: 0.031, latency:  88, source: "Coal-heavy" },
  { id: "irl-dub", city: "Dublin",       region: "eu-west-1",    country: "Ireland",      lat: 53.35, lon:  -6.26, power: 290, carbonIntensity: 250, cost: 0.027, latency: 102, source: "Wind" },
  { id: "usa-iad", city: "Virginia",     region: "us-east-1",    country: "United States",lat: 38.95, lon: -77.45, power: 330, carbonIntensity: 380, cost: 0.026, latency:  64, source: "Mixed" },
  { id: "usa-pdx", city: "Oregon",       region: "us-west-2",    country: "United States",lat: 45.84, lon:-119.70, power: 285, carbonIntensity: 110, cost: 0.024, latency:  72, source: "Hydro" },
  { id: "can-mtl", city: "Montréal",     region: "ca-central-1", country: "Canada",       lat: 45.50, lon: -73.57, power: 270, carbonIntensity:  35, cost: 0.023, latency:  80, source: "Hydro" },
  { id: "bra-gru", city: "São Paulo",    region: "sa-east-1",    country: "Brazil",       lat:-23.55, lon: -46.63, power: 320, carbonIntensity:  92, cost: 0.030, latency: 158, source: "Hydro" },
  { id: "ind-blr", city: "Bengaluru",    region: "ap-south-1",   country: "India",        lat: 12.97, lon:  77.59, power: 360, carbonIntensity: 645, cost: 0.020, latency: 188, source: "Coal-heavy" },
  { id: "sgp-sin", city: "Singapore",    region: "ap-southeast-1",country: "Singapore",   lat:  1.35, lon: 103.82, power: 340, carbonIntensity: 420, cost: 0.028, latency: 196, source: "Gas" },
  { id: "jpn-nrt", city: "Tokyo",        region: "ap-northeast-1",country: "Japan",       lat: 35.68, lon: 139.69, power: 325, carbonIntensity: 470, cost: 0.032, latency: 168, source: "Mixed" },
  { id: "aus-syd", city: "Sydney",       region: "ap-southeast-2",country: "Australia",   lat:-33.87, lon: 151.21, power: 335, carbonIntensity: 510, cost: 0.029, latency: 214, source: "Mixed" },
  { id: "zaf-cpt", city: "Cape Town",    region: "af-south-1",   country: "South Africa", lat:-33.92, lon:  18.42, power: 350, carbonIntensity: 720, cost: 0.025, latency: 232, source: "Coal-heavy" },
  { id: "are-dxb", city: "Dubai",        region: "me-central-1", country: "UAE",          lat: 25.20, lon:  55.27, power: 345, carbonIntensity: 480, cost: 0.026, latency: 178, source: "Solar" },
];

// User origin (mocked) — São Francisco. Used for "naive nearest" baseline.
export const ORIGIN = { city: "San Francisco", lat: 37.77, lon: -122.42 };

// ───────── Scoring ─────────
// Score = (Power × Carbon Intensity) + Cost + Latency
// Lower score = better node
// Weights are tuned by user priority.

export type Weights = { carbon: number; cost: number; latency: number };

export function weightsFor(priority: Priority): Weights {
  switch (priority) {
    case "low_cost":   return { carbon: 0.6, cost: 1.6, latency: 0.9 };
    case "low_carbon": return { carbon: 1.8, cost: 0.6, latency: 0.7 };
    case "balanced":   return { carbon: 1.0, cost: 1.0, latency: 1.0 };
  }
}

export function rawScore(dc: Datacenter, w: Weights): number {
  // Normalize power×carbon term to keep components on similar scales.
  const carbonTerm = (dc.power * dc.carbonIntensity) / 1000; // kWh-ish
  return carbonTerm * w.carbon + dc.cost * 1000 * w.cost + dc.latency * w.latency;
}

export function scoreAll(priority: Priority, latencyLimitMs?: number) {
  const w = weightsFor(priority);
  return DATACENTERS
    .filter((dc) => (latencyLimitMs ? dc.latency <= latencyLimitMs : true))
    .map((dc) => ({ dc, score: rawScore(dc, w) }))
    .sort((a, b) => a.score - b.score);
}

export function pickOptimal(priority: Priority, latencyLimitMs?: number) {
  const ranked = scoreAll(priority, latencyLimitMs);
  return ranked[0]?.dc ?? null;
}

// Naive baseline: lowest latency only.
export function pickBaseline() {
  return [...DATACENTERS].sort((a, b) => a.latency - b.latency)[0];
}

export type Decision = {
  optimal: Datacenter;
  baseline: Datacenter;
  carbonSavingsPct: number;
  costSavingsPct: number;
  latencyDeltaMs: number;
  emissionsOptimalG: number;
  emissionsBaselineG: number;
  costOptimal: number;
  costBaseline: number;
};

export function decide(priority: Priority, latencyLimitMs?: number): Decision {
  const optimal = pickOptimal(priority, latencyLimitMs) ?? DATACENTERS[0];
  const baseline = pickBaseline();

  // Per-workload emissions in grams CO2: power(W) * 1h ≈ W·h, /1000 → kWh, × gCO2/kWh.
  const emissionsOptimal = (optimal.power / 1000) * optimal.carbonIntensity;
  const emissionsBaseline = (baseline.power / 1000) * baseline.carbonIntensity;

  const carbonSavings = ((emissionsBaseline - emissionsOptimal) / Math.max(emissionsBaseline, 1)) * 100;
  const costSavings = ((baseline.cost - optimal.cost) / Math.max(baseline.cost, 1e-6)) * 100;

  return {
    optimal,
    baseline,
    carbonSavingsPct: carbonSavings,
    costSavingsPct: costSavings,
    latencyDeltaMs: optimal.latency - baseline.latency,
    emissionsOptimalG: emissionsOptimal,
    emissionsBaselineG: emissionsBaseline,
    costOptimal: optimal.cost,
    costBaseline: baseline.cost,
  };
}
