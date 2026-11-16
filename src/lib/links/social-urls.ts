// Normalização/validação de links de páginas, Reels e anúncios.
//
// Regra: um cartão só mostra um link quando ele aponta para o objeto REAL
// (página, Reel, anúncio). Nunca se monta um perfil a partir de um nome
// ("facebook.com/<nome do anunciante>") — se não houver um URL/ID confiável,
// as funções devolvem null e a UI não renderiza link.
//
// Puro (sem rede, sem Supabase): usado no cliente e no servidor.

const FB_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "mbasic.facebook.com",
  "touch.facebook.com",
  "business.facebook.com",
]);
const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);

/** Primeiros segmentos de caminho que nunca são uma página/perfil. */
const RESERVED_FB_PATHS = new Set([
  "ads",
  "login",
  "login.php",
  "logout.php",
  "recover",
  "search",
  "sharer",
  "sharer.php",
  "share",
  "dialog",
  "plugins",
  "home.php",
  "watch",
  "reel",
  "reels",
  "story.php",
  "permalink.php",
  "photo.php",
  "photo",
  "photos",
  "video.php",
  "events",
  "marketplace",
  "gaming",
  "help",
  "policies",
  "privacy",
  "settings",
  "notifications",
  "messages",
  "friends",
  "hashtag",
  "l.php",
  "business",
  "pages",
]);

function parseUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u;
  } catch {
    return null;
  }
}

function segments(u: URL): string[] {
  return u.pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

const NUMERIC_ID = /^\d{5,25}$/;
const SLUG = /^[A-Za-z0-9.\-_]{2,80}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,64}$/;
const FBWATCH_CODE = /^[A-Za-z0-9_-]{4,32}$/;

// ── Anúncios (Biblioteca de Anúncios da Meta) ────────────────────────────

/** ID da Biblioteca de Anúncios só se for numérico (o "id" genérico de um
 *  dataset pode ser outra coisa — um hash, um UUID — e geraria um link errado). */
export function normalizeAdLibraryId(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) raw = String(Math.trunc(raw));
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return NUMERIC_ID.test(v) ? v : null;
}

export function buildAdLibraryUrl(adLibraryId: unknown): string | null {
  const id = normalizeAdLibraryId(adLibraryId);
  return id ? `https://www.facebook.com/ads/library/?id=${id}` : null;
}

/** Extrai o ID de um link da Biblioteca de Anúncios (…/ads/library/?id=123). */
export function adLibraryIdFromUrl(raw: unknown): string | null {
  const u = parseUrl(raw);
  if (!u || !FB_HOSTS.has(u.hostname.toLowerCase())) return null;
  const segs = segments(u);
  if (segs[0] !== "ads" || segs[1] !== "library") return null;
  return normalizeAdLibraryId(u.searchParams.get("id"));
}

/** É uma página de PESQUISA da Biblioteca (sem id de anúncio) — não é um anúncio. */
function isAdLibrarySearchUrl(u: URL): boolean {
  const segs = segments(u);
  return (
    FB_HOSTS.has(u.hostname.toLowerCase()) &&
    segs[0] === "ads" &&
    segs[1] === "library" &&
    !normalizeAdLibraryId(u.searchParams.get("id"))
  );
}

/**
 * Link do anúncio para os cartões: sempre o link canónico da Biblioteca de
 * Anúncios quando houver ID; senão o ad_url só se for um link http(s) real
 * que NÃO seja uma página de pesquisa da Biblioteca. null = não mostrar link.
 */
export function resolveAdLink(ad: {
  ad_library_id?: string | null;
  ad_url?: string | null;
}): string | null {
  const fromId = buildAdLibraryUrl(ad.ad_library_id);
  if (fromId) return fromId;
  const fromUrlId = adLibraryIdFromUrl(ad.ad_url);
  if (fromUrlId) return buildAdLibraryUrl(fromUrlId);
  const u = parseUrl(ad.ad_url);
  if (!u || isAdLibrarySearchUrl(u)) return null;
  return u.toString();
}

