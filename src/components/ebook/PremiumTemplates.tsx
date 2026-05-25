import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Eye, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AiKickstart } from "./EbookHub";

type TemplateLevel = "Iniciante" | "Premium" | "High Ticket";

type PremiumTemplate = {
  id: string;
  name: string;
  category: string;
  pages: number;
  level: TemplateLevel;
  colorA: string;
  colorB: string;
  emoji: string;
};

const TEMPLATES: PremiumTemplate[] = [
  { id: "low-ticket",         name: "Ebook Low Ticket",        category: "Vendas",       pages: 60,  level: "Iniciante",   colorA: "#0A6CFF", colorB: "#003A8C", emoji: "💡" },
  { id: "planner-feminino",   name: "Planner Feminino",        category: "Organização",  pages: 30,  level: "Iniciante",   colorA: "#EC4899", colorB: "#831843", emoji: "🌸" },
  { id: "planner-financeiro", name: "Planner Financeiro",      category: "Finanças",     pages: 40,  level: "Premium",     colorA: "#F59E0B", colorB: "#78350F", emoji: "💰" },
  { id: "fitness-receitas",   name: "Ebook Receitas Fitness",  category: "Saúde",        pages: 50,  level: "Iniciante",   colorA: "#22C55E", colorB: "#14532D", emoji: "🥗" },
  { id: "tiktok-shop",        name: "Guia TikTok Shop",        category: "Marketing",    pages: 25,  level: "Iniciante",   colorA: "#06B6D4", colorB: "#0E4F5C", emoji: "📱" },
  { id: "dropshipping",       name: "Ebook Dropshipping",      category: "Negócios",     pages: 45,  level: "Premium",     colorA: "#8B5CF6", colorB: "#3B0764", emoji: "📦" },
  { id: "apostila-premium",   name: "Apostila Premium",        category: "Educação",     pages: 80,  level: "Premium",     colorA: "#3B82F6", colorB: "#1E3A8A", emoji: "📚" },
  { id: "high-ticket",        name: "Ebook High Ticket",       category: "Premium",      pages: 100, level: "High Ticket", colorA: "#EAB308", colorB: "#78350F", emoji: "⭐" },
  { id: "kit-digital",        name: "Kit Digital Completo",    category: "Pacote",       pages: 60,  level: "High Ticket", colorA: "#F97316", colorB: "#7C2D12", emoji: "🎁" },
  { id: "instagram",          name: "Guia Instagram",          category: "Social Media", pages: 30,  level: "Iniciante",   colorA: "#E879F9", colorB: "#701A75", emoji: "📸" },
  { id: "gospel",             name: "Ebook Gospel",            category: "Espiritual",   pages: 50,  level: "Iniciante",   colorA: "#6366F1", colorB: "#1E1B4B", emoji: "✝️" },
  { id: "emagrecimento",      name: "Planner Emagrecimento",   category: "Saúde",        pages: 35,  level: "Premium",     colorA: "#10B981", colorB: "#064E3B", emoji: "🏃" },
];

const LEVEL_STYLES: Record<TemplateLevel, string> = {
  "Iniciante":   "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  "Premium":     "border-blue-400/40 bg-blue-500/10 text-blue-400",
  "High Ticket": "border-amber-400/40 bg-amber-500/10 text-amber-400",
};

const LANGUAGES = ["Português", "English", "Español", "Français", "Deutsch", "Italiano"];
const TONES = ["Motivacional", "Técnico", "Emocional", "Direto"];

function EbookMockup({ t, large = false }: { t: PremiumTemplate; large?: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        aspectRatio: "3/4",
        background: `linear-gradient(140deg, ${t.colorA} 0%, ${t.colorB} 100%)`,
        width: "100%",
        maxWidth: large ? 180 : undefined,
        margin: large ? "0 auto" : undefined,
      }}
    >
      {/* Page lines */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(255,255,255,0.9) 14px, rgba(255,255,255,0.9) 15px)",
        }}
      />
      {/* Spine shadow */}
      <div className="absolute inset-y-0 left-0 w-3" style={{ background: "rgba(0,0,0,0.3)" }} />
      {/* Corner shine */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)" }}
      />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-white">
        <span style={{ fontSize: large ? 40 : 24, lineHeight: 1 }}>{t.emoji}</span>
        <p
          className="font-bold leading-tight"
          style={{ fontSize: large ? 13 : 9, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
        >
          {t.name}
        </p>
        <p className="opacity-70" style={{ fontSize: large ? 10 : 7 }}>
          {t.pages} páginas
        </p>
      </div>
    </div>
  );
}

