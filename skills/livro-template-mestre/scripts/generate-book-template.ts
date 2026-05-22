#!/usr/bin/env tsx
/**
 * Standalone generator — runs outside the EscalaFlow app.
 * Usage: npx tsx generate-book-template.ts
 *
 * Requires one of these in your .env:
 *   ANTHROPIC_API_KEY
 *   OPENAI_API_KEY
 *   LOVABLE_API_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";

// ── Load .env from project root ───────────────────────────────────────────────

const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && !key.startsWith("#")) {
      const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
      if (val) process.env[key.trim()] = val;
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LivroTipo =
  | "ebook-educativo"
  | "guia-passo-a-passo"
  | "workbook"
  | "planner"
  | "livro-receitas"
  | "livro-infantil"
  | "livro-devocional"
  | "livro-emagrecimento"
  | "livro-plr"
  | "amazon-kdp"
  | "romance-curto"
  | "livro-prompts-ia";

interface LivroTemplateInput {
  tema: string;
  nicho: string;
  publicoAlvo: string;
  nivelPublico: "iniciante" | "intermediario" | "avancado";
  idioma: string;
  objetivo: string;
  estiloDesejado: string;
  quantidadeCapitulos: number;
  tipoProduto: LivroTipo;
}

// ── AI client ─────────────────────────────────────────────────────────────────

function resolveProvider() {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      key: process.env.ANTHROPIC_API_KEY,
      model: "claude-haiku-4-5-20251001",
      isAnthropic: true,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
      isAnthropic: false,
    };
  }
  if (process.env.LOVABLE_API_KEY) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: process.env.LOVABLE_API_KEY,
      model: "google/gemini-2.5-flash",
      isAnthropic: false,
    };
  }
  throw new Error(
    "Nenhuma chave de IA encontrada no .env. Configure ANTHROPIC_API_KEY, OPENAI_API_KEY ou LOVABLE_API_KEY.",
  );
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = resolveProvider();

  let body: Record<string, unknown>;
  let headers: Record<string, string>;

  if (provider.isAnthropic) {
    body = {
      model: provider.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };
    headers = {
      "x-api-key": provider.key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    };
  } else {
    body = {
      model: provider.model,
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    headers = {
      Authorization: `Bearer ${provider.key}`,
      "Content-Type": "application/json",
    };
  }

  const res = await fetch(provider.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json() as Record<string, unknown>;

  if (provider.isAnthropic) {
    const content = (json.content as Array<{ text?: string }> | undefined);
    return content?.[0]?.text ?? "";
  }

  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? "";
}

function safeJSON(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* fall through */ }
  }
  return null;
}

// ── Generator ─────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<LivroTipo, string> = {
  "ebook-educativo": "Ebook Educativo",
  "guia-passo-a-passo": "Guia Passo a Passo",
  "workbook": "Workbook com Exercícios",
  "planner": "Planner",
  "livro-receitas": "Livro de Receitas",
  "livro-infantil": "Livro Infantil",
  "livro-devocional": "Livro Devocional/Cristão",
  "livro-emagrecimento": "Livro de Emagrecimento",
  "livro-plr": "Livro PLR",
  "amazon-kdp": "Livro Amazon KDP",
  "romance-curto": "Livro de Romance Curto",
  "livro-prompts-ia": "Livro de Prompts IA",
};

async function generateTemplate(input: LivroTemplateInput): Promise<unknown> {
  const tipoLabel = TIPO_LABELS[input.tipoProduto];
  const caps = input.quantidadeCapitulos;

  const systemPrompt = `Você é um editor especializado em livros digitais premium para o mercado brasileiro.
Cria templates profissionais, vendáveis e completamente personalizáveis.
Todo conteúdo deve ser específico ao tema fornecido — NUNCA genérico.
Responda APENAS com JSON válido. Sem markdown. Sem comentários. Sem blocos de código.`;

  const userPrompt = `Crie um template completo de "${tipoLabel}".
TEMA: ${input.tema}
NICHO: ${input.nicho}
PÚBLICO: ${input.publicoAlvo}
NÍVEL: ${input.nivelPublico}
IDIOMA: ${input.idioma}
OBJETIVO: ${input.objetivo}
ESTILO: ${input.estiloDesejado}
CAPÍTULOS: ${caps}

JSON com: tipo, titulo, subtitulo, promessa_central, publico_alvo, transformacao_desejada, tom_de_voz,
indice (array de ${caps}), introducao (4 parágrafos),
capitulos (array de ${caps} objetos com: numero, titulo, subtitulo, pontos_principais, caixa_destaque, exercicios_checklist, resumo, texto_base),
chamada_para_acao_final, bonus_sugeridos, ideia_de_upsell,
paleta_de_cores (array de 4 objetos com nome/hex/uso),
estilo_visual, prompt_capa, prompt_diagramacao_canva, sugestao_capa,
descricao_pagina_de_vendas, checklist_personalizacao, versao_canva_google_docs`;

  console.log("⏳ Chamando IA...");
  const raw = await callAI(systemPrompt, userPrompt);
  const result = safeJSON(raw);
  if (!result) throw new Error("Resposta da IA não é JSON válido");
  return result;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n🚀 Livro Template Mestre — Gerador Standalone\n");
  console.log("Tipos disponíveis:");
  Object.entries(TIPO_LABELS).forEach(([k, v]) => console.log(`  ${k.padEnd(22)} → ${v}`));

  const tipo = (await rl.question("\nTipo do livro: ")).trim() as LivroTipo;
  const tema = await rl.question("Tema: ");
  const nicho = await rl.question("Nicho: ");
  const publicoAlvo = await rl.question("Público-alvo: ");
  const nivel = (await rl.question("Nível [iniciante/intermediario/avancado]: ")) as LivroTemplateInput["nivelPublico"] || "iniciante";
  const idioma = (await rl.question("Idioma [Português]: ")) || "Português";
  const objetivo = (await rl.question("Objetivo [vender como produto digital]: ")) || "vender como produto digital";
  const estilo = (await rl.question("Estilo desejado [profissional e prático]: ")) || "profissional e prático";
  const capsStr = await rl.question("Quantidade de capítulos [7]: ");
  const caps = parseInt(capsStr) || 7;

  rl.close();

  const input: LivroTemplateInput = {
    tema,
    nicho,
    publicoAlvo,
    nivelPublico: nivel,
    idioma,
    objetivo,
    estiloDesejado: estilo,
    quantidadeCapitulos: caps,
    tipoProduto: tipo,
  };

  try {
    const result = await generateTemplate(input);

    const outDir = path.resolve(__dirname, "../../../.generated");
    fs.mkdirSync(outDir, { recursive: true });
    const filename = `livro-template-${tipo}-${Date.now()}.json`;
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");

    console.log(`\n✅ Template gerado com sucesso!`);
    console.log(`📄 Arquivo: ${outPath}`);

    // Print summary
    const r = result as Record<string, unknown>;
    console.log(`\n📚 ${r.titulo}`);
    console.log(`   ${r.subtitulo}`);
    console.log(`\n💡 Promessa: ${r.promessa_central}`);
    console.log(`🎯 Transformação: ${r.transformacao_desejada}`);

  } catch (err) {
    console.error("\n❌ Erro:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
