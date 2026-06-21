import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ArtigoAfiliadoInputSchema,
  executeArtigoTask,
  aiAnalisarProjetoSeo,
  ProjetoSeoInputSchema,
  type ArtigoAfiliadoInput,
} from "./afiliadosSeo.server";
// Reuso do extrator de conteúdo do Launch Analyzer (apenas importado — LA não é alterado).
import { extrairConteudoPagina } from "./launchAnalyzer.server";
import { publishPage, type WpCredentials } from "./wordpress.server";

const AGENT = "motor-afiliados-seo";

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------- Criar site ----------

export const createSiteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nicho: string; idioma: string }) =>
    z.object({ nicho: z.string().min(1), idioma: z.string().default("en") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: data.nicho,
        mode: "afiliados_seo",
        briefing: { nicho: data.nicho, idioma: data.idioma } as never,
        language: data.idioma,
        status: "active",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { projectId: project.id as string };
  });

// ---------- Criar projeto SEO V2.0 (1 entrada → site + calendário) ----------

export const createProjetoSeoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProjetoSeoInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const entrada = data.entrada.trim();

    // 1. Se a entrada for uma URL, extrai o conteúdo (best-effort: falha de scrape
    // não aborta a criação — a IA segue a partir do produto/nicho).
    let conteudoPagina: string | undefined;
    if (isUrl(entrada)) {
      try {
        conteudoPagina = await extrairConteudoPagina(entrada);
      } catch (e) {
        console.error("[motor-seo] scrape falhou, seguindo sem conteúdo da página:", e);
      }
    }

    // 2. Inteligência + estrutura do site + calendário editorial.
    const inteligencia = await aiAnalisarProjetoSeo(data, conteudoPagina);

    const nicho = inteligencia.categoria || inteligencia.nomeProduto || entrada;
    const nomeProduto = inteligencia.nomeProduto || entrada;
    const linkAfiliado = isUrl(entrada) ? entrada : undefined;

    // Credenciais WP do projeto (só usadas se as 3 vierem preenchidas).
    const wpCreds: WpCredentials | undefined =
      data.wpUrl && data.wpUser && data.wpAppPassword
        ? { url: data.wpUrl.trim(), user: data.wpUser.trim(), password: data.wpAppPassword.trim() }
        : undefined;

    // 3. Cria o projeto. O briefing carrega toda a inteligência (a página de
    // detalhe lê daqui) + os metadados de entrada, mantendo nicho/idioma para
    // compatibilidade com o fluxo existente. As credenciais WP vão em colunas
    // dedicadas (wp_*) — NUNCA no briefing, que é exposto ao cliente.
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: nomeProduto,
        mode: "afiliados_seo",
        briefing: {
          nicho,
          idioma: data.idioma,
          tipoProjeto: data.tipoProjeto,
          paisAlvo: data.paisAlvo,
          entrada,
          quantidadeArtigos: data.quantidadeArtigos,
          publicacaoAutomatica: data.publicacaoAutomatica,
          inteligencia,
        } as never,
        language: data.idioma,
        status: "active",
        ...(wpCreds
          ? { wp_url: wpCreds.url, wp_user: wpCreds.user, wp_app_password: wpCreds.password }
          : {}),
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const projectId = project.id as string;

    // 4. Cria uma task por item do calendário editorial. due_at em dias
    // sequenciais (Dia 1, Dia 2…) quando a publicação automática está ligada;
    // null quando manual (o cron só pega tasks com due_at <= agora).
    const now = Date.now();
    const DIA_MS = 24 * 60 * 60 * 1000;
    const itens = inteligencia.calendarioEditorial.slice(0, data.quantidadeArtigos);
    const rows = itens.map((item, i) => {
      const artigoInput: ArtigoAfiliadoInput = {
        nicho,
        idioma: data.idioma,
        produtoAfiliado: {
          nome: nomeProduto,
          ...(linkAfiliado ? { linkAfiliado } : {}),
          ...(inteligencia.avatar ? { descricao: inteligencia.avatar } : {}),
        },
        tipoArtigo: item.tipoArtigo,
        tomDeVoz: "direto, prático, confiável",
        tamanhoAlvo: 1800,
        tipoProjeto: data.tipoProjeto,
        paisAlvo: data.paisAlvo,
        tituloSugerido: item.titulo,
        publicarAutomaticamente: data.publicacaoAutomatica,
        ...(item.palavraChaveAlvo ? { palavraChaveAlvo: item.palavraChaveAlvo } : {}),
      };
      return {
        project_id: projectId,
        user_id: userId,
        title: item.titulo || nomeProduto,
        description: JSON.stringify(artigoInput),
        status: "todo",
        due_at: data.publicacaoAutomatica ? new Date(now + i * DIA_MS).toISOString() : null,
        order_index: i,
      };
    });
    if (rows.length) {
      const { error: tErr } = await supabase.from("project_tasks").insert(rows as never);
      if (tErr) throw new Error(tErr.message);
    }

    // 5. Publica as páginas institucionais no WordPress (Home, Sobre, Contato,
    // FAQ, Política, Termos — não inclui "Blog"). Best-effort: nunca aborta a
    // criação. Só tenta se houver WP configurado (projeto ou .env).
    const temWp =
      !!wpCreds ||
      !!(
        process.env.WORDPRESS_URL &&
        process.env.WORDPRESS_USER &&
        process.env.WORDPRESS_APP_PASSWORD
      );
    let paginasPublicadas: { pagina: string; url: string; erro?: string }[] = [];
    if (temWp) {
      const statusPagina: "draft" | "publish" = data.publicacaoAutomatica ? "publish" : "draft";
      const paginas = inteligencia.estruturaSite.filter(
        (p) => p.conteudoHtml && !/^\s*blog\s*$/i.test(p.pagina),
      );
      paginasPublicadas = [];
      for (let i = 0; i < paginas.length; i++) {
        const p = paginas[i];
        try {
          const res = await publishPage(
            {
              titulo: p.pagina,
              corpoHtml: p.conteudoHtml,
              slug: p.slug || slugify(p.pagina),
              status: statusPagina,
              menuOrder: i,
            },
            wpCreds,
          );
          paginasPublicadas.push({ pagina: p.pagina, url: res.url });
        } catch (e) {
          paginasPublicadas.push({
            pagina: p.pagina,
            url: "",
            erro: e instanceof Error ? e.message : String(e),
          });
        }
      }
      // Registra o resultado das páginas para rastreio (sem segredos no payload).
      if (paginasPublicadas.length) {
        await supabase
          .from("project_outputs")
          .insert({
            project_id: projectId,
            user_id: userId,
            agent: AGENT,
            kind: "estrutura_paginas",
            payload: { paginas: paginasPublicadas } as never,
            status: paginasPublicadas.some((p) => p.erro) ? "error" : "done",
          } as never)
          .then(
            () => {},
            () => {},
          );
      }
    }

    return {
      projectId,
      totalArtigos: rows.length,
      paginasPublicadas: paginasPublicadas.filter((p) => !p.erro).length,
    };
  });

