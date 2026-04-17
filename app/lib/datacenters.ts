
export type Provider = "aws" | "gcp" | "azure" | string;

export type Datacenter = {
  id: string;
  provider: Provider;
  regionCode: string;       
  regionLabel: string;      
  city: string;
  country: string;
  lat: number;
  lon: number;
  offers: number;           
  minPrice: number;        
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
  baseline: Offer;          
  matches: Offer[];
  savingsPct: number;      
  avgPrice: number;
  totalMatches: number;
};

export type DatacenterDetail = {
  datacenter: Datacenter;
  offers: Offer[];
};
