import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { getOfferById, getAnalysisForOffer, toggleSaveOffer, fetchSavedIds, getOfferMetrics } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Sparkles, Wand2, Layers,
  Workflow, Download, Flame, Calendar, Globe, Tag, Megaphone,
  Clock, TrendingUp, Map, Target, Users, Lightbulb, Heart, MousePointerClick, Film, GitBranch,
  Info, Copy,
} from "lucide-react";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/_authenticated/oferta/$id")({ component: OfferDetailPage });

function scaleLabel(score: number) {
  if (score <= 20) return { label: "Oferta fria", tone: "muted" };
  if (score <= 40) return { label: "Validando", tone: "secondary" };
  if (score <= 60) return { label: "Oferta quente", tone: "primary" };
  if (score <= 80) return { label: "Escalando", tone: "primary" };
  return { label: "Dominando", tone: "primary" };
}

const FORMATS = ["Vídeo", "Carrossel", "Imagem"];

function OfferDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const offer = getOfferById(id);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (user) fetchSavedIds(user.id).then((s) => setSaved(s.has(id)));
  }, [user, id]);

  useEffect(() => {
    if (offer) {
      const t = setTimeout(() => setProgress(offer.scale_score), 100);
      return () => clearTimeout(t);
    }
  }, [offer]);

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h2 className="text-2xl font-bold">Oferta não encontrada</h2>
        <Button asChild><Link to="/minerar">Voltar para Minerar</Link></Button>
      </div>
    );
  }

  const analysis = getAnalysisForOffer(id);
  const idx = parseInt(id.replace(/\D/g, ""), 10) || 1;
  const detectedDays = (idx * 3) % 30 + 1;
  const detectedDate = new Date(2026, 4, 6 - detectedDays).toLocaleDateString();
  const format = FORMATS[idx % FORMATS.length];
  const headline = `${offer.advertiser_name}: o método que está dominando ${offer.niche}`;
  const copy = `Descubra como milhares de pessoas estão transformando seus resultados em ${offer.niche.toLowerCase()} usando o sistema validado da ${offer.advertiser_name}. Resultados reais, método simples, sem complicações.`;
  const cta = "QUERO COMEÇAR AGORA";
  const lvl = scaleLabel(offer.scale_score);
  const metrics = getOfferMetrics(id, offer.scale_score);

  const onSave = async () => {
    if (!user) return;
    const v = await toggleSaveOffer(user.id, id);
    setSaved(v);
    toast.success(v ? "Oferta salva" : "Removida dos salvos");
  };

  const onExport = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    let y = margin;
    const ensure = (h: number) => { if (y + h > pageHeight - margin) { doc.addPage(); y = margin; } };
    const text = (txt: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
      const { size = 11, bold = false, color = [30, 30, 40], gap = 6 } = opts;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(txt, pageWidth - margin * 2) as string[];
      ensure(lines.length * (size * 1.2) + gap);
      doc.text(lines, margin, y);
      y += lines.length * (size * 1.2) + gap;
    };
    const divider = () => { ensure(14); doc.setDrawColor(220); doc.line(margin, y, pageWidth - margin, y); y += 14; };

    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 6, "F");
    y = margin;
    text("EscalaFlow — Análise de Oferta", { size: 18, bold: true, color: [124, 58, 237] });
    text(offer.advertiser_name, { size: 22, bold: true });
    text(`${offer.niche} · ${offer.platform} · ${offer.country} · Detectada em ${detectedDate}`, { size: 10, color: [110, 110, 120] });
    divider();

    // Score gigante
    text("Score de Escala", { size: 14, bold: true });
    const cx = margin + 40, cy = y + 40, r = 38;
    doc.setDrawColor(230); doc.setLineWidth(8);
    doc.circle(cx, cy, r, "S");
    doc.setDrawColor(124, 58, 237);
    const segs = Math.round((offer.scale_score / 100) * 60);
    for (let i = 0; i < segs; i++) {
      const a1 = (-Math.PI / 2) + (i / 60) * Math.PI * 2;
      const a2 = (-Math.PI / 2) + ((i + 1) / 60) * Math.PI * 2;
      doc.line(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(20, 20, 30);
    doc.text(String(offer.scale_score), cx, cy + 8, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(110, 110, 120);
    doc.text(`${metrics.status.label} · ${lvl.label}`, cx + r + 24, cy - 6);
    doc.text(`${metrics.activeAds} anúncios ativos · ${metrics.estimatedDays} dias escalando`, cx + r + 24, cy + 12);
    doc.text(`Crescimento: +${metrics.growth}% · Países: ${metrics.countries.join(", ")}`, cx + r + 24, cy + 30);
    y = cy + r + 24;
    divider();

    // Mapa Estratégico
    text("Mapa Estratégico da Oferta", { size: 14, bold: true });
    const blocks = [
      ["Mecanismo", analysis.mechanism],
      ["Promessa", analysis.promise],
      ["Dores", analysis.pains.join(" · ")],
      ["Desejos", analysis.desires.join(" · ")],
      ["Avatar", analysis.target_audience],
      ["CTA", cta],
      ["Tipo de criativo", format],
      ["Tipo de funil", "VSL → Oferta → Upsell + Remarketing"],
    ];
    blocks.forEach(([t, d]) => {
      text(t, { size: 11, bold: true, color: [124, 58, 237], gap: 2 });
      text(d, { size: 10, color: [60, 60, 70], gap: 8 });
    });
    divider();

    // Score de Oportunidade
    text("Score de Oportunidade", { size: 14, bold: true });
    metrics.opportunity.forEach((m) => {
      ensure(28);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 50);
      doc.text(`${m.label}: ${m.value}/100`, margin, y);
      const barW = pageWidth - margin * 2;
      doc.setFillColor(235, 235, 240); doc.roundedRect(margin, y + 6, barW, 6, 3, 3, "F");
      const c = m.tone === "good" ? [16, 185, 129] : m.tone === "warn" ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(c[0], c[1], c[2]);
      doc.roundedRect(margin, y + 6, (m.value / 100) * barW, 6, 3, 3, "F");
      y += 24;
    });
    text(`Ticket provável: ${metrics.ticketRange}`, { size: 11, bold: true, color: [124, 58, 237] });

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(150);
      doc.text(`EscalaFlow · Página ${i} de ${pages}`, pageWidth / 2, pageHeight - 20, { align: "center" });
    }
    doc.save(`analise-${offer.advertiser_name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF exportado");
  };

  const onCopySummary = async () => {
    const summary =
      `📊 ${offer.advertiser_name} (${offer.niche})\n\n` +
      `🧠 Mecanismo:\n${analysis.mechanism}\n\n` +
      `🎯 Promessa:\n${analysis.promise}\n\n` +
      `🔥 Dores exploradas:\n${analysis.pains.map((p) => `• ${p}`).join("\n")}\n\n` +
      `— Gerado por EscalaFlow`;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Resumo copiado para área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const [modalOpen, setModalOpen] = useState<null | "product" | "funnel" | "variations">(null);

  const productPlan = {
    name: `${offer.advertiser_name} Method`,
    price: "R$ 497",
    format: "Curso digital + comunidade",
    promise: analysis.promise,
    modules: [
      `Módulo 1 — Fundamentos de ${offer.niche}`,
      "Módulo 2 — Aplicação prática do mecanismo",
      "Módulo 3 — Escalando seus resultados",
      "Módulo 4 — Automação e otimização",
    ],
    bonuses: ["Templates exclusivos", "Comunidade VIP", "Mentoria em grupo mensal"],
    guarantee: "30 dias incondicional",
  };

  const funnel = [
    { stage: "Tráfego", desc: `Anúncios em ${offer.platform} segmentando ${analysis.target_audience}` },
    { stage: "Landing page", desc: `Headline: "${headline}" + VSL de 8 minutos` },
    { stage: "Página de oferta", desc: `Apresentação do mecanismo único + bônus + garantia` },
    { stage: "E-mail / Remarketing", desc: "Sequência de 5 e-mails + retargeting nos não-compradores" },
    { stage: "Pós-venda", desc: "Onboarding + comunidade + upsell de mentoria" },
  ];

  const variations = [
    { type: "Vídeo", headline: `Como ${offer.niche.toLowerCase()} mudou minha vida em 30 dias`, copy: `Eu tentei de tudo até descobrir o método da ${offer.advertiser_name}. Veja o resultado.` },
    { type: "Carrossel", headline: `5 erros que travam seus resultados em ${offer.niche}`, copy: `Slide a slide você vai entender o que está faltando — e a solução validada.` },
    { type: "Imagem", headline: `${offer.advertiser_name}: o método que está dominando ${offer.niche}`, copy: `Resultados reais em poucos dias. Comece agora.` },
    { type: "Reel", headline: `Pare tudo se você quer ${analysis.desires[0].toLowerCase()}`, copy: `Em 15 segundos eu te mostro o atalho que ninguém te contou.` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-24 md:pb-6"
    >
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/minerar" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>

      {/* Banner */}
      <Card className="overflow-hidden border-border/60" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="relative h-48 w-full overflow-hidden md:h-64">
          {offer.image_url && (
            <img src={offer.image_url} alt={offer.advertiser_name} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)/0.85) 100%)" }} />
          <div className="absolute right-4 top-4 flex h-20 w-20 flex-col items-center justify-center rounded-full text-primary-foreground shadow-lg" style={{ background: "var(--gradient-primary)" }}>
            <Flame className="h-5 w-5" />
            <div className="text-2xl font-bold leading-none">{offer.scale_score}</div>
          </div>
          <div className="absolute bottom-4 left-4 right-28 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{offer.advertiser_name}</h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary"><Tag className="mr-1 h-3 w-3" />{offer.niche}</Badge>
              <Badge variant="secondary"><Globe className="mr-1 h-3 w-3" />{offer.country}</Badge>
              <Badge variant="secondary"><Megaphone className="mr-1 h-3 w-3" />{offer.platform}</Badge>
              <Badge variant="outline"><Calendar className="mr-1 h-3 w-3" />{detectedDate}</Badge>
              <StatusBadge status={offer.status} />
            </div>
          </div>
        </div>
      </Card>

      {/* Score bar */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Score de Escala</span>
            <span className="text-sm font-semibold text-primary">{lvl.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Fria</span><span>Validando</span><span>Quente</span><span>Escalando</span><span>Dominando</span>
          </div>
        </CardContent>
      </Card>

      {/* Metrics premium header */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Score gigante */}
        <Card className="card-glow border-border/60 bg-gradient-to-br from-card to-primary/10">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                <motion.circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${offer.scale_score} 100` }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                  pathLength={100}
                />
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.24 290)" />
                    <stop offset="100%" stopColor="oklch(0.74 0.15 210)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold leading-none">{offer.scale_score}</span>
                <span className="text-[9px] uppercase text-muted-foreground">score</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Status</div>
              <div className="text-lg font-bold">{metrics.status.emoji} {metrics.status.label}</div>
              <div className="text-xs text-primary">{lvl.label}</div>
            </div>
          </CardContent>
        </Card>

        {/* Anúncios ativos */}
        <Card className="card-glow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Megaphone className="h-3.5 w-3.5" /> Anúncios ativos
            </div>
            <div className="mt-2 text-3xl font-extrabold">{metrics.activeAds}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
              <TrendingUp className="h-3 w-3" /> +{metrics.growth}% nos últimos 7d
            </div>
            <div className="mt-3 flex h-8 items-end gap-0.5">
              {metrics.spark.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${v}%` }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className="flex-1 rounded-sm"
                  style={{ background: "var(--gradient-primary)", opacity: 0.6 + (i / 24) }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Países detectados */}
        <Card className="card-glow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Globe className="h-3.5 w-3.5" /> Países detectados
            </div>
            <div className="mt-2 text-3xl font-extrabold">{metrics.countries.length}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {metrics.countries.map((c) => (
                <Badge key={c} variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tempo estimado */}
        <Card className="card-glow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Escalando há
            </div>
            <div className="mt-2 text-3xl font-extrabold">{metrics.estimatedDays} <span className="text-base font-medium text-muted-foreground">dias</span></div>
            <div className="mt-3">
              <div className="text-xs text-muted-foreground">Ticket provável</div>
              <div className="text-sm font-bold text-primary">{metrics.ticketRange}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa Estratégico */}
      <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4 text-primary" /> Mapa Estratégico da Oferta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            initial="h" animate="s"
            variants={{ h: {}, s: { transition: { staggerChildren: 0.06 } } }}
          >
            {[
              { icon: Lightbulb, title: "Mecanismo", text: analysis.mechanism, color: "text-amber-500" },
              { icon: Target, title: "Promessa", text: analysis.promise, color: "text-emerald-500" },
              { icon: Flame, title: "Dores", text: analysis.pains.slice(0, 3).join(" · "), color: "text-red-500" },
              { icon: Heart, title: "Desejos", text: analysis.desires.slice(0, 3).join(" · "), color: "text-pink-500" },
              { icon: Users, title: "Avatar", text: analysis.target_audience, color: "text-sky-500" },
              { icon: MousePointerClick, title: "CTA", text: cta, color: "text-primary" },
              { icon: Film, title: "Tipo de criativo", text: format, color: "text-purple-500" },
              { icon: GitBranch, title: "Tipo de funil", text: "VSL → Oferta → Upsell + Remarketing", color: "text-cyan-500" },
            ].map((b) => (
              <motion.div
                key={b.title}
                variants={{ h: { opacity: 0, y: 10 }, s: { opacity: 1, y: 0 } }}
                className="card-glow rounded-xl border border-border/60 bg-background/60 p-4"
              >
                <div className={`mb-2 flex items-center gap-2 ${b.color}`}>
                  <b.icon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">{b.title}</span>
                </div>
                <p className="text-sm leading-snug text-foreground/90 line-clamp-3">{b.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>

      {/* Score de Oportunidade */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Score de Oportunidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TooltipProvider delayDuration={150}>
          {metrics.opportunity.map((m, i) => {
            const color = m.tone === "good" ? "bg-emerald-500" : m.tone === "warn" ? "bg-amber-500" : "bg-red-500";
            const text = m.tone === "good" ? "text-emerald-500" : m.tone === "warn" ? "text-amber-500" : "text-red-500";
            const descriptions: Record<string, string> = {
              "Fácil de copiar": "Quão simples é replicar essa oferta — produto, criativos e funil. Quanto maior, mais rápido você consegue lançar uma versão própria.",
              "Concorrência": "Quantos players já estão competindo nesse nicho. Valores baixos = oceano azul; valores altos = mercado disputado.",
              "Potencial viral": "Probabilidade do criativo gerar compartilhamentos orgânicos e escala rápida nas plataformas.",
              "Saturação": "Quanto o público-alvo já foi exposto a essa oferta. Saturação alta indica fadiga e queda de conversão.",
            };
            return (
              <div key={m.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    {m.label}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Mais info">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {descriptions[m.label]}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className={`font-bold ${text}`}>{m.value}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${m.value}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    className={`h-full rounded-full ${color}`}
                  />
                </div>
              </div>
            );
          })}
          </TooltipProvider>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <TooltipProvider delayDuration={150}>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  Ticket provável
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Mais info">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Faixa de preço estimada para esse tipo de produto, baseada no nicho e estrutura observada nos criativos.
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TooltipProvider>
              <span className="text-lg font-extrabold text-primary">{metrics.ticketRange}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creative */}
      <Card className="border-border/60">
        <CardHeader><CardTitle>Criativo</CardTitle></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted">
            {offer.image_url && <img src={offer.image_url} alt="" className="aspect-video w-full object-cover" />}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Formato</div>
              <Badge variant="outline" className="mt-1">{format}</Badge>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Headline</div>
              <p className="mt-1 text-lg font-semibold leading-snug">{headline}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Copy principal</div>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
            </div>
            <Button className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              {cta}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Mecanismo único</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{analysis.mechanism}</CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Promessa principal</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{analysis.promise}</CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Dores exploradas</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.pains.map((p) => <li key={p}>• {p}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Desejos ativados</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.desires.map((d) => <li key={d}>• {d}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Público-alvo</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{analysis.target_audience}</CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Gatilhos mentais</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analysis.mental_triggers.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 p-3 backdrop-blur md:static md:rounded-lg md:border md:p-4" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} variant={saved ? "secondary" : "default"} className="flex-1 md:flex-none">
            {saved ? <BookmarkCheck className="mr-1 h-4 w-4" /> : <Bookmark className="mr-1 h-4 w-4" />}
            {saved ? "Salva" : "Salvar oferta"}
          </Button>
          <Button onClick={() => setModalOpen("variations")} variant="outline" className="flex-1 md:flex-none">
            <Sparkles className="mr-1 h-4 w-4" /> Variações
          </Button>
          <Button onClick={() => setModalOpen("product")} variant="outline" className="flex-1 md:flex-none">
            <Wand2 className="mr-1 h-4 w-4" /> Modelar
          </Button>
          <Button onClick={() => setModalOpen("funnel")} variant="outline" className="flex-1 md:flex-none">
            <Workflow className="mr-1 h-4 w-4" /> Funil
          </Button>
          <Button onClick={onCopySummary} variant="outline" className="flex-1 md:flex-none">
            <Copy className="mr-1 h-4 w-4" /> Copiar resumo
          </Button>
          <Button onClick={onExport} variant="outline" className="flex-1 md:flex-none">
            <Download className="mr-1 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Modal: Modelar produto */}
      <Dialog open={modalOpen === "product"} onOpenChange={(o) => !o && setModalOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Produto modelado</DialogTitle>
            <DialogDescription>Proposta gerada a partir da análise IA</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg p-4 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <div className="text-xs uppercase opacity-80">{productPlan.format}</div>
              <div className="text-xl font-bold">{productPlan.name}</div>
              <div className="mt-1 text-2xl font-extrabold">{productPlan.price}</div>
            </div>
            <div><div className="font-semibold">Promessa</div><p className="text-muted-foreground">{productPlan.promise}</p></div>
            <div>
              <div className="font-semibold">Módulos</div>
              <ul className="mt-1 space-y-1 text-muted-foreground">{productPlan.modules.map((m) => <li key={m}>• {m}</li>)}</ul>
            </div>
            <div>
              <div className="font-semibold">Bônus</div>
              <ul className="mt-1 space-y-1 text-muted-foreground">{productPlan.bonuses.map((b) => <li key={b}>• {b}</li>)}</ul>
            </div>
            <div><div className="font-semibold">Garantia</div><p className="text-muted-foreground">{productPlan.guarantee}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Funil */}
      <Dialog open={modalOpen === "funnel"} onOpenChange={(o) => !o && setModalOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Funil de marketing</DialogTitle>
            <DialogDescription>Etapas geradas a partir da oferta</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3">
            {funnel.map((s, i) => (
              <li key={s.stage} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>{i + 1}</span>
                  <div className="font-semibold">{s.stage}</div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      {/* Modal: Variações */}
      <Dialog open={modalOpen === "variations"} onOpenChange={(o) => !o && setModalOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Variações de criativo</DialogTitle>
            <DialogDescription>4 variações geradas a partir da análise</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {variations.map((v, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3">
                <Badge variant="secondary" className="mb-2">{v.type}</Badge>
                <div className="text-sm font-semibold">{v.headline}</div>
                <p className="mt-1 text-xs text-muted-foreground">{v.copy}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
