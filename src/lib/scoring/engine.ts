import type { TikTokResult } from "../miners/tiktok";
import type { InstagramResult } from "../miners/instagram";
import type { AdResult } from "../miners/meta";

const STRONG_CTAS = new Set([
  "shop_now", "sign_up", "learn_more", "subscribe", "get_offer",
  "buy_now", "comprar", "assinar", "saiba mais", "compre agora",
  "download", "inscreva-se", "cadastre-se",
]);

const EMOTIONAL_WORDS = new Set([
  "incrível", "transformador", "revolucionário", "gratuito", "exclusivo",
  "limitado", "urgente", "última chance", "amei", "chocado", "impressionante",
  "incredible", "transformative", "revolutionary", "free", "exclusive",
  "limited", "urgent", "last chance", "amazing", "shocked", "stunning",
]);

const COPY_PATTERNS = {
  curiosityGap: /(você sabe|você já|já pensou|descubra como|o segredo|não vai acreditar|you know|ever wondered|discover how|the secret)/i,
  socialProof: /(milhares|mais de \d+|join \d+|recommended by|used by|depoimento|testemunho)/i,
  urgency: /(últimas vagas|edição limitada|enquanto durar|tempo limitado|acabei de|only \d+|limited|expires|deadline)/i,
  authority: /(especialista|dr\.|professor|expert|médico|cientista|estudo comprova|study shows|research)/i,
  beforeAfter: /(antes x depois|antes e depois|before and after|resultado em \d+|em apenas \d+|in just \d+|transformação)/i,
  directResponse: /(clique agora|compre agora|garanta o seu|get it now|buy now|order now|shop now)/i,
  painAgitation: /(cansado de|frustrado com|chega de|tired of|frustrated with|sick of|fed up)/i,
  resultPromise: /(resultado|resultados|garantido|garantia|guaranteed|money back|satisfação|satisfaction)/i,
};

export function calculateViralScore(data: TikTokResult | InstagramResult | Partial<AdResult>) {
  let score = 0;
  if ("views" in data && typeof data.views === "number") {
    score += Math.min(40, Math.round(Math.log10(Math.max(data.views, 1)) * 8));
  }
  if ("likes" in data && typeof data.likes === "number") {
    score += Math.min(25, Math.round(Math.log10(Math.max(data.likes, 1)) * 5));
  }
  if ("shares" in data && typeof data.shares === "number") {
    score += Math.min(20, Math.round(Math.log10(Math.max(data.shares, 1)) * 5));
  }
  if (data.engagement && typeof data.engagement === "object") {
    const eng = data.engagement as { likes?: number; shares?: number; comments?: number };
    if (eng.likes) score += Math.min(25, Math.round(Math.log10(eng.likes) * 5));
    if (eng.shares) score += Math.min(20, Math.round(Math.log10(eng.shares) * 5));
    if (eng.comments) score += Math.min(15, Math.round(Math.log10(eng.comments) * 4));
  }
  if ("isViral" in data && data.isViral) score += 15;
  if ("viralScore" in data && typeof data.viralScore === "number") {
    score = Math.max(score, data.viralScore);
  }
  return Math.min(100, Math.max(0, score));
}

export function calculateScaleScore(data: { score?: number; platforms?: string[]; startDate?: string; creativeType?: string }) {
  let score = 50;
  if (typeof data.score === "number") score += Math.round(data.score * 0.3);
  if (data.platforms && data.platforms.length >= 3) score += 15;
  if (data.platforms && data.platforms.length >= 2) score += 8;
  if (data.creativeType === "video") score += 10;
  if (data.startDate) {
    const days = (Date.now() - new Date(data.startDate).getTime()) / 86_400_000;
    if (days >= 60) score += 8;
    if (days >= 21) score += 6;
    if (days >= 7) score += 4;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function calculateEmotionalScore(copy: string) {
  if (!copy) return 0;
  const lower = copy.toLowerCase();
  let score = 0;
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (EMOTIONAL_WORDS.has(word)) score += 6;
  }
  const patterns = Object.values(COPY_PATTERNS);
  for (const pattern of patterns) {
    if (pattern.test(lower)) score += 8;
  }
  if (copy.length > 200) score += 5;
  if (copy.length > 500) score += 5;
  if (copy.includes("!") || copy.includes("?")) score += 3;
  const sentences = copy.split(/[.!?]+/).filter(Boolean);
  if (sentences.length >= 3 && sentences.length <= 8) score += 4;
  return Math.min(100, Math.max(0, score));
}

export function calculateConversionScore(cta: string, landingPage?: string) {
  let score = 30;
  if (cta && STRONG_CTAS.has(cta.toLowerCase().trim())) score += 25;
  if (cta && cta.length > 5) score += 10;
  if (landingPage) {
    if (landingPage.includes("checkout") || landingPage.includes("comprar") || landingPage.includes("buy")) score += 15;
    if (landingPage.includes("utm_") || landingPage.includes("?")) score += 5;
    if (landingPage.startsWith("https")) score += 5;
  }
  return Math.min(100, Math.max(0, score));
}

export function calculateCompositeScore(data: {
  headline?: string;
  copy?: string;
  cta?: string;
  landingPage?: string;
  creativeType?: string;
  platforms?: string[];
  likes?: number;
  shares?: number;
  comments?: number;
  views?: number;
}) {
  const viral = calculateViralScore(data);
  const emotional = calculateEmotionalScore(data.copy ?? "");
  const conversion = calculateConversionScore(data.cta ?? "", data.landingPage);
  const scale = calculateScaleScore(data);
  return Math.min(100, Math.round((viral * 0.25 + emotional * 0.3 + conversion * 0.25 + scale * 0.2)));
}
