import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { generateStoryCoverFn } from "@/lib/storybook.functions";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Star, FileUp, Sparkles, ChevronRight, X,
  Languages, Image, FileText, Bell, Search, Plus, Clock,
  CheckCircle2, ArrowRight, Upload, Wand2, PenLine,
  MoreHorizontal, ExternalLink, Quote, TrendingUp,
  Download, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeKey = "superacao" | "infantil" | "pdf" | "zero";

interface Mode {
  key: ModeKey;
  title: string;
  subtitle: string;
  description: string;
  result: string;
  color: string;
  bgLight: string;
  textColor: string;
  icon: React.ReactNode;
  image: string;
  steps: string[];
  fields: Field[];
  badge: string;
}

interface Field {
  label: string;
  type: "text" | "textarea" | "select" | "file";
  placeholder?: string;
  options?: string[];
}

type StoryRow = {
  id: string;
  title: string;
  niche: string | null;
  status: string;
  step: number;
  updated_at: string;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODES: Mode[] = [
  {
    key: "superacao",
    title: "Minha História de Superação",
    subtitle: "Biografia inspiradora",
    description: "Transforme sua trajetória real em um livro emocionante com capítulos, imagens e exportação profissional em PDF.",
    result: "Livro PDF · Capítulos · Fotos",
    color: "#E8623A", bgLight: "rgba(232,98,58,0.12)", textColor: "#FFB89A",
    icon: <Star size={28} />,
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800",
    badge: "Biografia",
    steps: ["Conte sua história", "Configure estilo e idioma", "Gere capítulos com IA", "Adicione imagens pessoais", "Exporte em PDF"],
    fields: [
      { label: "Seu nome", type: "text", placeholder: "Ex: Maria Silva" },
      { label: "Resumo da sua história", type: "textarea", placeholder: "Conte brevemente sua jornada, desafios e conquistas..." },
      { label: "Número de capítulos", type: "select", options: ["5 capítulos", "8 capítulos", "10 capítulos", "12 capítulos"] },
      { label: "Idioma", type: "select", options: ["Português", "Inglês", "Espanhol", "Francês", "Alemão"] },
      { label: "Tom da narrativa", type: "select", options: ["Inspirador e emocional", "Reflexivo e profundo", "Direto e motivacional"] },
    ],
  },
  {
    key: "infantil",
    title: "História Infantil Ilustrada",
    subtitle: "Livro para crianças",
    description: "Crie histórias infantis com personagens únicos, moral educativa, ilustrações geradas por IA e layout de livro.",
    result: "Livro PDF · Ilustrações · Tradução",
    color: "#3D9E6E", bgLight: "rgba(61,158,110,0.12)", textColor: "#7EDCAC",
    icon: <BookOpen size={28} />,
    image: "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800",
    badge: "Infantil",
    steps: ["Defina personagem e moral", "Configure faixa etária", "Gere texto com IA", "Gere ilustrações por página", "Exporte como livro PDF"],
    fields: [
      { label: "Nome do personagem principal", type: "text", placeholder: "Ex: Luna, o Robô Curioso" },
      { label: "Moral da história", type: "select", options: ["Amizade e companheirismo", "Coragem e superação", "Respeito e empatia", "Criatividade e imaginação", "Honestidade"] },
      { label: "Faixa etária", type: "select", options: ["3–5 anos", "6–8 anos", "9–12 anos"] },
      { label: "Número de páginas", type: "select", options: ["8 páginas", "12 páginas", "16 páginas", "24 páginas"] },
      { label: "Estilo visual das ilustrações", type: "select", options: ["Aquarela suave", "3D estilo Pixar", "Desenho fofo (kawaii)", "Livro clássico ilustrado"] },
      { label: "Idioma", type: "select", options: ["Português", "Inglês", "Espanhol", "Francês"] },
    ],
  },
  {
    key: "pdf",
    title: "Importar PDF",
    subtitle: "Transformar documento",
    description: "Envie um PDF e deixe a IA transformar o conteúdo em história organizada, ebook profissional ou livro traduzido.",
    result: "Ebook · Tradução · Reformatação",
    color: "#4A6FC4", bgLight: "rgba(74,111,196,0.12)", textColor: "#93B4F0",
    icon: <FileUp size={28} />,
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800",
    badge: "PDF → Livro",
    steps: ["Envie o PDF", "IA extrai e analisa o conteúdo", "Escolha o formato de saída", "Configure idioma e estilo", "Exporte o resultado"],
    fields: [
      { label: "Arquivo PDF", type: "file" },
      { label: "O que deseja fazer com o PDF?", type: "select", options: ["Transformar em história narrativa", "Criar livro infantil adaptado", "Gerar ebook profissional", "Traduzir e reformatar", "Reescrever com emoção"] },
      { label: "Idioma de saída", type: "select", options: ["Português", "Inglês", "Espanhol", "Francês", "Alemão", "Italiano"] },
      { label: "Gerar ilustrações automáticas", type: "select", options: ["Sim, gerar imagens por capítulo", "Não, apenas texto"] },
    ],
  },
  {
    key: "zero",
    title: "Criar do Zero",
    subtitle: "Projeto personalizado",
    description: "Monte uma história completamente personalizada com a ajuda da IA. Você define tudo: gênero, personagens, tom e idioma.",
    result: "Livro completo · Qualquer gênero",
    color: "#8B5CF6", bgLight: "rgba(139,92,246,0.12)", textColor: "#C4A8FF",
    icon: <Sparkles size={28} />,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    badge: "Livre",
    steps: ["Defina título e gênero", "Configure personagens", "Escolha tom e público", "Gere estrutura com IA", "Revise e exporte"],
    fields: [
      { label: "Título da história", type: "text", placeholder: "Ex: A Última Estrela do Norte" },
      { label: "Gênero literário", type: "select", options: ["Romance", "Fantasia", "Ficção científica", "Suspense", "Aventura", "Drama", "Conto infantil", "Biografia"] },
      { label: "Público-alvo", type: "select", options: ["Crianças (3–8 anos)", "Jovens (9–14 anos)", "Adultos jovens (15–25)", "Adultos (25+)"] },
      { label: "Número de capítulos", type: "select", options: ["5 capítulos", "10 capítulos", "15 capítulos", "20 capítulos", "30 capítulos"] },
      { label: "Tom da narrativa", type: "select", options: ["Cinematográfico", "Poético", "Direto e ágil", "Humorístico", "Sombrio e intenso"] },
      { label: "Idioma", type: "select", options: ["Português", "Inglês", "Espanhol", "Francês", "Alemão"] },
      { label: "Sinopse ou ideia inicial", type: "textarea", placeholder: "Descreva brevemente a ideia da sua história..." },
    ],
  },
];

const TESTIMONIALS = [
  { name: "Ana Paula Ferreira", city: "São Paulo, Brasil", text: "Criei o livro da minha filha em menos de 2 horas. Ela chorou de emoção quando viu a história com o nome dela.", mode: "Infantil", color: "#3D9E6E", initials: "AP" },
  { name: "Marcos Oliveira", city: "Lisboa, Portugal", text: "Transformei 20 anos de jornada empreendedora em um livro profissional. Presenteei minha equipe no aniversário da empresa.", mode: "Superação", color: "#E8623A", initials: "MO" },
  { name: "Juliana Costa", city: "Paris, França", text: "Importei meu TCC e a IA transformou em um ebook elegante em inglês e francês. Incrível como ficou profissional.", mode: "PDF → Livro", color: "#4A6FC4", initials: "JC" },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800;9..144,900&family=Outfit:wght@400;500;600;700&display=swap');

  .sb-mode-card {
    cursor: pointer;
    transition: transform 150ms ease, box-shadow 200ms ease, border-color 200ms ease;
  }
  .sb-mode-card.superacao:hover { box-shadow: 0 8px 32px rgba(232,98,58,0.22); border-color: rgba(232,98,58,0.45) !important; transform: translateY(-3px); }
  .sb-mode-card.infantil:hover  { box-shadow: 0 8px 32px rgba(61,158,110,0.22); border-color: rgba(61,158,110,0.45) !important; transform: translateY(-3px); }
  .sb-mode-card.pdf:hover       { box-shadow: 0 8px 32px rgba(74,111,196,0.22); border-color: rgba(74,111,196,0.45) !important; transform: translateY(-3px); }
  .sb-mode-card.zero:hover      { box-shadow: 0 8px 32px rgba(139,92,246,0.22); border-color: rgba(139,92,246,0.45) !important; transform: translateY(-3px); }

  .sb-panel-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(4px);
    z-index: 40;
    animation: sbFadeIn 200ms ease;
  }
  .sb-panel-drawer {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 100%; max-width: 480px;
    background: #080D1A;
    border-left: 1px solid #1E2D4A;
    overflow-y: auto; z-index: 50;
    animation: sbSlideIn 260ms cubic-bezier(0.23,1,0.32,1);
  }
  @media (max-width: 640px) { .sb-panel-drawer { max-width: 100%; } }

  .sb-tag-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 999px;
    font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 600;
  }
  .sb-project-card {
    background: #0D1526; border: 1px solid #1E2D4A; border-radius: 12px;
    padding: 18px; width: 100%; text-align: left;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    display: block; text-decoration: none;
  }
  .sb-project-card:hover { border-color: rgba(255,255,255,0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }

  .sb-step-badge {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; color: white;
  }

  @keyframes sbFadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes sbSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
  @keyframes sbCardIn  { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
  .sb-card-animate { animation: sbCardIn 380ms cubic-bezier(0.23,1,0.32,1) both; }
`;

// ─── buildPlanning ────────────────────────────────────────────────────────────

function buildPlanning(
  mode: Mode,
  textValues: Record<string, string>,
  selectValues: Record<string, string>,
): Record<string, unknown> {
  const v = { ...textValues, ...selectValues };
  const langMap: Record<string, string> = {
    "Inglês": "English", "Espanhol": "Español",
    "Francês": "Français", "Alemão": "Deutsch", "Italiano": "Italiano",
  };
  const lang = langMap[v["Idioma"] ?? v["Idioma de saída"] ?? ""] ?? "Português";
  const chapRaw = v["Número de capítulos"] ?? v["Número de páginas"] ?? "10";
  const chapters = Math.max(5, parseInt(chapRaw.replace(/\D/g, "")) || 10);

  if (mode.key === "superacao") return {
    title: v["Seu nome"] ? `Minha História: ${v["Seu nome"]}` : "Minha História de Superação",
    subtitle: (v["Resumo da sua história"] ?? "").slice(0, 120),
    type: "romance-ceo", subniche: "inspiracao",
    audience: "Adultos 25+", language: lang, chapters,
    ending: "feliz", intensity: "moderada", hotLevel: "sem-picancia",
    tone: "cinematografico", author: v["Seu nome"] ?? "",
  };

  if (mode.key === "infantil") return {
    title: v["Nome do personagem principal"] ?? "História Infantil",
    subtitle: `Moral: ${v["Moral da história"] ?? "Amizade e companheirismo"}`,
    type: "romance-ceo", subniche: "infantil",
    audience: v["Faixa etária"] ?? "6–8 anos", language: lang,
    chapters: Math.max(5, Math.floor(chapters / 2)),
    ending: "feliz", intensity: "suave", hotLevel: "sem-picancia",
    tone: "poetico", author: "",
  };

  if (mode.key === "zero") return {
    title: v["Título da história"] ?? "Minha História",
    subtitle: (v["Sinopse ou ideia inicial"] ?? "").slice(0, 120),
    type: "romance-ceo", subniche: "",
    audience: v["Público-alvo"] ?? "Adultos 25+", language: lang, chapters,
    ending: "feliz", intensity: "intensa", hotLevel: "sensual",
    tone: "cinematografico", author: "",
  };

  return {
    title: "Projeto PDF",
    subtitle: v["O que deseja fazer com o PDF?"] ?? "Transformar em história narrativa",
    type: "romance-ceo", subniche: "",
    audience: "Adultos", language: lang, chapters: 10,
    ending: "feliz", intensity: "moderada", hotLevel: "sem-picancia",
    tone: "cinematografico", author: "",
  };
}

// ─── ModeCard ─────────────────────────────────────────────────────────────────

function ModeCard({ mode, onClick, index }: { mode: Mode; onClick: () => void; index: number }) {
  return (
    <button
      onClick={onClick}
      className={`sb-mode-card sb-card-animate ${mode.key}`}
      style={{
        animationDelay: `${index * 60}ms`, padding: 0,
        border: "1px solid #1E2D4A", borderRadius: 12,
        background: "#0D1526", overflow: "hidden",
        textAlign: "left", width: "100%",
      }}
    >
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <img
          src={mode.image} alt={mode.title}
          className="w-full h-full object-cover"
          style={{ objectPosition: mode.key === "superacao" ? "center 15%" : "center center" }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%)" }} />
        <span className="sb-tag-pill absolute top-3 left-3"
          style={{ background: mode.bgLight, color: mode.textColor, backdropFilter: "blur(4px)" }}>
          {mode.badge}
        </span>
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <CheckCircle2 size={11} color="white" />
          <span style={{ color: "white", fontSize: 11, fontFamily: "Outfit, sans-serif", fontWeight: 500 }}>
            {mode.steps.length} etapas
          </span>
        </div>
      </div>
      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: "#F0F4FF", lineHeight: 1.3, marginBottom: 6 }}>
          {mode.title}
        </h3>
        <p style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, color: "#6B7FA8", lineHeight: 1.5, marginBottom: 12 }}>
          {mode.description}
        </p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
          style={{ background: mode.bgLight, border: `1px solid ${mode.color}22` }}>
          <TrendingUp size={10} color={mode.textColor} />
          <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 10.5, color: mode.textColor, fontWeight: 600 }}>
            {mode.result}
          </span>
        </div>
        <div className="flex items-center gap-1.5"
          style={{ color: mode.color, fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600 }}>
          Começar agora <ArrowRight size={14} />
        </div>
      </div>
    </button>
  );
}

// ─── ModePanel ────────────────────────────────────────────────────────────────

function ModePanel({ mode, onClose, onCreate }: {
  mode: Mode;
  onClose: () => void;
  onCreate: (planning: Record<string, unknown>) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateCoverFn = useServerFn(generateStoryCoverFn);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      const title = Object.values(textValues)[0] || mode.title;
      const prompt = `Professional book cover for "${title}", ${mode.subtitle}, dramatic cinematic lighting, high quality digital illustration, bold serif typography, vertical format 2:3`;
      const { url } = await generateCoverFn({ data: { prompt } });
      setCoverImageUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleFinal = async () => {
    setBusy(true);
    try {
      await onCreate({ ...buildPlanning(mode, textValues, selectValues), coverImageUrl });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar história");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sb-panel-overlay" onClick={onClose} />
      <div className="sb-panel-drawer">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "#080D1A", borderColor: "#1E2D4A" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 36, height: 36, background: mode.bgLight, color: mode.color }}>
              {mode.icon}
            </div>
            <div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: "#F0F4FF" }}>
                {mode.title}
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#6B7FA8" }}>
                {mode.subtitle}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ width: 32, height: 32, flexShrink: 0 }}>
            <X size={18} color="#6B7FA8" />
          </button>
        </div>

        <div className="px-6 py-4 border-b" style={{ borderColor: "#1E2D4A" }}>
          <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#6B7FA8" }}>
            Etapa {step + 1} de {mode.steps.length}
          </span>
          <div className="flex gap-1.5 mt-2">
            {mode.steps.map((_, i) => (
              <div key={i} className="flex-1 rounded-full transition-all duration-300"
                style={{ height: 4, background: i <= step ? mode.color : "#1E2D4A" }} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="sb-step-badge" style={{ background: mode.color }}>{step + 1}</span>
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 500, color: "#F0F4FF" }}>
              {mode.steps[step]}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {mode.fields.map((field, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600, color: "#C8D4F0" }}>
                {field.label}
              </label>
              {field.type === "text" && (
                <input
                  type="text" placeholder={field.placeholder}
                  value={textValues[field.label] ?? ""}
                  onChange={(e) => setTextValues(p => ({ ...p, [field.label]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border outline-none transition-all"
                  style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, borderColor: "#1E2D4A", background: "#111827", color: "#E8EDF8" }}
                  onFocus={(e) => (e.target.style.borderColor = mode.color)}
                  onBlur={(e) => (e.target.style.borderColor = "#1E2D4A")}
                />
              )}
              {field.type === "textarea" && (
                <textarea
                  placeholder={field.placeholder} rows={4}
                  value={textValues[field.label] ?? ""}
                  onChange={(e) => setTextValues(p => ({ ...p, [field.label]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border outline-none transition-all resize-none"
                  style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, borderColor: "#1E2D4A", background: "#111827", color: "#E8EDF8" }}
                  onFocus={(e) => (e.target.style.borderColor = mode.color)}
                  onBlur={(e) => (e.target.style.borderColor = "#1E2D4A")}
                />
              )}
              {field.type === "select" && (
                <Select
                  value={selectValues[field.label] || ""}
                  onValueChange={(val) => setSelectValues(p => ({ ...p, [field.label]: val }))}>
                  <SelectTrigger className="w-full"
                    style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, borderColor: "#1E2D4A", background: "#111827", color: selectValues[field.label] ? "#E8EDF8" : "#6B7FA8", height: 42 }}>
                    <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0D1526", border: "1px solid #1E2D4A", fontFamily: "Outfit, sans-serif" }}>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt} style={{ color: "#E8EDF8", fontSize: 14 }}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === "file" && (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-8 px-4 transition-colors cursor-pointer hover:bg-white/5"
                  style={{ borderColor: "#243352" }}
                  onClick={() => toast.info("Upload de PDF em breve")}>
                  <div className="flex items-center justify-center rounded-full"
                    style={{ width: 48, height: 48, background: mode.bgLight }}>
                    <Upload size={22} color={mode.color} />
                  </div>
                  <div className="text-center">
                    <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, fontWeight: 600, color: "#C8D4F0" }}>
                      Clique para enviar o PDF
                    </div>
                    <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#6B7FA8", marginTop: 2 }}>
                      Até 50 MB · PDF, DOCX
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Image picker */}
          <div className="flex flex-col gap-2">
            <label style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600, color: "#C8D4F0" }}>
              Imagem de capa{" "}
              <span style={{ color: "#6B7FA8", fontWeight: 400 }}>(opcional)</span>
            </label>
            {coverImageUrl ? (
              <div className="relative rounded-xl overflow-hidden" style={{ height: 120 }}>
                <img src={coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
                <button
                  onClick={() => setCoverImageUrl("")}
                  className="absolute top-2 right-2 flex items-center justify-center rounded-full hover:bg-black/60 transition-colors"
                  style={{ background: "rgba(0,0,0,0.6)", width: 24, height: 24 }}>
                  <X size={13} color="white" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 px-3 cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: "#243352" }}>
                  <Upload size={18} color={mode.color} />
                  <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#9BAAC8" }}>Upload</span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <button
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 px-3 hover:bg-white/5 transition-colors disabled:opacity-50"
                  style={{ borderColor: mode.color + "44" }}>
                  {generatingImage
                    ? <Loader2 size={18} color={mode.color} className="animate-spin" />
                    : <Wand2 size={18} color={mode.color} />}
                  <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: mode.textColor }}>
                    {generatingImage ? "Gerando…" : "Gerar com IA"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl p-4 mt-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1E2D4A" }}>
            <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 700, color: mode.color, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>
              O que será gerado
            </div>
            <div className="flex flex-col gap-2">
              {[
                { icon: <FileText size={13} />, label: "Texto completo por capítulo" },
                { icon: <Image size={13} />, label: "Ilustrações geradas por IA" },
                { icon: <Languages size={13} />, label: "Tradução para qualquer idioma" },
                { icon: <Download size={13} />, label: "Exportação em PDF profissional" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span style={{ color: mode.color }}>{item.icon}</span>
                  <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, color: "#9BAAC8" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3D9E6E", flexShrink: 0 }} />
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 11.5, color: "#6B7FA8" }}>
              Seus dados são privados e protegidos. Nunca compartilhamos seu conteúdo.
            </span>
          </div>
        </div>

        <div className="sticky bottom-0 px-6 py-4 border-t flex gap-3"
          style={{ background: "#080D1A", borderColor: "#1E2D4A" }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-lg border font-semibold transition-all hover:bg-white/5"
              style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, borderColor: "#1E2D4A", color: "#6B7FA8" }}>
              Voltar
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => { step < mode.steps.length - 1 ? setStep(s => s + 1) : handleFinal(); }}
            className="flex-1 py-2.5 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, background: `linear-gradient(135deg, ${mode.color}, ${mode.color}CC)`, boxShadow: `0 4px 20px ${mode.color}40` }}>
            {busy
              ? <><Loader2 size={16} className="animate-spin" /> Criando…</>
              : step < mode.steps.length - 1
                ? <>Próxima etapa <ChevronRight size={16} /></>
                : <><Wand2 size={16} /> Gerar com IA · ~2 min</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── RecentProjects ───────────────────────────────────────────────────────────

const STEP_COLORS = ["#E8623A", "#3D9E6E", "#4A6FC4", "#8B5CF6"];

function RecentProjects({ rows }: { rows: StoryRow[] }) {
  const display = rows.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: "#F0F4FF" }}>
          Meus Projetos
        </h2>
        <button onClick={() => toast.info("Funcionalidade em breve")}
          className="flex items-center gap-1.5 transition-colors hover:opacity-70"
          style={{ fontFamily: "Outfit, sans-serif", color: "#6B7FA8", fontSize: 13 }}>
          Ver todos <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {display.map((r, i) => {
          const color = STEP_COLORS[i % STEP_COLORS.length];
          return (
            <Link key={r.id} to="/storybook/$id" params={{ id: r.id }}>
              <div className="sb-project-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center rounded-lg"
                    style={{ width: 36, height: 36, background: color + "18" }}>
                    <BookOpen size={16} color={color} />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); toast.info("Opções do projeto"); }}
                    className="rounded-lg p-1 hover:bg-white/10 transition-colors">
                    <MoreHorizontal size={16} color="#9090A0" />
                  </button>
                </div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: "#F0F4FF", marginBottom: 4 }}>
                  {r.title}
                </div>
                <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#6B7FA8", marginBottom: 12 }}>
                  {r.niche ?? "—"}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} color="#9090A0" />
                    <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#6B7FA8" }}>
                      Etapa {r.step}/8
                    </span>
                  </div>
                  <span className="sb-tag-pill"
                    style={{ background: r.status === "done" ? "rgba(61,158,110,0.15)" : "rgba(232,98,58,0.15)", color: r.status === "done" ? "#7EDCAC" : "#FFB89A" }}>
                    {r.status === "done" ? <CheckCircle2 size={10} /> : <PenLine size={10} />}
                    {r.status === "done" ? "Concluído" : "Em edição"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 px-3 py-2 rounded-lg justify-center"
                  style={{ background: color + "15", color, fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 600 }}>
                  <BookOpen size={13} /> Abrir livro <ExternalLink size={11} />
                </div>
              </div>
            </Link>
          );
        })}

        <button
          onClick={() => document.getElementById("sb-mode-section")?.scrollIntoView({ behavior: "smooth" })}
          className="sb-project-card flex flex-col items-center justify-center gap-3"
          style={{ minHeight: 160, borderStyle: "dashed" }}>
          <div className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "rgba(74,111,196,0.15)", border: "1px solid rgba(74,111,196,0.3)" }}>
            <Plus size={18} color="#4A6FC4" />
          </div>
          <div className="text-center">
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, color: "#6B7FA8", fontWeight: 500, display: "block" }}>
              Novo projeto
            </span>
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 11, color: "#4A6FC4", marginTop: 2, display: "block" }}>
              Escolha um modo abaixo
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: "#F0F4FF", marginBottom: 2 }}>
            O que dizem nossos autores
          </h2>
          <p style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, color: "#6B7FA8" }}>
            Histórias reais criadas com o StoryBook Studio AI
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          {(["2.400+", "12", "4.8★"] as const).map((n, i) => (
            <div key={n} className="text-right">
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: i === 2 ? "#C9A84C" : "#F0F4FF" }}>{n}</div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 11, color: "#6B7FA8" }}>
                {["histórias criadas", "idiomas", "satisfação"][i]}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <div key={t.name} className="rounded-xl p-5 flex flex-col gap-4 sb-card-animate"
            style={{ background: "#0D1526", border: "1px solid #1E2D4A", animationDelay: `${i * 80}ms` }}>
            <Quote size={18} color={t.color} style={{ opacity: 0.6 }} />
            <p style={{ fontFamily: "Outfit, sans-serif", fontSize: 13.5, color: "#C8D4F0", lineHeight: 1.6, flex: 1, fontStyle: "italic" }}>
              "{t.text}"
            </p>
            <div className="flex items-center gap-3">
              <div className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: 34, height: 34, background: t.color + "30", border: `1.5px solid ${t.color}50`, color: t.color, fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 700 }}>
                {t.initials}
              </div>
              <div>
                <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>{t.name}</div>
                <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 11, color: "#6B7FA8" }}>{t.city}</div>
              </div>
              <span className="ml-auto sb-tag-pill" style={{ background: t.color + "15", color: t.color }}>{t.mode}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── StorybookHome ────────────────────────────────────────────────────────────

export default function StorybookHome({
  onCreateStory,
  rows = [],
  preset,
}: {
  onCreateStory?: (planning: Record<string, unknown>) => Promise<void>;
  rows?: StoryRow[];
  preset?: string;
}) {
  const [activeMode, setActiveMode] = useState<Mode | null>(null);

  useEffect(() => {
    if (!preset) return;
    setActiveMode(MODES.find(m => m.key === "zero") ?? null);
  }, [preset]);

  async function handleCreate(planning: Record<string, unknown>) {
    if (onCreateStory) {
      await onCreateStory(planning);
      setActiveMode(null);
    } else {
      toast.success("História criada com sucesso!");
      setActiveMode(null);
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ background: "#0A0F1E", minHeight: "100vh" }}>

        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b"
          style={{ background: "#080D1A", borderColor: "#1E2D4A" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen size={20} color="#E8623A" />
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: "#F0F4FF" }}>
                StoryBook Studio
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ borderColor: "#1E2D4A", background: "#0D1526", minWidth: 220 }}>
              <Search size={14} color="#9090A0" />
              <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, color: "#B0B0C0" }}>
                Buscar projetos...
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.info("Notificações em breve")}
              className="relative flex items-center justify-center rounded-lg p-2 hover:bg-white/10 transition-colors">
              <Bell size={18} color="#6B7FA8" />
              <span className="absolute top-1.5 right-1.5 rounded-full"
                style={{ width: 6, height: 6, background: "#E8623A" }} />
            </button>
            <button
              onClick={() => document.getElementById("sb-mode-section")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#E8623A", fontFamily: "Outfit, sans-serif", fontSize: 13 }}>
              <Plus size={15} />
              <span className="hidden sm:inline">Novo projeto</span>
            </button>
          </div>
        </header>

        <div className="px-6 py-8 max-w-5xl mx-auto w-full">

          <section className="mb-10">
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 320, background: "#050A14" }}>
              <img
                src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200" alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, rgba(5,10,20,0.88) 0%, rgba(5,10,20,0.70) 45%, rgba(5,10,20,0.15) 75%, transparent 100%)" }} />
              <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12" style={{ maxWidth: 520 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 self-start"
                  style={{ background: "rgba(232,98,58,0.2)", border: "1px solid rgba(232,98,58,0.4)" }}>
                  <Sparkles size={12} color="#E8623A" />
                  <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 11, fontWeight: 700, color: "#E8623A", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    AI-Powered Story Creation
                  </span>
                </div>
                <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 800, color: "#F0F4FF", lineHeight: 1.15, marginBottom: 12 }}>
                  Crie histórias que<br />
                  <span style={{ color: "#E8623A" }}>emocionam</span> e inspiram
                </h1>
                <p style={{ fontFamily: "Outfit, sans-serif", fontSize: 14.5, color: "rgba(240,244,255,0.75)", lineHeight: 1.6, marginBottom: 24, maxWidth: 380 }}>
                  Livros infantis, biografias e ebooks gerados por IA em minutos. Exporte em PDF profissional em 12 idiomas.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => document.getElementById("sb-mode-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, background: "linear-gradient(135deg,#E8623A,#FF8A65)", boxShadow: "0 4px 20px rgba(232,98,58,0.4)" }}>
                    <Sparkles size={15} /> Criar minha primeira história
                  </button>
                  <button onClick={() => toast.info("Exemplos em breve")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all hover:bg-white/10"
                    style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, color: "rgba(240,244,255,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    Ver exemplos <ArrowRight size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-5">
                  {[["#3D9E6E", "2.400+ histórias criadas"], ["#C9A84C", "4.8★ satisfação"]].map(([bg, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: bg }} />
                      <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "rgba(240,244,255,0.55)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="mb-10">
            <RecentProjects rows={rows} />
          </div>

          <section className="mb-10" id="sb-mode-section">
            <div className="mb-5">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#F0F4FF", marginBottom: 4 }}>
                Como deseja começar?
              </h2>
              <p style={{ fontFamily: "Outfit, sans-serif", fontSize: 13.5, color: "#6B7FA8" }}>
                Escolha um dos modos abaixo para iniciar sua história
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MODES.map((mode, index) => (
                <ModeCard key={mode.key} mode={mode} index={index} onClick={() => setActiveMode(mode)} />
              ))}
            </div>
          </section>

          <Testimonials />

          <section className="mb-10">
            <div className="rounded-2xl p-6" style={{ background: "#0D1526", border: "1px solid #1E2D4A" }}>
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: "#F0F4FF", marginBottom: 20 }}>
                Como funciona
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { n: "01", label: "Escolha o modo",  desc: "Superação, infantil, PDF ou do zero",  color: "#E8623A" },
                  { n: "02", label: "Configure",        desc: "Idioma, estilo, capítulos e público", color: "#3D9E6E" },
                  { n: "03", label: "IA gera tudo",     desc: "Texto, estrutura e ilustrações",      color: "#4A6FC4" },
                  { n: "04", label: "Exporte em PDF",   desc: "Livro profissional pronto para usar", color: "#8B5CF6" },
                ].map((item) => (
                  <div key={item.n} className="flex flex-col gap-2">
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 900, color: item.color, opacity: 0.5, lineHeight: 1 }}>
                      {item.n}
                    </div>
                    <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 14, fontWeight: 600, color: "#F0F4FF" }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#6B7FA8", lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                    <div className="w-8 rounded-full mt-1" style={{ height: 2, background: item.color, opacity: 0.4 }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>

      {activeMode && (
        <ModePanel mode={activeMode} onClose={() => setActiveMode(null)} onCreate={handleCreate} />
      )}
    </>
  );
}
