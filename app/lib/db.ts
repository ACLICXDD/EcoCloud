import "server-only";
import path from "node:path";
import Database from "better-sqlite3";

let _db: Database.Database | null = null;

function db() {
  if (!_db) {
    const file = path.join(process.cwd(), "data", "cloud.db");
    _db = new Database(file, { readonly: true, fileMustExist: true });
  }
  return _db;
}

export type PriceRow = {
  id: number;
  provider: string;
  cpu: number;
  vram: number;
  price_per_hour: number;
  region: string;
};

export function allPrices(): PriceRow[] {
  return db()
    .prepare("SELECT id, provider, cpu, vram, price_per_hour, region FROM Prices ORDER BY price_per_hour ASC")
    .all() as PriceRow[];
}

export function priceQuery(opts: { minCpu: number; minVram: number }) {
  return db()
    .prepare(
      `SELECT id, provider, cpu, vram, price_per_hour, region
       FROM Prices
       WHERE cpu >= @minCpu AND vram >= @minVram
       ORDER BY price_per_hour ASC`
    )
    .all(opts) as PriceRow[];
}
