// Pure analysis helpers used by the future "Radar de Oportunidade" UI.
// Operates on collected ads in memory — no DB, no React.

import type { CollectorAd } from "../collector/collector.types";

const DAY = 86_400_000;

function recent(ad: CollectorAd, days: number): boolean {
  const t = new Date(ad.createdAt).getTime();
  return Date.now() - t <= days * DAY;
}

export function hotNiches(ads: CollectorAd[], days = 7) {
  const counts = new Map<string, number>();
  for (const a of ads) {
    if (!recent(a, days)) continue;
    const key = a.subniche || a.niche || "Outros";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([niche, count]) => ({ niche, count }))
    .sort((a, b) => b.count - a.count);
}

function creativeKey(a: CollectorAd): string {
  return `${a.advertiser}|${a.headline}|${a.imageUrl ?? a.videoUrl ?? ""}`;
}

export function repeatedCreatives(ads: CollectorAd[]) {
  const groups = new Map<string, CollectorAd[]>();
  for (const a of ads) {
    const k = creativeKey(a);
    const arr = groups.get(k) ?? [];
    arr.push(a);
    groups.set(k, arr);
  }
  return Array.from(groups.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([key, items]) => ({ key, count: items.length, sample: items[0] }))
    .sort((a, b) => b.count - a.count);
}

export function scalingCreatives(ads: CollectorAd[]) {
  return ads
    .filter((a) => (a.score ?? 0) >= 75 && (a.platforms?.length ?? 0) >= 2)
    .sort((a, b) => b.score - a.score);
}

export function dominantPromises(ads: CollectorAd[]) {
  const counts = new Map<string, number>();
  for (const a of ads) {
    if (!a.promise) continue;
    counts.set(a.promise, (counts.get(a.promise) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([promise, count]) => ({ promise, count }))
    .sort((a, b) => b.count - a.count);
}

export function saturatedProducts(ads: CollectorAd[], minRepeat = 5) {
  return repeatedCreatives(ads).filter((g) => g.count >= minRepeat);
}

export function trends(ads: CollectorAd[]) {
  return {
    hotNiches: hotNiches(ads),
    repeatedCreatives: repeatedCreatives(ads),
    scalingCreatives: scalingCreatives(ads),
    dominantPromises: dominantPromises(ads),
    saturatedProducts: saturatedProducts(ads),
  };
}