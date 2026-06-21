import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
// motion/AnimatePresence removed — causes removeChild conflict inside Radix Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Rocket, Copy, Tag, Wand2, Film, Megaphone, FolderOpen, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeOfferFn, generateNewOfferFn, generateVslFn, generateAdsFn,
  type OfferAnalysis, type GeneratedOffer, type VslScript, type GeneratedAd,
} from "@/lib/offer-generator.functions";
import { createProjectFromOffer } from "@/lib/project.functions";

type Step = "idle" | "analyzing" | "offer" | "vsl" | "ads" | "done" | "error";

type CollectedAdMini = {
  id: string;
  headline: string;
  copy: string | null;
  ad_url: string | null;
  niche: string;
  advertiser: string;
  platform: string;
  country: string;
  image_url: string | null;
  score: number;
};

type Props = {
  ad: CollectedAdMini;
  keyword?: string;
  open: boolean;
  onClose: () => void;
};

const STEPS = [
  { id: "analyzing", icon: Tag,       label: "Analisar Oferta"   },
  { id: "offer",     icon: Wand2,     label: "Gerar Oferta"      },
  { id: "vsl",       icon: Film,      label: "Criar VSL"         },
  { id: "ads",       icon: Megaphone, label: "Gerar Anúncios"    },
  { id: "done",      icon: FolderOpen,label: "Salvar Projeto"    },
] as const;

function stepIndex(step: Step): number {
  const order: Step[] = ["analyzing", "offer", "vsl", "ads", "done"];
  return order.indexOf(step);
}