// ── Páginas do Facebook ──────────────────────────────────────────────────

/**
 * URL canónico de uma página/perfil do Facebook, ou null se o link não for
 * uma página (Reel, post, pesquisa, login, anúncio…). Formatos aceites:
 *   facebook.com/<slug>            → https://www.facebook.com/<slug>
 *   facebook.com/profile.php?id=N  → https://www.facebook.com/profile.php?id=N
 *   facebook.com/people/<nome>/<N> → https://www.facebook.com/profile.php?id=N
 *   facebook.com/pg/<slug>/…       → https://www.facebook.com/<slug>
 */
export function normalizeFacebookPageUrl(raw: unknown): string | null {
  const u = parseUrl(raw);
  if (!u || !FB_HOSTS.has(u.hostname.toLowerCase())) return null;
  const segs = segments(u);
  if (!segs.length) return null;
  const first = segs[0];
  const firstLower = first.toLowerCase();

  if (firstLower === "profile.php") {
    const id = normalizeAdLibraryId(u.searchParams.get("id"));
    return id ? `https://www.facebook.com/profile.php?id=${id}` : null;
  }
  if (firstLower === "people") {
    const id = segs.find((s) => NUMERIC_ID.test(s));
    return id ? `https://www.facebook.com/profile.php?id=${id}` : null;
  }
  if (firstLower === "pg" && segs[1] && SLUG.test(segs[1])) {
    return `https://www.facebook.com/${segs[1]}`;
  }
  if (RESERVED_FB_PATHS.has(firstLower) || !SLUG.test(first)) return null;
  // /<slug>/posts/…, /<slug>/videos/<id>, /<slug>/reels/<id> não são a página
  // em si; só aceitamos a página "nua" ou as abas comuns dela.
  const PAGE_TABS = new Set([
    "about",
    "reels",
    "videos",
    "photos",
    "posts",
    "community",
    "mentions",
  ]);
  if (segs.length > 1) {
    const tab = segs[1].toLowerCase();
    if (!(segs.length === 2 && PAGE_TABS.has(tab))) return null;
  }
  return `https://www.facebook.com/${first}`;
}

// ── Reels / vídeos ───────────────────────────────────────────────────────

export type ReelLinkKind =
  | "facebook_reel"
  | "facebook_video"
  | "facebook_watch"
  | "fb_watch"
  | "facebook_share"
  | "instagram_reel";

export interface NormalizedReel {
  url: string;
  kind: ReelLinkKind;
  /** ID do vídeo/reel quando conhecido (numérico no Facebook, shortcode no Instagram). */
  id: string | null;
}

/**
 * URL canónico de um Reel/vídeo, ou null se o link não for de um vídeo
 * específico. Formatos aceites:
 *   facebook.com/reel/<id>                 → https://www.facebook.com/reel/<id>
 *   facebook.com/<page>/reels/<id>         → https://www.facebook.com/reel/<id>
 *   facebook.com/<page>/videos/[slug/]<id> → https://www.facebook.com/<page>/videos/<id>
 *   facebook.com/watch/?v=<id>             → https://www.facebook.com/watch/?v=<id>
 *   facebook.com/share/r|v/<code>          → https://www.facebook.com/share/r/<code>/
 *   fb.watch/<code>                        → https://fb.watch/<code>/
 *   instagram.com/reel(s)|p/<code>         → https://www.instagram.com/reel/<code>/
 */
