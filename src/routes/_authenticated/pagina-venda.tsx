import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutTemplate, Sparkles, Loader2, Download, Save, Trash2,
  X, FolderOpen, Zap, ShoppingBag, Megaphone, FileText,
  ChevronDown, ChevronUp, Eye, EyeOff, Copy, Check,
  RefreshCw, Globe, Palette,
} from "lucide-react";
import {
  generatePageHtmlFn,
  savePageProjectFn,
  listPageProjectsFn,
  loadPageProjectFn,
  deletePageProjectFn,
} from "@/lib/page-builder.functions";
import { PAGE_SKILLS } from "@/page-builder/skills";
import { DESIGN_SYSTEMS } from "@/page-builder/design-systems";
import { PAGE_TEMPLATES } from "@/page-builder/templates";
import { downloadHtml, getSrcDoc, estimateWordCount } from "@/page-builder/render-engine/renderHtmlPreview";
import type { PageBuilderInput } from "@/page-builder/skills/types";

export const Route = createFileRoute("/_authenticated/pagina-venda")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: PaginaVendaPage,
});

const ACCENT = "#0A6CFF";
const ACCENT_BG = "rgba(10,108,255,0.08)";
const ACCENT_BORDER = "rgba(10,108,255,0.25)";

const LANGUAGES = [
  { value: "pt-BR", label: "Português (BR)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt-PT", label: "Português (PT)" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

const COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "EUA" },
  { value: "PT", label: "Portugal" },
  { value: "MX", label: "México" },
  { value: "AR", label: "Argentina" },
  { value: "ES", label: "Espanha" },
];

const TONE_OPTIONS = [
  "persuasivo e direto",
  "empático e motivacional",
  "científico e clínico",
  "casual e amigável",
  "urgente e escasso",
  "autoridade e expertise",
  "jovem e energético",
  "luxo e exclusividade",
];

const TRAFFIC_OPTIONS = [
  "facebook/instagram",
  "google ads",
  "youtube",
  "tiktok",
  "email marketing",
  "orgânico/seo",
  "whatsapp",
  "linkedin",
];

const BLANK_FORM: PageBuilderInput = {
  skillId: "landing-page",
  designSystemId: "dark-premium",
  productName: "",
  niche: "",
  targetAudience: "",
  country: "BR",
  language: "pt-BR",
  offerType: "",
  pricePoint: "",
  mainPromise: "",
  painPoints: "",
  benefits: "",
  bonuses: "",
  guarantee: "",
  callToAction: "Quero Agora",
  brandName: "",
  toneOfVoice: "persuasivo e direto",
  trafficSource: "facebook/instagram",
  pageGoal: "",
  mineracaoContext: "",
};

type ProjectSummary = {
  id: string;
  title: string;
  skill_id: string;
  design_system_id: string;
  created_at: string;
  updated_at: string;
};

type FormTab = "produto" | "copy" | "oferta" | "visual";

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white/2 hover:bg-white/4 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4" style={{ color: ACCENT }} />
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-3 bg-white/1">{children}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-muted-foreground mb-1">{children}</label>;
}

