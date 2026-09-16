// Heuristic offer-network detection from a URL (ad landing page, checkout, etc).
// Evidence-based only — never guesses. Returns "desconhecido" with no
// confidence when there isn't a clear domain/path signal to match.

export type OfferNetwork =
  | "clickbank"
  | "hotmart"
  | "kiwify"
  | "digistore24"
  | "shopify"
  | "braip"
  | "checkout-proprio"
  | "desconhecido";

export type OfferNetworkConfidence = "alta" | "media" | "baixa";

export interface OfferNetworkResult {
  network: OfferNetwork;
  confidence: OfferNetworkConfidence | null;
}

const DOMAIN_PATTERNS: Array<[RegExp, OfferNetwork, OfferNetworkConfidence]> = [
  [/(^|\.)clickbank\.(com|net)/i, "clickbank", "alta"],
  [/\/cbmall\.|hop\.clickbank\.net/i, "clickbank", "alta"],
  [/(^|\.)hotmart\.com/i, "hotmart", "alta"],
  [/(^|\.)kiwify\.com(\.br)?/i, "kiwify", "alta"],
  [/(^|\.)digistore24\.com/i, "digistore24", "alta"],
  [/(^|\.)myshopify\.com/i, "shopify", "alta"],
  [/cdn\.shopify\.com/i, "shopify", "media"],
  [/(^|\.)braip\.com/i, "braip", "alta"],
];

// Generic "self-hosted checkout" path signals — lower confidence since these
// patterns are common to many independent checkout implementations too.
const CHECKOUT_PATH_PATTERN = /\/(checkout|cart|carrinho|pedido|order)(\/|$|\?)/i;

export function detectOfferNetwork(url: string | null | undefined): OfferNetworkResult {
  if (!url || !url.trim()) return { network: "desconhecido", confidence: null };
  const u = url.trim();

  for (const [pattern, network, confidence] of DOMAIN_PATTERNS) {
    if (pattern.test(u)) return { network, confidence };
  }

  if (CHECKOUT_PATH_PATTERN.test(u)) {
    return { network: "checkout-proprio", confidence: "baixa" };
  }

  return { network: "desconhecido", confidence: null };
}
