// Maps a region string from the Prices DB (e.g. "us-east-1 (N. Virginia, USA)")
// to a city, country and lat/lon for plotting on the globe.

export type RegionMeta = {
  code: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

const TABLE: Record<string, Omit<RegionMeta, "code">> = {
  "af-south-1":     { city: "Cape Town",      country: "South Africa", lat: -33.92, lon:  18.42 },
  "ap-east-1":      { city: "Hong Kong",      country: "China",        lat:  22.31, lon: 114.16 },
  "ap-northeast-1": { city: "Tokyo",          country: "Japan",        lat:  35.68, lon: 139.69 },
  "ap-northeast-2": { city: "Seoul",          country: "South Korea",  lat:  37.56, lon: 126.97 },
  "ap-northeast-3": { city: "Osaka",          country: "Japan",        lat:  34.69, lon: 135.50 },
  "ap-south-1":     { city: "Mumbai",         country: "India",        lat:  19.07, lon:  72.87 },
  "ap-south-2":     { city: "Hyderabad",      country: "India",        lat:  17.38, lon:  78.48 },
  "ap-southeast-1": { city: "Singapore",      country: "Singapore",    lat:   1.35, lon: 103.82 },
  "ap-southeast-2": { city: "Sydney",         country: "Australia",    lat: -33.87, lon: 151.21 },
  "ap-southeast-3": { city: "Jakarta",        country: "Indonesia",    lat:  -6.21, lon: 106.85 },
  "ap-southeast-4": { city: "Melbourne",      country: "Australia",    lat: -37.81, lon: 144.96 },
  "ap-southeast-5": { city: "Bangkok",        country: "Thailand",     lat:  13.76, lon: 100.50 },
  "ca-central-1":   { city: "Montréal",       country: "Canada",       lat:  45.50, lon: -73.57 },
  "ca-west-1":      { city: "Calgary",        country: "Canada",       lat:  51.05, lon:-114.07 },
  "cn-north-1":     { city: "Beijing",        country: "China",        lat:  39.90, lon: 116.40 },
  "cn-northwest-1": { city: "Ningxia",        country: "China",        lat:  38.47, lon: 106.27 },
  "eu-central-1":   { city: "Frankfurt",      country: "Germany",      lat:  50.11, lon:   8.68 },
  "eu-central-2":   { city: "Zurich",         country: "Switzerland",  lat:  47.38, lon:   8.55 },
  "eu-north-1":     { city: "Stockholm",      country: "Sweden",       lat:  59.33, lon:  18.07 },
  "eu-south-1":     { city: "Milan",          country: "Italy",        lat:  45.46, lon:   9.19 },
  "eu-south-2":     { city: "Madrid",         country: "Spain",        lat:  40.42, lon:  -3.70 },
  "eu-west-1":      { city: "Dublin",         country: "Ireland",      lat:  53.35, lon:  -6.26 },
  "eu-west-2":      { city: "London",         country: "United Kingdom", lat: 51.51, lon:-0.13 },
  "eu-west-3":      { city: "Paris",          country: "France",       lat:  48.85, lon:   2.35 },
  "il-central-1":   { city: "Tel Aviv",       country: "Israel",       lat:  32.08, lon:  34.78 },
  "me-central-1":   { city: "Dubai",          country: "UAE",          lat:  25.20, lon:  55.27 },
  "me-south-1":     { city: "Manama",         country: "Bahrain",      lat:  26.23, lon:  50.58 },
  "mx-central-1":   { city: "Mexico City",    country: "Mexico",       lat:  19.43, lon: -99.13 },
  "sa-east-1":      { city: "São Paulo",      country: "Brazil",       lat: -23.55, lon: -46.63 },
  "us-east-1":      { city: "N. Virginia",    country: "United States",lat:  38.95, lon: -77.45 },
  "us-east-2":      { city: "Ohio",           country: "United States",lat:  40.42, lon: -82.91 },
  "us-gov-west-1":  { city: "AWS GovCloud",   country: "United States",lat:  43.62, lon:-116.21 },
  "us-west-1":      { city: "N. California",  country: "United States",lat:  37.77, lon:-122.42 },
  "us-west-2":      { city: "Oregon",         country: "United States",lat:  45.84, lon:-119.70 },
};

// Extracts the AWS-style region code at the start of the DB string.
export function parseRegion(raw: string): RegionMeta {
  const code = raw.split(" ")[0].trim();
  const meta = TABLE[code];
  if (meta) return { code, ...meta };
  return { code, city: code, country: "Unknown", lat: 0, lon: 0 };
}
