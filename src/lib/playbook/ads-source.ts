import { supabase } from "@/integrations/supabase/client";
import { fetchSavedAds, fetchFavoriteAds, fetchScaledAds } from "@/lib/queries";

export interface PlaybookAd {
  id: string;
  key: string;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  platform: string;
  niche: string;
  country: string;
  score: number;
  imageUrl: string | null;
  videoUrl: string | null;
  adUrl: string | null;
  source: "mined" | "collected" | "saved" | "favorite" | "scaled";
}

function dedupKey(advertiser: string, headline: string) {
  return `${(advertiser || "").trim().toLowerCase()}__${(headline || "").trim().toLowerCase().slice(0, 80)}`;
}

export async function fetchPlaybookAds(): Promise<PlaybookAd[]> {
  const out: PlaybookAd[] = [];

  // 1. mined_offers (fonte usada pelo Ebook/Central de Mineração)
  try {
    const { data } = await supabase
      .from("mined_offers")
      .select("id, advertiser_name, image_url, summary, platform, country, niche, keyword, scale_score")
      .order("scale_score", { ascending: false })
      .limit(60);
    for (const r of data ?? []) {
      out.push({
        id: r.id,
        key: `mined:${r.id}`,
        advertiser: r.advertiser_name,
        headline: r.summary ?? r.advertiser_name,
        copy: r.summary,
        cta: null,
        platform: r.platform,
        niche: r.niche,
        country: r.country,
        score: r.scale_score ?? 0,
        imageUrl: r.image_url,
        videoUrl: null,
        adUrl: null,
        source: "mined",
      });
    }
  } catch (e) {
    console.warn("[playbook] mined_offers falhou", e);
  }

  // 2. collected_ads (anúncios reais coletados)
  try {
    const { data } = await supabase
      .from("collected_ads")
      .select("id, advertiser, headline, copy, cta, image_url, video_url, ad_url, platform, country, niche, score")
      .order("score", { ascending: false })
      .limit(60);
    for (const r of data ?? []) {
      out.push({
        id: r.id,
        key: `collected:${r.id}`,
        advertiser: r.advertiser,
        headline: r.headline || r.advertiser,
        copy: r.copy,
        cta: r.cta,
        platform: r.platform,
        niche: r.niche,
        country: r.country,
        score: r.score ?? 0,
        imageUrl: r.image_url,
        videoUrl: r.video_url,
        adUrl: r.ad_url,
        source: "collected",
      });
    }
  } catch (e) {
    console.warn("[playbook] collected_ads falhou", e);
  }

  // 3. localStorage (salvos / favoritos / escalados)
  try {
    const [saved, fav, scaled] = await Promise.all([
      fetchSavedAds(),
      fetchFavoriteAds(),
      fetchScaledAds(),
    ]);
    const tag = (list: typeof saved, source: PlaybookAd["source"]) =>
      list.forEach((ad) =>
        out.push({
          id: ad.key,
          key: `${source}:${ad.key}`,
          advertiser: ad.advertiser,
          headline: ad.headline,
          copy: ad.copy,
          cta: ad.cta,
          platform: ad.platform,
          niche: ad.niche,
          country: ad.country,
          score: ad.score,
          imageUrl: ad.image_url,
          videoUrl: ad.video_url,
          adUrl: ad.ad_url,
          source,
        }),
      );
    tag(scaled, "scaled");
    tag(saved, "saved");
    tag(fav, "favorite");
  } catch (e) {
    console.warn("[playbook] local ads falhou", e);
  }

  // dedup
  const seen = new Map<string, PlaybookAd>();
  for (const ad of out) {
    const k = dedupKey(ad.advertiser, ad.headline);
    const prev = seen.get(k);
    if (!prev || (ad.score ?? 0) > (prev.score ?? 0)) seen.set(k, ad);
  }
  return Array.from(seen.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Briefing local determinístico — usado como fallback quando a IA falha. */
export function buildLocalBriefing(ad: PlaybookAd) {
  const titulo = `Playbook ${ad.niche || "Premium"} — ${ad.advertiser}`.slice(0, 90);
  return {
    title: titulo,
    niche: ad.niche || "Geral",
    promise: ad.headline || `Resultado real em ${ad.niche || "seu nicho"}`,
    avatar: `Pessoas interessadas em ${ad.niche || "soluções práticas"} no ${ad.country || "Brasil"}`,
    uniqueMechanism: ad.copy?.slice(0, 240) || `Método ${ad.advertiser} aplicado em passos.`,
    pains: ["Falta de clareza no caminho", "Tempo perdido testando", "Resultados inconsistentes"],
    desires: ["Resultado rápido", "Processo simples", "Confiança no método"],
  };
}

export function buildLocalOutline(briefing: { niche: string; promise: string }, sceneCount: number) {
  const base = [
    { title: "O cenário hoje", summary: "Diagnóstico claro do problema do avatar." },
    { title: "Por que os métodos comuns falham", summary: "Quebra de objeções e crenças limitantes." },
    { title: "A virada de chave", summary: `O insight central: ${briefing.promise}.` },
    { title: "O mecanismo único", summary: "Como o método funciona por dentro." },
    { title: "Passo a passo prático", summary: "A execução em etapas simples." },
    { title: "Erros a evitar", summary: "Os tropeços mais comuns." },
    { title: "Casos de uso reais", summary: "Aplicações em diferentes contextos." },
    { title: "Acelerando os resultados", summary: "Atalhos e alavancas pouco usadas." },
    { title: "Mantendo a consistência", summary: "Como sustentar o ritmo no longo prazo." },
    { title: "Próximos passos", summary: "O que fazer hoje para começar." },
  ];
  return base.slice(0, Math.max(3, Math.min(sceneCount, base.length))).map((s) => ({
    title: s.title,
    summary: s.summary,
    exercise: `Reflita: como "${s.title.toLowerCase()}" se aplica ao seu caso?`,
    practicalAction: `Liste 3 ações concretas relacionadas a "${s.title.toLowerCase()}".`,
  }));
}

export function buildLocalSceneText(scene: { title: string; summary: string }, briefing: { niche: string }) {
  return {
    text: `${scene.summary}\n\nNesta etapa do playbook de ${briefing.niche}, vamos aprofundar o tema "${scene.title}". Use as anotações ao lado e a ação prática para transformar leitura em movimento. Edite este texto para personalizar com a sua voz e contexto.`,
    balloons: [
      `Foque no que move o ponteiro em ${briefing.niche}.`,
      "Repita o processo até virar hábito.",
    ],
  };
}