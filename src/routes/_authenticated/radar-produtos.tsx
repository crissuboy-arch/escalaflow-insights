import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Loader2, Trash2, Sparkles, BookOpen, X,
  Star, ShoppingBag, Package, TrendingUp, Tag,
} from "lucide-react";
import {
  mineEcommerceFn,
  listEcommerceMinedFn,
  analyzeProdutoFn,
  deleteProdutoFn,
  clearEcommerceQueryFn,
} from "@/lib/radar-produtos.functions";
import type { ProdutoAiAnalysis } from "@/lib/radar-produtos.functions";

export const Route = createFileRoute("/_authenticated/radar-produtos")({
  component: RadarProdutosPage,
});

type ProdutoRow = {
  id: string;
  query: string;
  platform: string;
  product_id: string;
  title: string;
  price: number;
  currency: string;
  original_price: number;
  discount: number;
  rating: number;
  review_count: number;
  sold_count: number;
  seller: string;
  product_url: string;
  image_url: string;
  category: string;
  opportunity_score: number;
  ai_analysis: ProdutoAiAnalysis | null;
};

const ACCENT = "#F97316";
const ACCENT_BG = "rgba(249,115,22,0.08)";
const ACCENT_BORDER = "rgba(249,115,22,0.25)";

const PLATFORMS = [
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
  { value: "mercadolivre", label: "Mercado Livre" },
];

const SORT_OPTIONS = [
  { value: "sales", label: "Mais vendidos" },
  { value: "relevance", label: "Relevância" },
  { value: "rating", label: "Melhor avaliação" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
];

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "#FF9900",
  shopee: "#EE4D2D",
  mercadolivre: "#FFE600",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3 w-3"
          style={{ color: i < Math.round(rating) ? "#F97316" : "#334155", fill: i < Math.round(rating) ? "#F97316" : "transparent" }}
        />
      ))}
      <span className="text-[11px] text-muted-foreground ml-0.5">{Number(rating).toFixed(1)}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "#F97316" : score >= 50 ? "#F59E0B" : "#94A3B8";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <TrendingUp className="h-3 w-3" />
      Score {score}
    </span>
  );
}

