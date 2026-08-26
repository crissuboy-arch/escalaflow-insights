import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DinheiroRapidoInputSchema, runPipeline } from "./dinheiroRapido.server";

// ---------- Analisar Produto (Modo Dinheiro Rápido) ----------

export const analisarProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DinheiroRapidoInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Roda o pipeline completo (nunca lança: erros por etapa ficam em result.errors).
    const result = await runPipeline(data);

    const titulo = result.decisao.produtoRecomendado || data.produto || data.url || "Análise rápida";

    // Persiste como projeto (mode 'quick_money') — aparece em Projetos.
    let projectId: string | null = null;
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title: titulo,
          mode: "quick_money",
          niche: data.tipo,
          country: data.paisAlvo,
          briefing: {
            url: data.url,
            tipo: data.tipo,
            paisAlvo: data.paisAlvo,
            orcamento: data.orcamento,
            canal: data.canal,
            modoEconomico: data.modoEconomico,
          } as never,
          meta: {
            dinheiroRapido: {
              decisao: result.decisao,
              score: result.diagnostico?.scores?.pontuacaoGeral ?? null,
              errors: result.errors,
              geradoEm: result.geradoEm,
              result,
            },
          } as never,
          status: "done",
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      projectId = project.id as string;
    } catch (e) {
      // Persistência é best-effort: a análise não pode ser perdida por falha no banco.
      result.errors.persistencia = e instanceof Error ? e.message : String(e);
    }

    return { projectId, result };
  });
