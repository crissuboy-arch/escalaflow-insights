// ─── Persistent cover storage ─────────────────────────────────────────────────
// Primary storage: ebook_covers_v2 → { [ebookId]: CoverData }
// This is separate from the full ebook state so large base64 images
// don't push the combined localStorage entry over the 5 MB quota.

export interface CoverData {
  imageUrl: string;   // data:image/... or data:image/svg+xml;base64,...
  prompt?: string;    // AI prompt used to generate
  type: "ai" | "upload" | "fallback";
  source: "gemini" | "upload" | "css";
  updatedAt: string;  // ISO timestamp
}

const STORE_KEY = "ebook_covers_v2";

function readStore(): Record<string, CoverData> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CoverData>) : {};
  } catch { return {}; }
}

function writeStore(store: Record<string, CoverData>): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // QuotaExceededError — try to free space by pruning the oldest cover
    try {
      const entries = Object.entries(store).sort((a, b) =>
        a[1].updatedAt < b[1].updatedAt ? -1 : 1,
      );
      if (entries.length > 1) {
        const pruned: Record<string, CoverData> = {};
        entries.slice(1).forEach(([k, v]) => { pruned[k] = v; });
        localStorage.setItem(STORE_KEY, JSON.stringify(pruned));
      }
    } catch { /* give up silently */ }
  }
}

export function saveCover(ebookId: string, data: Omit<CoverData, "updatedAt">): void {
  const store = readStore();
  store[ebookId] = { ...data, updatedAt: new Date().toISOString() };
  writeStore(store);
}

export function loadCover(ebookId: string): CoverData | null {
  return readStore()[ebookId] ?? null;
}

export function deleteCover(ebookId: string): void {
  const store = readStore();
  delete store[ebookId];
  writeStore(store);
}

/** Call once on component mount — returns the persisted image URL or "". */
export function restoreCoverOnMount(ebookId: string): string {
  return readStore()[ebookId]?.imageUrl ?? "";
}

// ─── Per-language cover helpers ────────────────────────────────────────────────
// Secondary storage used by the multi-language feature.
// Falls back to the main cover store if no language-specific cover exists.

const langKey = (id: string, lang: string) => `ebook-cover-${id}-${lang}`;

export function loadCoverForLang(templateId: string, lang: string): string {
  try {
    return (
      localStorage.getItem(langKey(templateId, lang)) ||
      readStore()[templateId]?.imageUrl ||
      ""
    );
  } catch { return restoreCoverOnMount(templateId); }
}

export function saveCoverForLang(templateId: string, lang: string, url: string): void {
  try { localStorage.setItem(langKey(templateId, lang), url); } catch { /* no-op */ }
}

export function clearCoverForLang(templateId: string, lang: string): void {
  try { localStorage.removeItem(langKey(templateId, lang)); } catch { /* no-op */ }
}