function TA(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A6CFF]/40 resize-y min-h-[80px] ${props.className ?? ""}`}
    />
  );
}

export default function PaginaVendaPage() {
  const [form, setForm] = useState<PageBuilderInput>(BLANK_FORM);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImportModal, setShowImportModal] = useState<"produto" | "anuncio" | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewScale, setPreviewScale] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      const ctx = sessionStorage.getItem("tiktok_vsl_context");
      if (ctx) {
        sessionStorage.removeItem("tiktok_vsl_context");
        setForm((f) => ({
          ...f,
          skillId: "vsl-page",
          toneOfVoice: "urgente e persuasivo",
          trafficSource: "tiktok",
          mineracaoContext: ctx,
        }));
      }
    } catch {}
  }, []);

  const generatePage = useServerFn(generatePageHtmlFn);
  const savePage = useServerFn(savePageProjectFn);
  const listProjects = useServerFn(listPageProjectsFn);
  const loadProject = useServerFn(loadPageProjectFn);
  const deleteProject = useServerFn(deletePageProjectFn);

  const set = useCallback(<K extends keyof PageBuilderInput>(key: K, value: PageBuilderInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleGenerate = async () => {
    if (!form.productName.trim()) { setError("Informe o nome do produto"); return; }
    setGenerating(true); setError(null);
    try {
      const res = await generatePage({ data: form });
      setGeneratedHtml(res.html);
      setSaveTitle(form.productName + " — " + PAGE_SKILLS.find((s) => s.id === form.skillId)?.name);
    } catch (e: any) { setError(e.message ?? "Erro ao gerar página"); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!generatedHtml || !saveTitle.trim()) return;
    setSaving(true);
    try {
      const res = await savePage({
        data: {
          title: saveTitle,
          html: generatedHtml,
          skillId: form.skillId,
          designSystemId: form.designSystemId,
          formData: form as unknown as Record<string, unknown>,
        },
      });
      setCurrentProjectId(res.id);
      setShowSaveModal(false);
      setError(null);
    } catch (e: any) { setError(e.message ?? "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleLoadProjects = async () => {
    setLoadingProjects(true);
    try {
      const rows = await listProjects({ data: undefined as never });
      setProjects(rows);
      setShowProjects(true);
    } catch (e: any) { setError(e.message ?? "Erro ao carregar projetos"); }
    finally { setLoadingProjects(false); }
  };

  const handleLoadProject = async (id: string) => {
    try {
      const row = await loadProject({ data: { id } });
      setGeneratedHtml(row.html);
      setForm({ ...BLANK_FORM, ...(row.form_data as Partial<PageBuilderInput>), skillId: row.skill_id, designSystemId: row.design_system_id });
      setSaveTitle(row.title);
      setCurrentProjectId(row.id);
      setShowProjects(false);
    } catch (e: any) { setError(e.message ?? "Erro ao carregar projeto"); }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject({ data: { id } });
      setProjects((p) => p.filter((r) => r.id !== id));
      if (currentProjectId === id) { setCurrentProjectId(null); setGeneratedHtml(null); }
    } catch (e: any) { setError(e.message ?? "Erro ao deletar"); }
  };

  const handleCopyHtml = async () => {
    if (!generatedHtml) return;
    await navigator.clipboard.writeText(generatedHtml).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = PAGE_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setForm((f) => ({ ...f, ...tpl.defaults }));
      setShowTemplates(false);
    }
  };

  const selectedSkill = PAGE_SKILLS.find((s) => s.id === form.skillId);
  const selectedDs = DESIGN_SYSTEMS.find((ds) => ds.id === form.designSystemId);

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-5 w-5" style={{ color: ACCENT }} />
          <div>
            <h1 className="text-base font-bold" style={{ color: ACCENT }}>Página de Venda</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Motor Universal · Qualquer produto · Qualquer nicho · Qualquer idioma</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs border-white/10" onClick={handleLoadProjects} disabled={loadingProjects}>
            {loadingProjects ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FolderOpen className="h-3 w-3 mr-1" />}
            Projetos
          </Button>
          {generatedHtml && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10" onClick={handleCopyHtml}>
                {copied ? <Check className="h-3 w-3 mr-1 text-green-400" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copiado" : "Copiar HTML"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10" onClick={() => downloadHtml(generatedHtml, `${saveTitle || "landing-page"}.html`)}>
                <Download className="h-3 w-3 mr-1" />Baixar HTML
              </Button>
              <Button size="sm" className="h-8 text-xs text-white" style={{ background: ACCENT }} onClick={() => setShowSaveModal(true)}>
                <Save className="h-3 w-3 mr-1" />Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* quick action row */}
      <div className="flex gap-2 px-4 py-2 border-b border-white/8 shrink-0 flex-wrap">
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors hover:bg-white/5"
          style={{ borderColor: ACCENT_BORDER, color: ACCENT }}
          onClick={() => { setForm(BLANK_FORM); setGeneratedHtml(null); setCurrentProjectId(null); }}
        >
          <RefreshCw className="h-3.5 w-3.5" />Criar do Zero
        </button>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowImportModal("anuncio")}
        >
          <Megaphone className="h-3.5 w-3.5" />Usar Anúncio Minerado
        </button>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowImportModal("produto")}
        >
          <ShoppingBag className="h-3.5 w-3.5" />Usar Produto Minerado
        </button>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowTemplates(true)}
        >
          <FileText className="h-3.5 w-3.5" />Usar Template
        </button>
      </div>

      {/* error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 flex items-center justify-between shrink-0"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* main content: form + preview */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* form panel */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 overflow-y-auto border-r border-white/8 p-4 space-y-3">

          {/* skill + design system selectors */}
          <Section title="Tipo de Página & Design" icon={Palette} defaultOpen={true}>
            <div>
              <Label>Tipo de Página</Label>
              <select
                value={form.skillId}
                onChange={(e) => set("skillId", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground"
              >
                {PAGE_SKILLS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selectedSkill && (
                <p className="text-[11px] text-muted-foreground/60 mt-1">{selectedSkill.description}</p>
              )}
            </div>
            <div>
              <Label>Design System</Label>
              <select
                value={form.designSystemId}
                onChange={(e) => set("designSystemId", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground"
              >
                {DESIGN_SYSTEMS.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
              {selectedDs && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: selectedDs.accentColor }} />
                  <p className="text-[11px] text-muted-foreground/60">{selectedDs.description}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Idioma</Label>
                <select
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground"
                >
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <Label>País</Label>
                <select
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground"
                >
                  {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* produto */}
          <Section title="Produto" icon={ShoppingBag}>
            <div>
              <Label>Nome do Produto *</Label>
              <Input
                value={form.productName}
                onChange={(e) => set("productName", e.target.value)}
                placeholder="ex: Dieta dos 21 Dias, Curso Tráfego Pro..."
                className="bg-transparent border-white/10"
              />
            </div>
            <div>
              <Label>Nicho de Mercado</Label>
              <Input
                value={form.niche}
                onChange={(e) => set("niche", e.target.value)}
                placeholder="ex: emagrecimento, marketing digital, fitness..."
                className="bg-transparent border-white/10"
              />
            </div>
            <div>
              <Label>Público-alvo</Label>
              <TA
                value={form.targetAudience}
                onChange={(e) => set("targetAudience", e.target.value)}
                placeholder="ex: Mulheres de 30-50 anos que querem emagrecer sem academia..."
                rows={2}
              />
            </div>
            <div>
              <Label>Nome da Marca / Empresa</Label>
              <Input
                value={form.brandName}
                onChange={(e) => set("brandName", e.target.value)}
                placeholder="ex: NutriMétodo, ProFit Academy..."
                className="bg-transparent border-white/10"
              />
            </div>
            <div>
              <Label>Tipo de Oferta</Label>
              <Input
                value={form.offerType}
                onChange={(e) => set("offerType", e.target.value)}
                placeholder="ex: curso online, ebook, produto físico, consultoria..."
                className="bg-transparent border-white/10"
              />
            </div>
          </Section>

          {/* copy */}
          <Section title="Copy & Promessa" icon={Sparkles}>
            <div>
              <Label>Promessa Principal</Label>
              <TA
                value={form.mainPromise}
                onChange={(e) => set("mainPromise", e.target.value)}
                placeholder="ex: Emagreça 8kg em 21 dias sem cortar carboidratos e sem academia..."
                rows={2}
              />
            </div>
            <div>
              <Label>Dores e Frustrações (uma por linha)</Label>
              <TA
                value={form.painPoints}
                onChange={(e) => set("painPoints", e.target.value)}
                placeholder={"Já tentou várias dietas e sempre engorda de volta\nNão tem tempo para academia\nSente culpa ao comer..."}
                rows={4}
              />
            </div>
            <div>
              <Label>Benefícios Principais (um por linha)</Label>
              <TA
                value={form.benefits}
                onChange={(e) => set("benefits", e.target.value)}
                placeholder={"Cardápio completo de 21 dias\nLista de compras pronta\nReceitas práticas de 20 minutos..."}
                rows={4}
              />
            </div>
            <div>
              <Label>Tom de Voz</Label>
              <select
                value={form.toneOfVoice}
                onChange={(e) => set("toneOfVoice", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground"
              >
                {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </Section>

          {/* oferta */}
          <Section title="Oferta & Preço" icon={Zap}>
            <div>
              <Label>Preço / Condições</Label>
              <Input
                value={form.pricePoint}
                onChange={(e) => set("pricePoint", e.target.value)}
                placeholder="ex: R$97 ou 12x R$9,70 — de R$297 por apenas R$97"
                className="bg-transparent border-white/10"
              />
            </div>
            <div>
              <Label>Bônus (um por linha)</Label>
              <TA
                value={form.bonuses}
                onChange={(e) => set("bonuses", e.target.value)}
                placeholder={"Bônus 1: Planilha de Controle (valor R$47)\nBônus 2: Acesso à Comunidade VIP (valor R$97)"}
                rows={3}
              />
            </div>
            <div>
              <Label>Garantia</Label>
              <Input
                value={form.guarantee}
                onChange={(e) => set("guarantee", e.target.value)}
                placeholder="ex: 30 dias de garantia incondicional ou dinheiro de volta"
                className="bg-transparent border-white/10"
              />
            </div>
            <div>
              <Label>Texto do Botão CTA</Label>
              <Input
                value={form.callToAction}
                onChange={(e) => set("callToAction", e.target.value)}
                placeholder="ex: Quero Começar Agora, Garantir Meu Acesso..."
                className="bg-transparent border-white/10"
              />
            </div>
            <div>
              <Label>Objetivo da Página</Label>
              <Input
                value={form.pageGoal}
                onChange={(e) => set("pageGoal", e.target.value)}
                placeholder="ex: venda direta, captura de lead, agendamento..."
                className="bg-transparent border-white/10"
              />
            </div>
          </Section>

          {/* avançado */}
          <Section title="Avançado" icon={Globe} defaultOpen={false}>
            <div>
              <Label>Fonte de Tráfego</Label>
              <select
                value={form.trafficSource}
                onChange={(e) => set("trafficSource", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Selecionar...</option>
                {TRAFFIC_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Contexto do Radar / Pesquisa de Mercado</Label>
              <TA
                value={form.mineracaoContext}
                onChange={(e) => set("mineracaoContext", e.target.value)}
                placeholder="Cole aqui dados do Radar TikTok, YouTube, Google ou Radar Produtos para enriquecer o copy..."
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                Dados de mineração ajudam a IA a criar copy mais específico e relevante.
              </p>
            </div>
          </Section>

          {/* generate button */}
          <Button
            className="w-full h-12 text-sm font-bold text-white gap-2"
            style={{
              background: generating ? "rgba(10,108,255,0.5)" : `linear-gradient(135deg, ${ACCENT}, #3BA3FF)`,
              boxShadow: generating ? "none" : "0 0 30px rgba(10,108,255,0.4)",
            }}
            disabled={generating || !form.productName.trim()}
            onClick={handleGenerate}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Gerando Página com IA...</>
            ) : (
              <><Sparkles className="h-4 w-4" />Gerar Página Completa com IA</>
            )}
          </Button>

          {generatedHtml && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-xs text-green-400 flex items-center gap-2">
              <Check className="h-3 w-3 shrink-0" />
              Página gerada! {estimateWordCount(generatedHtml).toLocaleString()} palavras de copy.
            </div>
          )}
        </div>

        {/* preview panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A10]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">Preview</span>
            {generatedHtml && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => setPreviewScale((v) => !v)}
              >
                {previewScale ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {previewScale ? "Tamanho real" : "Ajustar à tela"}
              </button>
            )}
          </div>

          {!generatedHtml ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 px-8">
              <LayoutTemplate className="h-12 w-12 opacity-15" style={{ color: ACCENT }} />
              <div className="text-center">
                <p className="text-sm font-medium">Preview da página aparecerá aqui</p>
                <p className="text-xs opacity-60 mt-1">Preencha os dados e clique em "Gerar Página"</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-xs w-full mt-2">
                {PAGE_SKILLS.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    className="rounded-lg border border-white/8 bg-white/2 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-white/15 transition-colors text-left"
                    onClick={() => set("skillId", s.id)}
                  >
                    <span className={`block font-medium ${form.skillId === s.id ? "text-foreground" : ""}`}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden relative">
              <iframe
                ref={iframeRef}
                srcDoc={getSrcDoc(generatedHtml)}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0"
                style={previewScale ? { transform: "scale(0.65)", transformOrigin: "top left", width: "153.8%", height: "153.8%" } : {}}
                title="Page Preview"
              />
            </div>
          )}
        </div>
      </div>

      {/* SAVE MODAL */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Salvar Projeto</h3>
                <button onClick={() => setShowSaveModal(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div>
                <Label>Nome do projeto</Label>
                <Input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="ex: Landing Page Dieta 21 Dias"
                  className="bg-transparent border-white/10"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10" onClick={() => setShowSaveModal(false)}>Cancelar</Button>
                <Button
                  className="flex-1 text-white"
                  style={{ background: ACCENT }}
                  disabled={saving || !saveTitle.trim()}
                  onClick={handleSave}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROJECTS PANEL */}
      <AnimatePresence>
        {showProjects && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowProjects(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-semibold">Projetos Salvos</h3>
                <button onClick={() => setShowProjects(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum projeto salvo ainda.</p>
                ) : (
                  projects.map((p) => {
                    const skill = PAGE_SKILLS.find((s) => s.id === p.skill_id);
                    const ds = DESIGN_SYSTEMS.find((d) => d.id === p.design_system_id);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-white/15 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {skill?.name} · {ds?.name} · {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-white/10" onClick={() => handleLoadProject(p.id)}>
                            Abrir
                          </Button>
                          <button className="p-1.5 text-muted-foreground/40 hover:text-red-400" onClick={() => handleDeleteProject(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TEMPLATES MODAL */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-semibold">Escolher Template</h3>
                <button onClick={() => setShowTemplates(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAGE_TEMPLATES.map((tpl) => {
                  const skill = PAGE_SKILLS.find((s) => s.id === tpl.defaults.skillId);
                  const ds = DESIGN_SYSTEMS.find((d) => d.id === tpl.defaults.designSystemId);
                  return (
                    <button
                      key={tpl.id}
                      className="text-left p-4 rounded-xl border border-white/8 hover:border-white/20 bg-white/2 hover:bg-white/4 transition-all"
                      onClick={() => applyTemplate(tpl.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{tpl.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                          <div className="flex gap-1.5 mt-2">
                            {skill && <span className="rounded px-1.5 py-0.5 text-[10px] bg-white/5 text-muted-foreground">{skill.name}</span>}
                            {ds && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 bg-white/5 text-muted-foreground">
                                <span className="w-2 h-2 rounded-full" style={{ background: ds.accentColor }} />
                                {ds.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IMPORT MODAL */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowImportModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {showImportModal === "produto" ? "Importar Produto Minerado" : "Importar Anúncio Minerado"}
                </h3>
                <button onClick={() => setShowImportModal(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <p className="text-sm text-muted-foreground">
                Cole abaixo os dados do{" "}
                {showImportModal === "produto" ? "Radar Produtos" : "Radar TikTok/Instagram/YouTube"}{" "}
                (título, nicho, benefícios, etc.) para enriquecer o copy da página.
              </p>
              <TA
                value={form.mineracaoContext}
                onChange={(e) => set("mineracaoContext", e.target.value)}
                placeholder={
                  showImportModal === "produto"
                    ? "Produto: Suplemento XYZ\nCategoria: Fitness\nVendidos: 15.000\nAvaliação: 4.8/5\nBenefícios principais: ..."
                    : "Vídeo: [título]\nViews: 2.3M\nHook: ...\nDescrição: ..."
                }
                rows={6}
              />
              <Button
                className="w-full text-white"
                style={{ background: ACCENT }}
                onClick={() => setShowImportModal(null)}
              >
                Usar este Contexto
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