function ProdutoCard({
  row, onAnalyze, onDelete, analyzing,
}: {
  row: ProdutoRow;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  analyzing: boolean;
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [showAi, setShowAi] = useState(!!row.ai_analysis);
  const platColor = PLATFORM_COLORS[row.platform] ?? "#94A3B8";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 2px 24px 0 rgba(249,115,22,0.06)" }}
    >
      <div className="flex gap-3 p-4">
        {/* image */}
        <a href={row.product_url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative">
          {!imgError && row.image_url ? (
            <img
              src={row.image_url}
              alt=""
              onError={() => setImgError(true)}
              className="w-20 h-20 object-cover rounded-lg border border-white/8"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center border"
              style={{ background: ACCENT_BG, borderColor: ACCENT_BORDER }}
            >
              <Package className="h-8 w-8" style={{ color: ACCENT }} />
            </div>
          )}
          {row.discount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 text-[9px] font-black rounded-full px-1.5 py-0.5"
              style={{ background: "#EF4444", color: "#fff" }}
            >
              -{row.discount}%
            </span>
          )}
        </a>

        {/* content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <ScoreBadge score={row.opportunity_score} />
                <span
                  className="text-[11px] font-bold rounded px-1.5 py-0.5"
                  style={{ background: `${platColor}22`, color: platColor, border: `1px solid ${platColor}44` }}
                >
                  {row.platform.charAt(0).toUpperCase() + row.platform.slice(1)}
                </span>
                {row.category && (
                  <span className="text-[10px] text-muted-foreground/60">{row.category}</span>
                )}
              </div>
              <a
                href={row.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-foreground hover:underline line-clamp-2"
              >
                {row.title}
              </a>
            </div>
            <button onClick={() => onDelete(row.id)} className="text-muted-foreground/50 hover:text-red-400 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* price + stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-foreground">
                {row.currency === "BRL" ? "R$" : row.currency} {Number(row.price).toFixed(2)}
              </span>
              {row.original_price > row.price && (
                <span className="text-xs text-muted-foreground line-through">
                  R$ {Number(row.original_price).toFixed(2)}
                </span>
              )}
            </div>
            <Stars rating={row.rating} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />{fmt(row.review_count)} reviews
            </span>
            {row.sold_count > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />{fmt(row.sold_count)} vendidos
              </span>
            )}
          </div>

          {row.seller && (
            <span className="text-[11px] text-muted-foreground/60">Vendedor: {row.seller}</span>
          )}
        </div>
      </div>

      {/* ai panel */}
      <AnimatePresence>
        {showAi && row.ai_analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mx-4 mb-4 rounded-xl border p-4 space-y-3 text-sm"
              style={{ borderColor: ACCENT_BORDER, background: ACCENT_BG }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2" style={{ color: ACCENT }}>
                  <Sparkles className="h-4 w-4" /> Análise IA
                </span>
                <button onClick={() => setShowAi(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ["Nicho", row.ai_analysis.niche],
                  ["Dor Principal", row.ai_analysis.pain_point],
                  ["Público-alvo", row.ai_analysis.target_audience],
                  ["Posicionamento", row.ai_analysis.positioning],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    <span className="text-foreground text-xs">{value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t space-y-2" style={{ borderColor: ACCENT_BORDER }}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Oportunidade Digital</span>
                  <p className="text-xs text-foreground">{row.ai_analysis.digital_opportunity}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Título de Ebook</span>
                  <p className="text-xs font-semibold" style={{ color: ACCENT }}>{row.ai_analysis.ebook_title}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Ângulo de Oferta</span>
                  <p className="text-xs italic text-foreground/80">"{row.ai_analysis.offer_angle}"</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* actions */}
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs"
          style={{ borderColor: ACCENT_BORDER, color: ACCENT }}
          disabled={analyzing}
          onClick={() => row.ai_analysis ? setShowAi((v) => !v) : onAnalyze(row.id)}
        >
          {analyzing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          {row.ai_analysis ? (showAi ? "Ocultar IA" : "Ver Análise") : "Analisar com IA"}
        </Button>
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() => navigate({ to: "/produtos/ebook", search: { niche: row.ai_analysis?.ebook_title ?? row.title } as any })}
        >
          <BookOpen className="h-3 w-3 mr-1" />Criar Ebook
        </Button>
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() => navigate({ to: "/copy", search: { prompt: row.ai_analysis?.offer_angle ?? row.title } as any })}
        >
          <TrendingUp className="h-3 w-3 mr-1" />Criar Copy
        </Button>
      </div>
    </motion.div>
  );
}

export default function RadarProdutosPage() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<"amazon" | "shopee" | "mercadolivre">("shopee");
  const [maxResults, setMaxResults] = useState(50);
  const [sortBy, setSortBy] = useState("sales");
  const [mining, setMining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [mineResult, setMineResult] = useState<{ inserted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mineProdutos = useServerFn(mineEcommerceFn);
  const listProdutos = useServerFn(listEcommerceMinedFn);
  const analyzeProduto = useServerFn(analyzeProdutoFn);
  const deleteProduto = useServerFn(deleteProdutoFn);
  const clearQuery = useServerFn(clearEcommerceQueryFn);

  const loadProdutos = useCallback(async (q?: string, plat?: string) => {
    setLoading(true); setError(null);
    try {
      const rows = await listProdutos({ data: { query: q, platform: plat, limit: 200 } });
      setProdutos(rows as ProdutoRow[]);
    } catch (e: any) { setError(e.message ?? "Erro ao carregar"); }
    finally { setLoading(false); }
  }, [listProdutos]);

  const handleMine = async () => {
    if (!query.trim()) return;
    setMining(true); setError(null); setMineResult(null);
    try {
      const r = await mineProdutos({
        data: {
          query: query.trim(),
          platform,
          maxResults,
          sortBy: sortBy as any,
        },
      });
      setMineResult(r);
      await loadProdutos(filterQuery ?? undefined, filterPlatform ?? undefined);
    } catch (e: any) { setError(e.message ?? "Erro ao minerar"); }
    finally { setMining(false); }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds((p) => new Set(p).add(id));
    try {
      const analysis = await analyzeProduto({ data: { id } });
      setProdutos((p) => p.map((v) => v.id === id ? { ...v, ai_analysis: analysis as ProdutoAiAnalysis } : v));
    } catch (e: any) { setError(e.message ?? "Erro ao analisar"); }
    finally { setAnalyzingIds((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduto({ data: { id } });
      setProdutos((p) => p.filter((v) => v.id !== id));
    } catch (e: any) { setError(e.message ?? "Erro ao deletar"); }
  };

  const handleClear = async (q: string) => {
    try {
      await clearQuery({ data: { query: q } });
      setProdutos((p) => p.filter((v) => v.query !== q));
      if (filterQuery === q) setFilterQuery(null);
    } catch (e: any) { setError(e.message ?? "Erro ao limpar"); }
  };

  const uniqueQueries = [...new Set(produtos.map((p) => p.query))];
  const displayed = produtos.filter((p) => {
    if (filterQuery && p.query !== filterQuery) return false;
    if (filterPlatform && p.platform !== filterPlatform) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: ACCENT, textShadow: "0 0 24px rgba(249,115,22,0.5)" }}>
          Radar Produtos
        </h1>
        <p className="text-sm text-muted-foreground">
          Minere produtos campeões de vendas nos maiores marketplaces e converta em produtos digitais.
        </p>
      </div>

      {/* search panel */}
      <div className="rounded-2xl border bg-white/2 backdrop-blur-md p-4 space-y-3" style={{ borderColor: ACCENT_BORDER, boxShadow: "0 0 40px -10px rgba(249,115,22,0.15)" }}>
        <div className="flex gap-2 flex-wrap">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleMine()}
            placeholder="ex: suplemento, fone de ouvido, kit skincare..."
            className="flex-1 min-w-48 bg-transparent border-white/10 focus:border-[#F97316]/50"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {[20, 50, 100].map((n) => <option key={n} value={n}>{n} produtos</option>)}
          </select>
          <Button
            onClick={handleMine}
            disabled={mining || !query.trim()}
            className="gap-2 text-white"
            style={{ background: ACCENT, boxShadow: mining ? "none" : "0 0 20px rgba(249,115,22,0.4)" }}
          >
            {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {mining ? "Minerando..." : "Minerar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs" style={{ color: ACCENT }}>
            {mineResult.inserted} produto(s) salvo(s). {mineResult.skipped > 0 ? `${mineResult.skipped} já existiam.` : ""}
          </p>
        )}

        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" disabled={loading} onClick={() => loadProdutos(filterQuery ?? undefined, filterPlatform ?? undefined)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Carregar salvos
          </Button>

          {/* platform filter */}
          <div className="flex gap-1">
            {PLATFORMS.map((p) => {
              const count = produtos.filter((r) => r.platform === p.value).length;
              if (!count) return null;
              return (
                <button
                  key={p.value}
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                  style={filterPlatform === p.value ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                  onClick={() => setFilterPlatform(filterPlatform === p.value ? null : p.value)}
                >{p.label} ({count})</button>
              );
            })}
          </div>

          {/* query filter */}
          {uniqueQueries.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                style={filterQuery === null ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                onClick={() => setFilterQuery(null)}
              >Todos ({produtos.length})</button>
              {uniqueQueries.map((q) => (
                <div key={q} className="flex items-center gap-0.5">
                  <button
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                    style={filterQuery === q ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                    onClick={() => setFilterQuery(filterQuery === q ? null : q)}
                  >{q} ({produtos.filter((p) => p.query === q).length})</button>
                  <button className="text-muted-foreground/40 hover:text-red-400" onClick={() => handleClear(q)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {!loading && produtos.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: ACCENT }} />
          <p className="text-sm">Busque produtos nos marketplaces para encontrar oportunidades.</p>
          <p className="text-xs mt-1 opacity-60">Ex: "suplemento", "fone bluetooth", "kit beleza"</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
          <span className="text-sm">Minerando produtos...</span>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayed.map((row) => (
            <ProdutoCard
              key={row.id}
              row={row}
              onAnalyze={handleAnalyze}
              onDelete={handleDelete}
              analyzing={analyzingIds.has(row.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
