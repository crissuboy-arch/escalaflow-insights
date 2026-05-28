import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, Search, Loader2, Copy, Check, Sparkles, Link2,
  ImageIcon, DollarSign, Type, AlignLeft, MousePointerClick,
  ExternalLink, ChevronDown, ChevronUp, AlertCircle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { prepareScrapeForAI } from "@/lib/scraper/offer-types";
import type { PublicOfferData } from "@/lib/scraper/offer-types";

export const Route = createFileRoute("/_authenticated/minerador-publico")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: MineradorPublicoPage,
});

// ── Design tokens ─────────────────────────────────────────────────────────────
const A  = "#3B82F6";          // blue-500
const A2 = "#8B5CF6";          // violet-500
const BG = "rgba(59,130,246,0.08)";
const BD = "rgba(59,130,246,0.20)";

// ── Sub-components ─────────────────────────────────────────────────────────────

function ResultCard({
  icon: Icon,
  label,
  count,
  accentColor = A,
  children,
  defaultOpen = true,
}: {
  icon: typeof Globe;
  label: string;
  count?: number;
  accentColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}35` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
          </span>
          {label}
          {count !== undefined && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: `${accentColor}18`, color: accentColor }}>
              {count}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
      </button>
      {open && <div className="px-5 pb-4 pt-1">{children}</div>}
    </motion.div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-xs text-white/30 italic">{text}</p>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MineradorPublicoPage() {
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<PublicOfferData | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  const handleScrape = async () => {
    const trimmed = url.trim();
    if (!trimmed) { toast.error("Cole uma URL para capturar."); return; }
    if (!/^https?:\/\//i.test(trimmed)) { toast.error("A URL deve começar com http:// ou https://"); return; }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/scrape-offer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed, timeout: 30000 }),
      });
      const json = await res.json();

      if (!json.ok) {
        setError(json.error ?? "Falha ao capturar página.");
      } else {
        // Adapts the ScrapeResult from the API into PublicOfferData shape
        const d = json as {
          page: { title: string; metaDescription: string };
          url: string;
          headings: { h1: string[]; h2: string[]; h3: string[] };
          body: { paragraphs: string[]; mainText: string };
          ctas: { buttons: string[]; links: Array<{ text: string; href: string }> };
          media: { images: Array<{ src: string; alt: string }> };
          offer: { prices: string[] };
          scrapedAt: string;
        };
        setResult({
          title:           d.page.title,
          url:             d.url,
          metaDescription: d.page.metaDescription,
          headings:        d.headings,
          paragraphs:      d.body.paragraphs,
          buttons:         d.ctas.buttons,
          links:           d.ctas.links,
          images:          d.media.images,
          prices:          d.offer.prices,
          visibleText:     d.body.mainText,
          scrapedAt:       d.scrapedAt,
        });
        toast.success("Página capturada com sucesso!");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
      setCopied(true);
      toast.success("JSON copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyAI = () => {
    if (!result) return;
    navigator.clipboard.writeText(prepareScrapeForAI(result)).then(() => {
      setCopiedAi(true);
      toast.success("Prompt IA copiado!");
      setTimeout(() => setCopiedAi(false), 2000);
    });
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "#070B14" }}>
      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              style={{ background: `linear-gradient(135deg, ${A}, ${A2})` }}>
              <Globe className="h-5 w-5 text-white" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Minerador Open Source</h1>
            <span className="ml-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              Playwright
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Captura dados públicos de qualquer página — headlines, CTAs, preços, imagens — e gera JSON pronto para análise por IA.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* ── URL input ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/40">
            URL da Página
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleScrape()}
                placeholder="https://hotmart.com/produto/seu-produto"
                className="pl-9 bg-transparent border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50"
              />
            </div>
            <Button
              onClick={handleScrape}
              disabled={loading || !url.trim()}
              className="shrink-0 gap-2 text-white font-semibold"
              style={{
                background: loading ? "rgba(59,130,246,0.4)" : `linear-gradient(135deg, ${A}, ${A2})`,
                boxShadow: loading ? "none" : "0 0 24px rgba(59,130,246,0.35)",
              }}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Capturando…</>
              ) : (
                <><Search className="h-4 w-4" />Capturar Página</>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-white/25">
            Apenas páginas públicas. Não captura login, senha ou dados privados. Timeout: 30s.
          </p>
        </div>

        {/* ── Loading ── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 flex flex-col items-center gap-4"
            >
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full opacity-30 blur-xl"
                  style={{ background: `linear-gradient(135deg, ${A}, ${A2})` }} />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/40"
                />
                <Globe className="absolute inset-0 m-auto h-6 w-6 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Capturando página com Playwright…</p>
                <p className="mt-1 text-xs text-white/40">Abrindo Chromium headless · Extraindo dados públicos</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-500/25 bg-red-500/8 px-5 py-4 flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Falha na captura</p>
                <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results ── */}
        <AnimatePresence>
          {result && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Capturado em {new Date(result.scrapedAt).toLocaleString("pt-BR")}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 border-white/10 text-xs gap-1.5 text-slate-300 hover:text-white"
                    onClick={handleCopyJson}>
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copiado!" : "Copiar JSON"}
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-8 border-blue-500/30 text-xs gap-1.5 text-blue-300 hover:text-white hover:border-blue-400/60"
                    onClick={handleCopyAI}>
                    {copiedAi ? <Check className="h-3 w-3 text-emerald-400" /> : <Sparkles className="h-3 w-3" />}
                    {copiedAi ? "Copiado!" : "Copiar Prompt IA"}
                  </Button>
                  <Button size="sm"
                    className="h-8 text-xs gap-1.5 text-white opacity-60 cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${A}60, ${A2}60)` }}
                    disabled
                    title="Em breve — conectar à Análise IA"
                  >
                    <Zap className="h-3 w-3" />
                    Enviar para IA
                  </Button>
                </div>
              </div>

              {/* Title + meta */}
              <ResultCard icon={Type} label="Título e Descrição" accentColor={A}>
                <p className="text-base font-bold text-white leading-snug">{result.title || "(sem título)"}</p>
                {result.metaDescription ? (
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{result.metaDescription}</p>
                ) : (
                  <EmptyNote text="Meta description não encontrada" />
                )}
                <a href={result.url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                  <ExternalLink className="h-3 w-3" />{result.url.slice(0, 80)}
                </a>
              </ResultCard>

              {/* Headlines */}
              <ResultCard icon={Type} label="Headlines"
                count={result.headings.h1.length + result.headings.h2.length + result.headings.h3.length}
                accentColor="#8B5CF6">
                {result.headings.h1.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">H1</p>
                    <div className="space-y-1">
                      {result.headings.h1.map((h, i) => (
                        <p key={i} className="rounded-lg border border-violet-500/20 bg-violet-500/8 px-3 py-2 text-sm font-semibold text-white">{h}</p>
                      ))}
                    </div>
                  </div>
                )}
                {result.headings.h2.slice(0, 6).length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">H2</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.headings.h2.slice(0, 6).map((h, i) => <Tag key={i}>{h}</Tag>)}
                    </div>
                  </div>
                )}
                {result.headings.h3.slice(0, 4).length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/20">H3</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.headings.h3.slice(0, 4).map((h, i) => <Tag key={i}>{h}</Tag>)}
                    </div>
                  </div>
                )}
                {!result.headings.h1.length && !result.headings.h2.length && <EmptyNote text="Nenhum heading encontrado" />}
              </ResultCard>

              {/* CTAs */}
              <ResultCard icon={MousePointerClick} label="CTAs e Botões" count={result.buttons.length} accentColor="#10B981">
                {result.buttons.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.buttons.map((b, i) => (
                      <span key={i}
                        className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                        {b}
                      </span>
                    ))}
                  </div>
                ) : <EmptyNote text="Nenhum botão detectado" />}
              </ResultCard>

              {/* Prices */}
              <ResultCard icon={DollarSign} label="Preços Detectados" count={result.prices.length} accentColor="#F59E0B">
                {result.prices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.prices.map((p, i) => (
                      <span key={i}
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-bold text-amber-300">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : <EmptyNote text="Nenhum preço detectado" />}
              </ResultCard>

              {/* Images */}
              <ResultCard icon={ImageIcon} label="Imagens" count={result.images.length} accentColor="#EC4899" defaultOpen={false}>
                {result.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {result.images.slice(0, 12).map((img, i) => (
                      <a key={i} href={img.src} target="_blank" rel="noopener noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <img src={img.src} alt={img.alt || ""} className="h-full w-full object-cover transition group-hover:scale-105" />
                        {img.alt && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px] text-white/80 truncate opacity-0 group-hover:opacity-100 transition">
                            {img.alt}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                ) : <EmptyNote text="Nenhuma imagem encontrada" />}
              </ResultCard>

              {/* Links */}
              <ResultCard icon={Link2} label="Links" count={result.links.length} accentColor="#06B6D4" defaultOpen={false}>
                {result.links.length > 0 ? (
                  <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {result.links.slice(0, 25).map((l, i) => (
                      <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-cyan-300/80 hover:bg-white/5 hover:text-cyan-200 transition-colors">
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                        <span className="truncate">{l.text || l.href}</span>
                      </a>
                    ))}
                  </div>
                ) : <EmptyNote text="Nenhum link encontrado" />}
              </ResultCard>

              {/* Full text */}
              <ResultCard icon={AlignLeft} label="Texto Extraído" accentColor="#6366F1" defaultOpen={false}>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-white/50">
                  {result.visibleText || "(sem texto)"}
                </pre>
              </ResultCard>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
