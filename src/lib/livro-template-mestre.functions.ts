import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  runLivroTemplateMestreSkill,
  LIVRO_TIPO_LABELS,
} from "@/skills/livro-template-mestre.skill";
import type { LivroTipo, LivroTemplateOutput } from "@/skills/livro-template-mestre.skill";

export type { LivroTipo, LivroTemplateOutput };
export { LIVRO_TIPO_LABELS };

// ── Schemas ───────────────────────────────────────────────────────────────────

const TIPOS = Object.keys(LIVRO_TIPO_LABELS) as [LivroTipo, ...LivroTipo[]];

const GenerateInput = z.object({
  tema: z.string().min(2).max(200),
  nicho: z.string().min(2).max(200),
  publicoAlvo: z.string().min(2).max(300),
  nivelPublico: z.enum(["iniciante", "intermediario", "avancado"]).default("iniciante"),
  idioma: z.string().default("Português"),
  objetivo: z.string().max(300).optional(),
  estiloDesejado: z.string().max(200).optional(),
  quantidadeCapitulos: z.number().int().min(3).max(15).default(7),
  tipoProduto: z.enum(TIPOS),
});

// ── Server functions ──────────────────────────────────────────────────────────

export const generateLivroTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof GenerateInput>) => GenerateInput.parse(d))
  .handler(async ({ data }) => {
    const result = await runLivroTemplateMestreSkill({
      tema: data.tema,
      nicho: data.nicho,
      publicoAlvo: data.publicoAlvo,
      nivelPublico: data.nivelPublico,
      idioma: data.idioma,
      objetivo: data.objetivo,
      estiloDesejado: data.estiloDesejado,
      quantidadeCapitulos: data.quantidadeCapitulos,
      tipoProduto: data.tipoProduto,
    });

    return result satisfies LivroTemplateOutput;
  });
