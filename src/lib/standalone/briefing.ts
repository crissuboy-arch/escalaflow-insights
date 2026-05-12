import { z } from "zod";

export const StandaloneBriefingSchema = z.object({
  productName: z.string().min(1, "Informe o nome do produto"),
  productType: z.string().min(1, "Informe o tipo do produto"),
  description: z.string().default(""),
  niche: z.string().default(""),
  audience: z.string().default(""),
  promise: z.string().default(""),
  price: z.string().optional().default(""),
  platform: z.string().optional().default(""),
  link: z.string().optional().default(""),
  tone: z.string().optional().default(""),
});

export type StandaloneBriefing = z.infer<typeof StandaloneBriefingSchema>;

const STORAGE_PREFIX = "escalaflow:standalone:";

export function loadStandaloneBriefing(module: string): StandaloneBriefing | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + module);
    if (!raw) return null;
    return StandaloneBriefingSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveStandaloneBriefing(module: string, briefing: StandaloneBriefing) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + module, JSON.stringify(briefing));
  } catch {
    /* ignore quota errors */
  }
}

export function clearStandaloneBriefing(module: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_PREFIX + module);
}

export function emptyBriefing(): StandaloneBriefing {
  return {
    productName: "",
    productType: "",
    description: "",
    niche: "",
    audience: "",
    promise: "",
    price: "",
    platform: "",
    link: "",
    tone: "",
  };
}