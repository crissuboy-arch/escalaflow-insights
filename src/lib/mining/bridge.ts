// Bridge between the Chrome extension and the EscalaFlow web app.
//
// Two transports are supported simultaneously:
//   1. window.postMessage  (extension content script -> web page)
//      Message shape: { source: "escalaflow-extension", type: "ingest", payload: MiningIngestPayload | MiningIngestPayload[] }
//   2. POST /api/ingest    (extension background -> web app, future)
//      Currently mocked locally; ready to be wired to a real endpoint when backend is available.
//
// Both paths converge into the same MiningRepository so the UI does not care.

import { miningRepo } from "./repository";
import type { MiningIngestPayload } from "./types";

export const EXTENSION_SOURCE = "escalaflow-extension";

export interface ExtensionMessage {
  source: typeof EXTENSION_SOURCE;
  type: "ingest" | "ping";
  payload?: MiningIngestPayload | MiningIngestPayload[];
}

let started = false;
let listener: ((e: MessageEvent) => void) | null = null;

export function startExtensionBridge(onIngest?: (count: number) => void) {
  if (typeof window === "undefined" || started) return;
  started = true;
  listener = async (e: MessageEvent) => {
    const data = e.data as ExtensionMessage | undefined;
    if (!data || data.source !== EXTENSION_SOURCE) return;
    if (data.type === "ingest" && data.payload) {
      const arr = Array.isArray(data.payload) ? data.payload : [data.payload];
      const ads = await miningRepo.ingestMany(arr, "extension");
      onIngest?.(ads.length);
    }
  };
  window.addEventListener("message", listener);
}

export function stopExtensionBridge() {
  if (typeof window === "undefined" || !listener) return;
  window.removeEventListener("message", listener);
  listener = null;
  started = false;
}

// Detect whether a real extension is broadcasting a handshake on the page.
// Returns a promise that resolves true when a "ping" message is received within `timeoutMs`.
export function detectExtension(timeoutMs = 800): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      const data = e.data as ExtensionMessage | undefined;
      if (data?.source === EXTENSION_SOURCE && data.type === "ping") {
        window.removeEventListener("message", handler);
        resolve(true);
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ source: EXTENSION_SOURCE, type: "ping" }, "*");
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(false);
    }, timeoutMs);
  });
}

// Demo seeder — generates plausible mock ads so the user can see the flow
// without having the extension installed. Clearly marked as demo via source="demo".
const DEMO_PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube"];
const DEMO_NICHES = ["Saúde", "Finanças", "Marketing", "Beleza", "Educação", "Nutra"];
const DEMO_COUNTRIES = ["BR", "US", "ES", "PT", "MX"];
const DEMO_TYPES = ["scaled", "validating", "hot", "ai"];
const DEMO_HEADLINES = [
  "Descubra o método que está dominando o mercado",
  "3 segredos que ninguém te contou sobre escala",
  "Como triplicamos o ROAS em 14 dias",
  "O novo padrão de VSL que está convertendo 12%",
  "Pare de queimar verba: o funil que realmente escala",
];

export async function seedDemoAds(count = 5): Promise<number> {
  const payloads: MiningIngestPayload[] = Array.from({ length: count }, (_, i) => {
    const r = (Date.now() + i) % 1000;
    return {
      headline: DEMO_HEADLINES[r % DEMO_HEADLINES.length],
      copy: "Copy de demonstração capturada localmente — esta entrada está em modo demo.",
      platform: DEMO_PLATFORMS[r % DEMO_PLATFORMS.length],
      country: DEMO_COUNTRIES[r % DEMO_COUNTRIES.length],
      niche: DEMO_NICHES[r % DEMO_NICHES.length],
      score: 50 + (r % 50),
      adUrl: "https://example.com/ad",
      analysisType: DEMO_TYPES[r % DEMO_TYPES.length],
      creativeUrl: `https://images.unsplash.com/photo-15${(56761175 + r) % 99999999}?w=600`,
      createdAt: new Date(Date.now() - r * 60_000).toISOString(),
    };
  });
  const ads = await miningRepo.ingestMany(payloads, "demo");
  return ads.length;
}
