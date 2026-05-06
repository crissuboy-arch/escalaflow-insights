import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { getOfferById, getAnalysisForOffer, toggleSaveOffer, fetchSavedIds } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Sparkles, Wand2, Layers,
  Workflow, Download, Flame, Calendar, Globe, Tag, Megaphone,
} from "lucide-react";

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

  const onSave = async () => {
    if (!user) return;
    const v = await toggleSaveOffer(user.id, id);
    setSaved(v);
    toast.success(v ? "Oferta salva" : "Removida dos salvos");
  };

  const onExport = () => {
    const data = { offer, analysis, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analise-${offer.advertiser_name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Análise exportada");
  };

  const soon = (label: string) => () => toast.info(`${label} — disponível em breve`);

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
          <Button onClick={soon("Gerar variações")} variant="outline" className="flex-1 md:flex-none">
            <Sparkles className="mr-1 h-4 w-4" /> Variações
          </Button>
          <Button onClick={soon("Modelar produto")} variant="outline" className="flex-1 md:flex-none">
            <Wand2 className="mr-1 h-4 w-4" /> Modelar
          </Button>
          <Button onClick={soon("Criar funil")} variant="outline" className="flex-1 md:flex-none">
            <Workflow className="mr-1 h-4 w-4" /> Funil
          </Button>
          <Button onClick={onExport} variant="outline" className="flex-1 md:flex-none">
            <Download className="mr-1 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
