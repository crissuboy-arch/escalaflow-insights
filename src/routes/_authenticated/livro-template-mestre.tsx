import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Sparkles, Loader2, Copy, Download, ChevronDown, ChevronUp,
  Check, Palette, FileText, Megaphone, Wand2, ClipboardList, BookMarked,
  ArrowRight,
} from "lucide-react";
import { generateLivroTemplateFn, LIVRO_TIPO_LABELS } from "@/lib/livro-template-mestre.functions";
import type { LivroTipo, LivroTemplateOutput } from "@/lib/livro-template-mestre.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/livro-template-mestre")({
  component: LivroTemplateMestrePage,
});

const ACCENT = "#F97316";
const ACCENT_BG = "rgba(249,115,22,0.08)";
const ACCENT_BORDER = "rgba(249,115,22,0.25)";

const TIPOS = Object.entries(LIVRO_TIPO_LABELS) as [LivroTipo, string][];

const NIVEL_OPTS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

function Section({ title, icon: Icon, children, accent = false }: {
  title: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={accent
        ? { borderColor: ACCENT_BORDER, background: ACCENT_BG }
        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <h3 className="flex items-center gap-2 font-semibold text-sm" style={accent ? { color: ACCENT } : {}}>
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function TextBlock({ text, rows = 4 }: { text: string; rows?: number }) {
  return (
    <div className="relative">
      <textarea
        readOnly
        value={text}
        rows={rows}
        className="w-full rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm text-foreground/80 resize-none focus:outline-none"
      />
      <div className="absolute top-2 right-2">
        <CopyButton text={text} />
      </div>
    </div>
  );
}

function ChapterCard({ cap, index }: { cap: LivroTemplateOutput["capitulos"][0]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
          >
            {cap.numero}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{cap.titulo}</p>
            <p className="text-xs text-muted-foreground">{cap.subtitulo}</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Pontos Principais</p>
                  <ul className="space-y-1">
                    {cap.pontos_principais.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="mt-0.5 text-[#F97316]">•</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Exercícios / Checklist</p>
                  <ul className="space-y-1">
                    {cap.exercicios_checklist.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <Check className="h-3 w-3 mt-0.5 text-green-400 shrink-0" />{e}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div
                className="rounded-lg border px-4 py-3 text-xs italic"
                style={{ borderColor: ACCENT_BORDER, background: ACCENT_BG, color: ACCENT }}
              >
                <span className="font-semibold not-italic mr-1">💡 Destaque:</span>
                {cap.caixa_destaque}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Resumo do Capítulo</p>
                <p className="text-xs text-foreground/70 italic">{cap.resumo}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Texto Base Editável</p>
                  <CopyButton text={cap.texto_base} />
                </div>
                <textarea
                  readOnly
                  value={cap.texto_base}
                  rows={5}
                  className="w-full rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-foreground/80 resize-none focus:outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LivroTemplateMestrePage() {
  const navigate = useNavigate();
  const generateFn = useServerFn(generateLivroTemplateFn);

  const [form, setForm] = useState({
    tema: "",
    nicho: "",
    publicoAlvo: "",
    nivelPublico: "iniciante" as "iniciante" | "intermediario" | "avancado",
    idioma: "Português",
    objetivo: "",
    estiloDesejado: "",
    quantidadeCapitulos: 7,
    tipoProduto: "ebook-educativo" as LivroTipo,
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<LivroTemplateOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.tema.trim() || !form.nicho.trim() || !form.publicoAlvo.trim()) {
      toast.error("Preencha tema, nicho e público-alvo.");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const r = await generateFn({ data: form });
      setResult(r);
      toast.success("Template gerado com sucesso!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar template";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livro-template-${result.tipo}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fullText = result
    ? [
        `# ${result.titulo}`,
        `## ${result.subtitulo}`,
        `\nPromessa: ${result.promessa_central}`,
        `\n## Introdução\n${result.introducao}`,
        ...result.capitulos.map(
          (c) => `\n## Capítulo ${c.numero}: ${c.titulo}\n${c.texto_base}\n\n${c.resumo}`,
        ),
        `\n## Chamada para Ação\n${result.chamada_para_acao_final}`,
      ].join("\n")
    : "";

  const f = (field: keyof typeof form, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: ACCENT, textShadow: "0 0 24px rgba(249,115,22,0.5)" }}>
            Livro Template Mestre
          </h1>
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
            PREMIUM
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Gere templates profissionais de livros digitais prontos para venda — basta trocar o tema e publicar.
        </p>
      </div>

      {/* Form */}
      <div
        className="rounded-2xl border p-5 space-y-5"
        style={{ borderColor: ACCENT_BORDER, boxShadow: "0 0 40px -10px rgba(249,115,22,0.15)" }}
      >
        {/* Tipo */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de Livro</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {TIPOS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => f("tipoProduto", value)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  form.tipoProduto === value
                    ? "border-[#F97316] bg-[rgba(249,115,22,0.12)] text-[#F97316] font-semibold"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tema do Livro *</Label>
            <Input
              value={form.tema}
              onChange={(e) => f("tema", e.target.value)}
              placeholder="ex: emagrecimento com alimentação real"
              className="bg-transparent border-white/10 focus:border-[#F97316]/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nicho *</Label>
            <Input
              value={form.nicho}
              onChange={(e) => f("nicho", e.target.value)}
              placeholder="ex: saúde e bem-estar"
              className="bg-transparent border-white/10 focus:border-[#F97316]/50"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Público-alvo *</Label>
            <Input
              value={form.publicoAlvo}
              onChange={(e) => f("publicoAlvo", e.target.value)}
              placeholder="ex: mulheres 30-50 anos que querem emagrecer sem dietas restritivas"
              className="bg-transparent border-white/10 focus:border-[#F97316]/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Objetivo do Livro</Label>
            <Input
              value={form.objetivo}
              onChange={(e) => f("objetivo", e.target.value)}
              placeholder="ex: vender no Amazon KDP e Hotmart"
              className="bg-transparent border-white/10 focus:border-[#F97316]/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estilo Desejado</Label>
            <Input
              value={form.estiloDesejado}
              onChange={(e) => f("estiloDesejado", e.target.value)}
              placeholder="ex: inspirador, prático e sem jargão técnico"
              className="bg-transparent border-white/10 focus:border-[#F97316]/50"
            />
          </div>
        </div>

        {/* Options row */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nível do Público</Label>
            <select
              value={form.nivelPublico}
              onChange={(e) => f("nivelPublico", e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-muted-foreground"
            >
              {NIVEL_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Idioma</Label>
            <select
              value={form.idioma}
              onChange={(e) => f("idioma", e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-muted-foreground"
            >
              {["Português", "English", "Español"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Capítulos</Label>
            <select
              value={form.quantidadeCapitulos}
              onChange={(e) => f("quantidadeCapitulos", Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-muted-foreground"
            >
              {[3, 5, 7, 10, 12, 15].map((n) => <option key={n} value={n}>{n} capítulos</option>)}
            </select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !form.tema.trim() || !form.nicho.trim() || !form.publicoAlvo.trim()}
            className="gap-2 text-white ml-auto"
            style={{ background: ACCENT, boxShadow: generating ? "none" : "0 0 20px rgba(249,115,22,0.4)" }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generating ? "Gerando..." : "Gerar Template"}
          </Button>
        </div>

        {generating && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
            <Loader2 className="h-3 w-3 animate-spin" style={{ color: ACCENT }} />
            Gerando template completo com IA — pode levar 20–40 segundos...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Export bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-foreground">Template gerado — {LIVRO_TIPO_LABELS[result.tipo]}</span>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={fullText} label="Copiar texto completo" />
              <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 gap-1" onClick={handleExportJson}>
                <Download className="h-3 w-3" /> Exportar JSON
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 px-3 text-xs gap-1"
                style={{ borderColor: ACCENT_BORDER, color: ACCENT }}
                onClick={() => navigate({ to: "/produtos/ebook" })}
              >
                <ArrowRight className="h-3 w-3" /> Criar Ebook
              </Button>
            </div>
          </div>

          {/* Identity */}
          <Section title="Identidade do Livro" icon={BookOpen} accent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["Título", result.titulo],
                ["Subtítulo", result.subtitulo],
                ["Promessa Central", result.promessa_central],
                ["Tom de Voz", result.tom_de_voz],
                ["Público-alvo", result.publico_alvo],
                ["Transformação Desejada", result.transformacao_desejada],
              ].map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground font-medium flex-1">{value}</p>
                    <CopyButton text={value} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Índice */}
          <Section title="Índice Completo" icon={ClipboardList}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {result.indice.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="text-[10px] font-bold w-5 text-center" style={{ color: ACCENT }}>{i + 1}</span>
                  {item}
                </div>
              ))}
            </div>
          </Section>

          {/* Introdução */}
          <Section title="Introdução" icon={FileText}>
            <TextBlock text={result.introducao} rows={6} />
          </Section>

          {/* Capítulos */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookMarked className="h-4 w-4" style={{ color: ACCENT }} />
              Capítulos ({result.capitulos.length})
            </h3>
            {result.capitulos.map((cap, i) => (
              <ChapterCard key={cap.numero} cap={cap} index={i} />
            ))}
          </div>

          {/* CTA + Bônus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Chamada para Ação Final" icon={Megaphone} accent>
              <TextBlock text={result.chamada_para_acao_final} rows={3} />
            </Section>
            <Section title="Bônus e Upsell" icon={Sparkles}>
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bônus Sugeridos</p>
                <ul className="space-y-1">
                  {result.bonus_sugeridos.map((b, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <span style={{ color: ACCENT }}>★</span>{b}
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-white/8">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ideia de Upsell</p>
                  <p className="text-xs text-foreground/80">{result.ideia_de_upsell}</p>
                </div>
              </div>
            </Section>
          </div>

          {/* Design */}
          <Section title="Design & Visual" icon={Palette}>
            <div className="space-y-4">
              {/* Paleta */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Paleta de Cores</p>
                <div className="flex flex-wrap gap-3">
                  {result.paleta_de_cores.map((cor, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 bg-white/2">
                      <div className="w-6 h-6 rounded-full border border-white/20" style={{ background: cor.hex }} />
                      <div>
                        <p className="text-[11px] font-semibold">{cor.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{cor.hex} · {cor.uso}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estilo Visual</p>
                  <p className="text-xs text-foreground/80">{result.estilo_visual}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sugestão de Capa</p>
                  <p className="text-xs text-foreground/80">{result.sugestao_capa}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prompt para Capa (Midjourney / DALL-E)</p>
                  <CopyButton text={result.prompt_capa} />
                </div>
                <TextBlock text={result.prompt_capa} rows={3} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prompt de Diagramação no Canva</p>
                  <CopyButton text={result.prompt_diagramacao_canva} />
                </div>
                <TextBlock text={result.prompt_diagramacao_canva} rows={4} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Versão Canva / Google Docs</p>
                  <CopyButton text={result.versao_canva_google_docs} />
                </div>
                <TextBlock text={result.versao_canva_google_docs} rows={4} />
              </div>
            </div>
          </Section>

          {/* Marketing */}
          <Section title="Marketing & Página de Vendas" icon={Megaphone} accent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Descrição para Página de Vendas</p>
                  <CopyButton text={result.descricao_pagina_de_vendas} />
                </div>
                <TextBlock text={result.descricao_pagina_de_vendas} rows={6} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Checklist de Personalização</p>
                <ul className="space-y-1.5">
                  {result.checklist_personalizacao.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <div className="w-4 h-4 rounded border border-white/20 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-white/10 gap-1"
              onClick={() => navigate({ to: "/produtos/ebook" })}>
              <BookOpen className="h-3 w-3" /> Criar Ebook
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-white/10 gap-1"
              onClick={() => navigate({ to: "/copy" })}>
              <FileText className="h-3 w-3" /> Criar Copy de Vendas
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-white/10 gap-1"
              onClick={() => navigate({ to: "/pagina-venda" })}>
              <Megaphone className="h-3 w-3" /> Criar Página de Venda
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-white/10 gap-1 ml-auto"
              onClick={handleGenerate}>
              <Wand2 className="h-3 w-3" /> Regenerar
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