export function GenerateOfferModal({ ad, keyword, open, onClose }: Props) {
  const navigate = useNavigate();

  const analyzeOffer    = useServerFn(analyzeOfferFn);
  const generateOffer   = useServerFn(generateNewOfferFn);
  const generateVsl     = useServerFn(generateVslFn);
  const generateAds     = useServerFn(generateAdsFn);
  const saveProject     = useServerFn(createProjectFromOffer);

  const [step, setStep] = useState<Step>("idle");
  const [analysis, setAnalysis]   = useState<OfferAnalysis | null>(null);
  const [newOffer, setNewOffer]   = useState<GeneratedOffer | null>(null);
  const [vsl, setVsl]             = useState<VslScript | null>(null);
  const [ads, setAds]             = useState<GeneratedAd[] | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(["analyzing"]));

  const toggle = (key: string) => setExpanded((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  const handleClose = () => {
    if (step !== "analyzing" && step !== "offer" && step !== "vsl" && step !== "ads") {
      setStep("idle");
      setAnalysis(null);
      setNewOffer(null);
      setVsl(null);
      setAds(null);
      setProjectId(null);
      setErrorMsg(null);
      setExpanded(new Set(["analyzing"]));
      onClose();
    }
  };

  const start = async () => {
    setErrorMsg(null);
    setAnalysis(null);
    setNewOffer(null);
    setVsl(null);
    setAds(null);
    setProjectId(null);

    try {
      // ── Step 1: Analyze ─────────────────────────────────────────────────────
      setStep("analyzing");
      const a = await analyzeOffer({
        data: {
          headline: ad.headline,
          copy: ad.copy ?? "",
          url: ad.ad_url ?? "",
          niche: ad.niche,
        },
      });
      setAnalysis(a);
      setExpanded((s) => new Set([...s, "offer"]));

      // ── Step 2: Generate offer ───────────────────────────────────────────────
      setStep("offer");
      const o = await generateOffer({
        data: {
          analysis: a,
          niche: ad.niche,
          keyword,
        },
      });
      setNewOffer(o);
      setExpanded((s) => new Set([...s, "vsl"]));

      // ── Step 3: Generate VSL ─────────────────────────────────────────────────
      setStep("vsl");
      const v = await generateVsl({
        data: {
          offer: {
            name: o.name,
            headline: o.headline,
            promise: o.promise,
            mechanism: o.mechanism,
            targetAudience: o.targetAudience,
            suggestedPrice: o.suggestedPrice,
            guarantee: o.guarantee,
            bullets: o.bullets,
          },
          mainPain: a.mainPain,
          mainDesire: a.mainDesire,
        },
      });
      setVsl(v);
      setExpanded((s) => new Set([...s, "ads"]));

      // ── Step 4: Generate ads ─────────────────────────────────────────────────
      setStep("ads");
      const adsResult = await generateAds({
        data: {
          offer: {
            name: o.name,
            headline: o.headline,
            promise: o.promise,
            targetAudience: o.targetAudience,
            bullets: o.bullets,
          },
          emotionalAngle: a.emotionalAngle,
        },
      });
      setAds(adsResult.ads);
      setExpanded((s) => new Set([...s, "done"]));

      setStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setErrorMsg(msg);
      setStep("error");
      toast.error(`Erro na geração: ${msg.slice(0, 80)}`);
    }
  };

  const handleSave = async () => {
    if (!newOffer || !analysis) return;
    try {
      const r = await saveProject({
        data: {
          title: newOffer.name,
          niche: ad.niche,
          promise: newOffer.promise,
          avatar: newOffer.targetAudience,
          uniqueMechanism: newOffer.mechanism,
          pains: [analysis.mainPain],
          desires: [analysis.mainDesire],
          headline: newOffer.headline,
          copy: vsl?.fullScript ?? newOffer.bullets.join("\n"),
          cta: ads?.[0]?.cta ?? "Acesse Agora",
          advertiser: ad.advertiser,
          platform: ad.platform,
          country: ad.country,
          imageUrl: ad.image_url,
          source_ad_key: ad.id,
        },
      });
      setProjectId(r.id);
      toast.success("Projeto criado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar projeto");
    }
  };

  const currentIdx = stepIndex(step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#060d1a] border-blue-500/20 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Gerar Oferta Parecida
          </DialogTitle>
          <p className="text-sm text-slate-400 mt-1 line-clamp-1">
            Referência: <span className="text-slate-300">{ad.headline}</span>
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Step progress bar */}
          <div className="flex items-center gap-2 pt-4">
            {STEPS.map((s, i) => {
              const done    = currentIdx > i || step === "done";
              const active  = (STEPS[currentIdx]?.id === s.id) && step !== "done" && step !== "idle" && step !== "error";
              const pending = currentIdx < i && step !== "done";
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center gap-1 min-w-0 ${pending ? "opacity-40" : ""}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      done    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" :
                      active  ? "border-blue-400 bg-blue-500/20 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]" :
                                "border-white/20 bg-white/5 text-slate-500"
                    }`}>
                      {active ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <s.icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="text-[10px] text-center leading-tight text-slate-400 hidden sm:block">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 transition-all ${done ? "bg-emerald-500/60" : "bg-white/10"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Start button (idle / error state) */}
          {(step === "idle" || step === "error") && (
            <div className="space-y-3">
              {step === "error" && errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <Button
                onClick={start}
                className="w-full py-5 text-base font-semibold text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                {step === "error" ? "Tentar Novamente" : "Iniciar Geração Completa"}
              </Button>
            </div>
          )}

          {/* Result cards — appear as steps complete */}
          <div className="space-y-3">

            {/* Analysis result */}
            {analysis && (
              <ResultCard
                icon={<Tag className="h-4 w-4 text-purple-400" />}
                title="Análise da Oferta"
                badge={{ label: "Concluído", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }}
                open={expanded.has("analyzing")}
                onToggle={() => toggle("analyzing")}
              >
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Info label="Promessa"         value={analysis.promise} />
                  <Info label="Mecanismo"        value={analysis.mechanism} />
                  <Info label="Público"          value={analysis.audience} />
                  <Info label="Dor principal"    value={analysis.mainPain} />
                  <Info label="Desejo principal" value={analysis.mainDesire} />
                  <Info label="Ângulo emocional" value={analysis.emotionalAngle} />
                  <Info label="Nível consciência" value={analysis.awarenessLevel} />
                  {analysis.bonuses?.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-slate-500 mb-1">Bônus identificados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.bonuses.map((b, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-purple-500/30 text-purple-300">{b}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ResultCard>
            )}

            {/* Generated offer result */}
            {newOffer && (
              <ResultCard
                icon={<Wand2 className="h-4 w-4 text-blue-400" />}
                title="Nova Oferta Gerada"
                badge={{ label: "Concluído", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }}
                open={expanded.has("offer")}
                onToggle={() => toggle("offer")}
              >
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                    <p className="text-lg font-bold text-white leading-tight">{newOffer.headline}</p>
                    <p className="text-slate-400 mt-1">{newOffer.subheadline}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Info label="Produto"        value={newOffer.name} />
                    <Info label="Preço sugerido" value={newOffer.suggestedPrice} />
                    <Info label="Promessa"       value={newOffer.promise} />
                    <Info label="Mecanismo"      value={newOffer.mechanism} />
                    <Info label="Diferencial"    value={newOffer.differentiator} className="sm:col-span-2" />
                    <Info label="Garantia"       value={newOffer.guarantee} />
                    <Info label="Público"        value={newOffer.targetAudience} />
                  </div>
                  {newOffer.bullets?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1.5">Benefícios</p>
                      <ul className="space-y-1">
                        {newOffer.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-300">
                            <span className="text-blue-400 mt-0.5">•</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {newOffer.bonuses?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1.5">Bônus</p>
                      <div className="flex flex-wrap gap-1.5">
                        {newOffer.bonuses.map((b, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-blue-500/30 text-blue-300">{b}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ResultCard>
            )}

            {/* VSL result */}
            {vsl && (
              <ResultCard
                icon={<Film className="h-4 w-4 text-red-400" />}
                title="Script VSL"
                badge={{ label: "Concluído", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }}
                open={expanded.has("vsl")}
                onToggle={() => toggle("vsl")}
                copyValue={vsl.fullScript}
              >
                <div className="space-y-2 text-sm">
                  {[
                    { key: "hook",      label: "Hook (0–15s)",     color: "text-red-400" },
                    { key: "problem",   label: "Problema",         color: "text-orange-400" },
                    { key: "agitation", label: "Agravamento",      color: "text-yellow-400" },
                    { key: "solution",  label: "Solução",          color: "text-blue-400" },
                    { key: "mechanism", label: "Mecanismo",        color: "text-purple-400" },
                    { key: "offer",     label: "Oferta",           color: "text-emerald-400" },
                    { key: "urgency",   label: "Urgência",         color: "text-orange-400" },
                    { key: "cta",       label: "CTA",              color: "text-blue-400" },
                  ].map(({ key, label, color }) => {
                    const val = (vsl as Record<string, string>)[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
                        <p className="text-slate-300 leading-relaxed">{val}</p>
                      </div>
                    );
                  })}
                </div>
              </ResultCard>
            )}

            {/* Ads result */}
            {ads && ads.length > 0 && (
              <ResultCard
                icon={<Megaphone className="h-4 w-4 text-orange-400" />}
                title={`${ads.length} Anúncios Gerados`}
                badge={{ label: "Concluído", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }}
                open={expanded.has("ads")}
                onToggle={() => toggle("ads")}
              >
                <div className="space-y-3">
                  {ads.map((a, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] capitalize border-orange-500/30 text-orange-300`}>
                          {a.format}
                        </Badge>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${a.hook}\n\n${a.primaryText}`); toast.success("Copiado!"); }}
                          className="text-slate-500 hover:text-slate-300 transition"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">HOOK</p>
                      <p className="text-sm font-semibold text-white">{a.hook}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-2">TEXTO PRINCIPAL</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{a.primaryText}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-slate-500">Headline: <span className="text-slate-300">{a.headline}</span></p>
                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-300">{a.cta}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* Loading indicator during active steps */}
            {(step === "analyzing" || step === "offer" || step === "vsl" || step === "ads") && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-300">
                    {step === "analyzing" && "Analisando oferta com IA…"}
                    {step === "offer"     && "Gerando nova oferta…"}
                    {step === "vsl"       && "Criando script VSL…"}
                    {step === "ads"       && "Gerando variações de anúncio…"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Isso pode levar alguns segundos</p>
                </div>
              </div>
            )}
          </div>

          {/* Save to project (done state) */}
            {step === "done" && newOffer && (
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-300">Geração completa! Produto: {newOffer.name}</p>
                </div>

                {projectId ? (
                  <Button
                    className="w-full text-white"
                    style={{ background: "var(--gradient-primary)" }}
                    onClick={() => navigate({ to: "/projetos/$id", params: { id: projectId }, search: { tab: "escala" } as never })}
                  >
                    <Rocket className="mr-2 h-4 w-4" /> Abrir Projeto no EscalaFlow
                  </Button>
                ) : (
                  <Button
                    className="w-full text-white"
                    style={{ background: "var(--gradient-primary)" }}
                    onClick={handleSave}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" /> Salvar no Projeto EscalaFlow
                  </Button>
                )}
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultCard({
  icon, title, badge, open, onToggle, copyValue, children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: { label: string; cls: string };
  open: boolean;
  onToggle: () => void;
  copyValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
          <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {copyValue && (
            <button
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(copyValue); toast.success("Copiado!"); }}
              className="text-slate-500 hover:text-slate-300 transition p-1"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="overflow-hidden">
          <div className="px-4 pb-4 border-t border-white/5 pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className="text-slate-300 leading-snug">{value}</p>
    </div>
  );
}