// ---------- Enfileirar artigo ----------

export const queueArtigoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    ArtigoAfiliadoInputSchema.extend({
      projectId: z.string().uuid(),
      agendarPara: z.string().optional(), // ISO; default = agora
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { projectId, agendarPara, ...input } = data;

    // Próximo order_index da fila do projeto
    const { data: last } = await supabase
      .from("project_tasks")
      .select("order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: false })
      .limit(1);
    const nextOrder = ((last?.[0]?.order_index as number | undefined) ?? -1) + 1;

    const dueAt = agendarPara ? new Date(agendarPara).toISOString() : new Date().toISOString();

    const { data: task, error } = await supabase
      .from("project_tasks")
      .insert({
        project_id: projectId,
        user_id: userId,
        title: input.produtoAfiliado.nome,
        // project_tasks não tem coluna jsonb — o briefing completo do artigo
        // (incl. linkAfiliado) fica serializado em description, sem migration nova.
        description: JSON.stringify(input),
        status: "todo",
        due_at: dueAt,
        order_index: nextOrder,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { taskId: task.id as string };
  });

// ---------- Gerar + publicar artigo (manual) ----------

export const generateAndPublishArtigoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string }) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Reaproveita o núcleo compartilhado (o mesmo usado pelo cron com supabaseAdmin).
    return executeArtigoTask(context.supabase, data.taskId);
  });

// ---------- Listagens ----------

export const listSitesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, title, briefing, language, status, created_at, updated_at")
      .eq("mode", "afiliados_seo")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listArtigosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: project } = await supabase
      .from("projects")
      .select("id, title, briefing, language")
      .eq("id", data.projectId)
      .single();

    const { data: tasks, error: tErr } = await supabase
      .from("project_tasks")
      .select("id, title, description, status, due_at, order_index, created_at")
      .eq("project_id", data.projectId)
      .order("order_index", { ascending: true });
    if (tErr) throw new Error(tErr.message);

    const { data: outputs } = await supabase
      .from("project_outputs")
      .select("id, kind, payload, status, error, created_at")
      .eq("project_id", data.projectId)
      .eq("agent", AGENT)
      .order("created_at", { ascending: false });

    type OutRow = {
      kind?: string;
      payload?: { taskId?: string; wpPostUrl?: string; wpStatus?: string } | null;
      status?: string;
      error?: string | null;
    };
    const outList = (outputs ?? []) as OutRow[];

    // Separa explicitamente: sucesso (kind='artigo' && status='done') de erro
    // (kind='artigo_erro' || status='error'). A lista vem ordenada por created_at
    // desc, então o primeiro de cada bucket é o mais recente.
    const successByTask = new Map<string, OutRow>();
    const errorByTask = new Map<string, OutRow>();
    for (const o of outList) {
      const tid = o.payload?.taskId;
      if (!tid) continue;
      const isErro = o.kind === "artigo_erro" || o.status === "error";
      const isArtigo = o.kind === "artigo" && o.status === "done";
      if (isArtigo && !successByTask.has(tid)) successByTask.set(tid, o);
      else if (isErro && !errorByTask.has(tid)) errorByTask.set(tid, o);
    }

    const artigos = (
      (tasks ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        due_at: string | null;
        order_index: number;
        created_at: string;
      }>
    ).map((t) => {
      let parsed: { tipoArtigo?: string; produtoAfiliado?: { nome?: string } } = {};
      try {
        parsed = JSON.parse(t.description ?? "{}");
      } catch {
        /* description pode não ser JSON */
      }
      const success = successByTask.get(t.id) ?? null;
      const erro = errorByTask.get(t.id) ?? null;
      return {
        id: t.id,
        title: t.title,
        produtoNome: parsed.produtoAfiliado?.nome ?? t.title,
        tipoArtigo: parsed.tipoArtigo ?? "",
        status: t.status,
        dueAt: t.due_at,
        orderIndex: t.order_index,
        // wpPostUrl/wpStatus SÓ de uma linha de sucesso real — nunca de uma linha de erro.
        wpPostUrl: success?.payload?.wpPostUrl ?? null,
        wpStatus: success?.payload?.wpStatus ?? null,
        // erro só aparece quando a task está de fato falha (retry bem-sucedido não mostra erro antigo).
        error: t.status === "failed" ? (erro?.error ?? null) : null,
      };
    });

    return { project: project ?? null, artigos };
  });