export function normalizeReelUrl(raw: unknown): NormalizedReel | null {
  const u = parseUrl(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const segs = segments(u);

  if (host === "fb.watch") {
    const code = segs[0];
    return code && FBWATCH_CODE.test(code)
      ? { url: `https://fb.watch/${code}/`, kind: "fb_watch", id: null }
      : null;
  }

  if (IG_HOSTS.has(host)) {
    const kind = segs[0]?.toLowerCase();
    const code = segs[1];
    if (
      (kind === "reel" || kind === "reels" || kind === "p" || kind === "tv") &&
      code &&
      IG_CODE.test(code)
    ) {
      return { url: `https://www.instagram.com/reel/${code}/`, kind: "instagram_reel", id: code };
    }
    return null;
  }

  if (!FB_HOSTS.has(host)) return null;
  const s0 = segs[0]?.toLowerCase();

  if (s0 === "reel" && segs[1] && NUMERIC_ID.test(segs[1])) {
    return { url: `https://www.facebook.com/reel/${segs[1]}`, kind: "facebook_reel", id: segs[1] };
  }
  if (s0 === "watch") {
    const v = normalizeAdLibraryId(u.searchParams.get("v"));
    return v
      ? { url: `https://www.facebook.com/watch/?v=${v}`, kind: "facebook_watch", id: v }
      : null;
  }
  if (
    s0 === "share" &&
    (segs[1] === "r" || segs[1] === "v") &&
    segs[2] &&
    FBWATCH_CODE.test(segs[2])
  ) {
    return {
      url: `https://www.facebook.com/share/${segs[1]}/${segs[2]}/`,
      kind: "facebook_share",
      id: null,
    };
  }
  if (s0 === "video.php") {
    const v = normalizeAdLibraryId(u.searchParams.get("v"));
    return v
      ? { url: `https://www.facebook.com/watch/?v=${v}`, kind: "facebook_watch", id: v }
      : null;
  }
  // /<page>/reels/<id>
  if (segs.length >= 3 && segs[1].toLowerCase() === "reels" && NUMERIC_ID.test(segs[2])) {
    return { url: `https://www.facebook.com/reel/${segs[2]}`, kind: "facebook_reel", id: segs[2] };
  }
  // /<page>/videos/<id>  ou  /<page>/videos/<slug>/<id>
  if (segs.length >= 3 && segs[1].toLowerCase() === "videos" && !RESERVED_FB_PATHS.has(s0 ?? "")) {
    const id = segs.slice(2).find((s) => NUMERIC_ID.test(s));
    if (id && SLUG.test(segs[0])) {
      return {
        url: `https://www.facebook.com/${segs[0]}/videos/${id}`,
        kind: "facebook_video",
        id,
      };
    }
  }
  return null;
}

/** Link canónico de um Reel a partir só do ID numérico do vídeo (o Facebook
 *  resolve /reel/<id> para o vídeo certo). Nunca usa nomes. */
export function buildFacebookReelUrlFromId(id: unknown): string | null {
  const v = normalizeAdLibraryId(id);
  return v ? `https://www.facebook.com/reel/${v}` : null;
}

/** href seguro para um link guardado: devolve o URL só se for um Reel/vídeo
 *  ou página válidos; senão null (a UI não deve renderizar <a>). */
export function safeReelHref(raw: unknown): string | null {
  return normalizeReelUrl(raw)?.url ?? null;
}

export function safePageHref(raw: unknown): string | null {
  return normalizeFacebookPageUrl(raw);
}

/** Variantes de host/barra final de um URL do Facebook — para encontrar
 *  linhas antigas gravadas antes da canonicalização (ex.: sem "www."). */
export function facebookUrlVariants(canonical: string): string[] {
  const out = new Set<string>([canonical]);
  const u = parseUrl(canonical);
  if (!u) return [...out];
  const rest = `${u.pathname}${u.search}`;
  const restNoSlash = rest.replace(/\/+$/, "");
  for (const host of ["www.facebook.com", "facebook.com", "m.facebook.com", "web.facebook.com"]) {
    for (const r of [rest, restNoSlash, `${restNoSlash}/`]) {
      if (r) out.add(`https://${host}${r}`);
    }
  }
  return [...out];
}
