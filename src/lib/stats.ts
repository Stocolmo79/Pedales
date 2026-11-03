import { mutateJson, readJson } from "./json-store";

export type ProductStats = { likes: number; views: number };
type StatsFile = Record<string, ProductStats>;

const KEY = "stats.json";

export async function getStats(): Promise<StatsFile> {
  const { data } = await readJson<StatsFile>(KEY, {});
  return data;
}

export async function incrementStat(productId: string, field: keyof ProductStats, delta: number): Promise<ProductStats> {
  return mutateJson<StatsFile, ProductStats>(KEY, {}, (stats) => {
    const entry = (stats[productId] ??= { likes: 0, views: 0 });
    entry[field] = Math.max(0, entry[field] + delta);
    return { ...entry };
  });
}
