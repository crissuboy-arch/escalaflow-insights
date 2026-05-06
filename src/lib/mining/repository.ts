// Storage-agnostic repository for mined ads.
// Today: localStorage adapter (demo mode).
// Tomorrow: swap with Supabase, Convex, or remote API by implementing MiningRepository.
// The rest of the app must depend ONLY on this module, never on the underlying store.

import type { MinedAd, MiningIngestPayload } from "./types";

const STORAGE_KEY = "escalaflow_mining_v1";
const EVT = "escalaflow:mining:change";

export interface MiningRepository {
  list(): Promise<MinedAd[]>;
  ingest(payload: MiningIngestPayload, source?: MinedAd["source"]): Promise<MinedAd>;
  ingestMany(payloads: MiningIngestPayload[], source?: MinedAd["source"]): Promise<MinedAd[]>;
  update(id: string, patch: Partial<MinedAd>): Promise<MinedAd | null>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  subscribe(cb: () => void): () => void;
}

function uid(): string {
  return `ad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVT));
    // Public alias requested by integrations
    window.dispatchEvent(new Event("escalaFlow:mining:change"));
  }
}

function readAll(): MinedAd[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MinedAd[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: MinedAd[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  emit();
}

function normalize(payload: MiningIngestPayload, source: MinedAd["source"]): MinedAd {
  const now = new Date().toISOString();
  const score = Math.max(0, Math.min(100, Math.round(payload.score ?? 0)));
  return {
    id: uid(),
    headline: payload.headline?.trim() || "(sem headline)",
    copy: payload.copy?.trim() ?? "",
    platform: payload.platform || "Other",
    country: payload.country || "—",
    niche: payload.niche || "Geral",
    score,
    adUrl: payload.adUrl ?? null,
    analysisType: payload.analysisType || "manual",
    creativeUrl: payload.creativeUrl ?? null,
    createdAt: payload.createdAt || now,
    receivedAt: now,
    source,
    status: "new",
    favorite: false,
    raw: payload.raw,
  };
}

export const miningRepo: MiningRepository = {
  async list() {
    return readAll().sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  },
  async ingest(payload, source = "extension") {
    const rows = readAll();
    // Dedup by adUrl (preferred) or by headline+platform fallback
    const dupe = rows.find((r) =>
      (payload.adUrl && r.adUrl && r.adUrl === payload.adUrl) ||
      (!payload.adUrl && r.headline === (payload.headline ?? "").trim() && r.platform === (payload.platform ?? "Other"))
    );
    if (dupe) {
      return dupe;
    }
    const ad = normalize(payload, source);
    rows.unshift(ad);
    writeAll(rows);
    return ad;
  },
  async ingestMany(payloads, source = "extension") {
    const out: MinedAd[] = [];
    for (const p of payloads) {
      out.push(await miningRepo.ingest(p, source));
    }
    return out;
  },
  async update(id, patch) {
    const rows = readAll();
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return null;
    rows[i] = { ...rows[i], ...patch };
    writeAll(rows);
    return rows[i];
  },
  async remove(id) {
    writeAll(readAll().filter((r) => r.id !== id));
  },
  async clear() {
    writeAll([]);
  },
  subscribe(cb) {
    if (typeof window === "undefined") return () => {};
    const h = () => cb();
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  },
};
