import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiDiagnosticarOferta,
  aiGerarCampanha,
  extrairConteudoPagina,
  detectarIdioma,
  type DiagnosticoOferta,
} from "./launchAnalyzer.server";

const DIAGNOSTICO_TYPE = "launch_analyzer_diagnostico";

// ---------- Analisar oferta ----------

export const analyzeOfferFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Extrai conteúdo da URL
    const conteudoPagina = await extrairConteudoPagina(data.url);

    // 2. Roda o diagnóstico com IA
    const diagnostico = await aiDiagnosticarOferta(conteudoPagina);
    const language = detectarIdioma(conteudoPagina);

    // 3. Cria o projeto
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: diagnostico.produto || data.url,
        mode: "launch_analyzer",
        briefing: { url: data.url, conteudoPagina } as never,
        language,
        status: "done",
      } as never)
      .select("id")
      .single();
    if (projErr) throw new Error(projErr.message);
    const projectId = project.id as string;

    // 4. Insere o diagnóstico em analyses
    const { error: anErr } = await supabase.from("analyses").insert({
      project_id: projectId,
      user_id: userId,
      type: DIAGNOSTICO_TYPE,
      content: diagnostico as never,
      status: "done",
      title: diagnostico.produto || data.url,
    } as never);
    if (anErr) throw new Error(anErr.message);

    // 5. Insere uma linha por dimensão em project_scores
    const s = diagnostico.scores;
    const dims: { dimension: string; value: number }[] = [
      { dimension: "clareza", value: s.clareza },
      { dimension: "atratividade", value: s.atratividade },
      { dimension: "potencial_escala", value: s.potencialEscala },
      { dimension: "competitividade", value: s.competitividade },
      { dimension: "facilidade_venda", value: s.facilidadeVenda },
      { dimension: "pontuacao_geral", value: s.pontuacaoGeral },
    ];
    const scoreRows = dims.map((d) => ({
      project_id: projectId,
      user_id: userId,
      dimension: d.dimension,
      value: Math.round(Number.isFinite(d.value) ? d.value : 0),
      weaknesses: d.dimension === "pontuacao_geral" ? diagnostico.diagnostico.top5Problemas : [],
      next_action: diagnostico.diagnostico.motivo,
    }));
    const { error: scErr } = await supabase.from("project_scores").insert(scoreRows as never);
    if (scErr) throw new Error(scErr.message);

    // 6. Retorna
    return { projectId, diagnostico };
  });

// ---------- Gerar campanha ----------

export const generateCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; forceGenerate?: boolean }) =>
    z.object({ projectId: z.string().uuid(), forceGenerate: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Carrega o diagnóstico mais recente
    const { data: rows, error: loadErr } = await supabase
      .from("analyses")
      .select("content")
      .eq("project_id", data.projectId)
      .eq("type", DIAGNOSTICO_TYPE)
      .order("created_at", { ascending: false })
      .limit(1);
    if (loadErr) throw new Error(loadErr.message);
    const diagnostico = rows?.[0]?.content as DiagnosticoOferta | undefined;
    if (!diagnostico) throw new Error("Diagnóstico não encontrado. Rode a análise primeiro.");

    // Trava de score no servidor: se a oferta não pode anunciar, exige confirmação
    // explícita (forceGenerate) — impede contornar a trava via chamada direta.
    if (diagnostico.diagnostico.podeAnunciar === false && !data.forceGenerate) {
      throw new Error(
        "Esta oferta não atingiu o score mínimo para gerar campanha automaticamente. Confirme que deseja prosseguir mesmo assim.",
      );
    }

    // 2. Roda a geração de campanha com IA
    const { campanha, criativos, orcamento } = await aiGerarCampanha(diagnostico);

    // 3. Insere em project_campaigns
    const adCopies = criativos.textosPrincipais.map((texto, i) => ({
      texto,
      descricao: criativos.descricoes[i] ?? criativos.descricoes[0] ?? "",
    }));
    const { data: campaign, error: campErr } = await supabase
      .from("project_campaigns")
      .insert({
        project_id: data.projectId,
        user_id: userId,
        platform: "meta_ads",
        name: campanha.nomeCampanha,
        audiences: [
          {
            publico: campanha.publicoRecomendado,
            idade: campanha.idadeSugerida,
            localizacao: campanha.localizacaoSugerida,
            interesses: campanha.interessesMetaAds,
          },
        ] as never,
        angles: criativos.angulosCriativos as never,
        headlines: criativos.headlines as never,
        ad_copies: adCopies as never,
        creatives: [...criativos.sugestoesImagem, ...criativos.sugestoesVideo] as never,
        status: "draft",
      } as never)
      .select("id")
      .single();
    if (campErr) throw new Error(campErr.message);

    // 4. Retorna
    return {
      campanhaId: campaign.id as string,
      campanha,
      criativos,
      orcamento,
    };
  });

// ---------- Carregar análise ----------

export const loadLaunchAnalysisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, title, briefing, language, created_at")
      .eq("id", data.projectId)
      .single();
    if (projErr) throw new Error(projErr.message);

    const { data: anRows, error: anErr } = await supabase
      .from("analyses")
      .select("content")
      .eq("project_id", data.projectId)
      .eq("type", DIAGNOSTICO_TYPE)
      .order("created_at", { ascending: false })
      .limit(1);
    if (anErr) throw new Error(anErr.message);
    const diagnostico = (anRows?.[0]?.content as DiagnosticoOferta | undefined) ?? null;

    const { data: campRows } = await supabase
      .from("project_campaigns")
      .select("id, name, audiences, angles, headlines, ad_copies, creatives")
      .eq("project_id", data.projectId)
      .eq("platform", "meta_ads")
      .order("created_at", { ascending: false })
      .limit(1);

    return { project, diagnostico, campaign: campRows?.[0] ?? null };
  });

// ---------- Listar análises ----------

export const listLaunchAnalysesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, title, status, language, created_at, updated_at")
      .eq("mode", "launch_analyzer")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const list = (projects ?? []) as Array<{
      id: string;
      title: string;
      status: string;
      language: string | null;
      created_at: string;
      updated_at: string;
    }>;
    if (list.length === 0) return [];

    // Junta a última pontuacao_geral de cada projeto
    const ids = list.map((p) => p.id);
    const { data: scores } = await supabase
      .from("project_scores")
      .select("project_id, value, created_at")
      .in("project_id", ids)
      .eq("dimension", "pontuacao_geral")
      .order("created_at", { ascending: false });

    const scoreByProject: Record<string, number> = {};
    ((scores ?? []) as Array<{ project_id: string; value: number }>).forEach((sc) => {
      if (!(sc.project_id in scoreByProject)) scoreByProject[sc.project_id] = sc.value;
    });

    return list.map((p) => ({ ...p, score: scoreByProject[p.id] ?? null }));
  });