function TemplateCard({
  t,
  index,
  onUse,
  onPreview,
  busy,
}: {
  t: PremiumTemplate;
  index: number;
  onUse: () => void;
  onPreview: () => void;
  busy?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.35 }}
      className="group flex-none"
      style={{ width: 188, scrollSnapAlign: "start" }}
    >
      <div
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-card/50 backdrop-blur-sm transition-all duration-300"
        style={{
          boxShadow: "0 0 0 1px oklch(0.62 0.22 258 / 0.10)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 0 0 1px oklch(0.62 0.22 258 / 0.55), 0 8px 32px -8px oklch(0.62 0.22 258 / 0.35)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.62 0.22 258 / 0.50)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 0 0 1px oklch(0.62 0.22 258 / 0.10)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
        }}
      >
        {/* Cover mockup */}
        <div className="p-3 pb-2">
          <EbookMockup t={t} />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2 p-3 pt-1">
          <p className="text-sm font-semibold leading-snug">{t.name}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              {t.category}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full border px-1.5 text-[10px] font-medium ${LEVEL_STYLES[t.level]}`}
            >
              {t.level}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{t.pages} páginas</p>

          {/* Buttons */}
          <div className="mt-auto flex gap-1.5 pt-1">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 12px oklch(0.62 0.22 258 / 0.35)" }}
              onClick={onUse}
              disabled={busy}
            >
              Usar Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 shrink-0 border-white/15 p-0 backdrop-blur-sm"
              onClick={onPreview}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PremiumTemplates({
  onAiGenerate,
  busy,
}: {
  onAiGenerate: (k: AiKickstart) => void;
  busy?: boolean;
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PremiumTemplate | null>(null);
  const [preview, setPreview] = useState<PremiumTemplate | null>(null);
  const [form, setForm] = useState({
    niche: "",
    country: "Brasil",
    audience: "",
    promise: "",
    language: "Português",
    style: "Motivacional",
  });

  function handleGenerate() {
    if (!selected) return;
    onAiGenerate({
      niche: form.niche || selected.category,
      promise: form.promise,
      audience: form.audience,
      style: form.style,
      chapterCount: Math.max(3, Math.round(selected.pages / 10)),
      language: form.language,
    });
    setSelected(null);
    setForm({ niche: "", country: "Brasil", audience: "", promise: "", language: "Português", style: "Motivacional" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight">Modelos Premium</h2>
          <p className="text-xs text-muted-foreground">Escolha um template profissional e a IA personaliza tudo</p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto shrink-0 border-primary/30 text-xs text-primary"
        >
          {TEMPLATES.length} templates
        </Badge>
      </div>

      {/* Horizontal scroll */}
      <div className="premium-templates-scroll flex gap-4 overflow-x-auto pb-3">
        {TEMPLATES.map((t, i) => (
          <TemplateCard
            key={t.id}
            t={t}
            index={i}
            onUse={() => navigate({ to: "/ebook-studio", search: { t: t.id } })}
            onPreview={() => setPreview(t)}
            busy={busy}
          />
        ))}
      </div>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{preview?.emoji}</span> {preview?.name}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <EbookMockup t={preview} large />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoria</p>
                  <p className="font-medium">{preview.category}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Páginas</p>
                  <p className="font-medium">{preview.pages}p</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nível</p>
                  <p className={`text-sm font-semibold ${preview.level === "High Ticket" ? "text-amber-400" : preview.level === "Premium" ? "text-blue-400" : "text-emerald-400"}`}>
                    {preview.level}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                style={{ background: "var(--gradient-primary)" }}
                onClick={() => { setPreview(null); navigate({ to: "/ebook-studio", search: { t: preview!.id } }); }}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Usar este Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customization modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{selected?.emoji}</span>
              {selected?.name}
            </DialogTitle>
            <DialogDescription>
              Personalize o template. A IA gera título, capítulos e copy completa para o seu produto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Nicho do produto *
                </Label>
                <Input
                  placeholder="Ex: emagrecimento feminino, finanças pessoais…"
                  value={form.niche}
                  onChange={(e) => setForm({ ...form, niche: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Idioma
                </Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  País alvo
                </Label>
                <Input
                  placeholder="Ex: Brasil, Portugal…"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Público-alvo *
                </Label>
                <Input
                  placeholder="Ex: mulheres 30-45 que querem emagrecer sem dieta"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tom da copy
                </Label>
                <Select value={form.style} onValueChange={(v) => setForm({ ...form, style: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Oferta principal *
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Emagreça 5kg em 30 dias sem passar fome nem academia"
                  value={form.promise}
                  onChange={(e) => setForm({ ...form, promise: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              A IA vai gerar título, {selected ? Math.max(3, Math.round(selected.pages / 10)) : 6} capítulos estruturados, copy de cada seção e CTA final — personalizado para o seu nicho.
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 16px oklch(0.62 0.22 258 / 0.40)" }}
                disabled={!form.niche || !form.audience || !form.promise || busy}
                onClick={handleGenerate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
