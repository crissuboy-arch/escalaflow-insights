import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Image,
  LayoutTemplate,
  Printer,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/ebook-forge")({
  component: EbookForgePage,
});

type EbookType = "tutorial" | "receita" | "workbook" | "relatorio";
type Depth = "direto" | "completo" | "autoridade";
type Theme = "editorial" | "minimal" | "berkah" | "hotmart";
type CoverMode = "auto" | "upload";

type WizardData = {
  type: EbookType;
  title: string;
  subtitle: string;
  topic: string;
  author: string;
  audience: string;
  pages: number;
  depth: Depth;
  theme: Theme;
  coverMode: CoverMode;
  coverImage: string | null;
  brand: string;
  url: string;
  cta: string;
};

type Chapter = {
  number: number;
  title: string;
  objective: string;
  body: string[];
  points: string[];
  checklist: string[];
  visualLabel: string;
};

type PlaybookStep = {
  number: number;
  title: string;
  action: string;
  time: string;
  metric: string;
  visualLabel: string;
};

type GeneratedMaterial = {
  chapters: Chapter[];
  playbook: PlaybookStep[];
  words: number;
  readMinutes: number;
};

const typeOptions: Array<{ id: EbookType; label: string; desc: string }> = [
  { id: "tutorial", label: "Tutorial / Guia", desc: "Passo a passo, método e exemplos práticos" },
  { id: "receita", label: "Receitas / Gastronomia", desc: "Estrutura visual com listas e preparo" },
  { id: "workbook", label: "Workbook", desc: "Exercícios, reflexões e checklists" },
  { id: "relatorio", label: "Relatório / Report", desc: "Insights, dados e recomendações" },
];

const pageOptions = [20, 40, 60, 80, 120];

const themeOptions: Array<{ id: Theme; label: string; desc: string }> = [
  { id: "editorial", label: "Editorial Azul", desc: "EscalaFlow premium em azul/ciano" },
  { id: "minimal", label: "Minimal Clean", desc: "Mais respiro, ainda com acento azul" },
  { id: "berkah", label: "Verde Natural", desc: "Contraste suave com base EscalaFlow" },
  { id: "hotmart", label: "Infoproduto Bold", desc: "Venda direta, CTA forte e visual denso" },
];

const initialData: WizardData = {
  type: "tutorial",
  title: "",
  subtitle: "",
  topic: "",
  author: "",
  audience: "",
  pages: 60,
  depth: "completo",
  theme: "editorial",
  coverMode: "auto",
  coverImage: null,
  brand: "EscalaFlow",
  url: "",
  cta: "",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ebook-escalaflow";
}

function chapterTitles(data: WizardData) {
  const topic = data.topic || "seu tema";
  const base: Record<EbookType, string[]> = {
    tutorial: [
      "A transformação prometida",
      "O problema que trava seus resultados",
      "Fundamentos que realmente importam",
      `O método prático para ${topic}`,
      "Execução sem dispersão",
      "Ferramentas, templates e atalhos",
      "Erros comuns e como evitá-los",
      "Plano de ação de 30 dias",
      "Escala e próximos passos",
      "Conclusão: da leitura para a prática",
    ],
    receita: [
      "A proposta culinária",
      "Ingredientes e mise en place",
      "Receitas rápidas",
      "Receitas de rotina",
      "Receitas especiais",
      "Variações e substituições",
      "Cardápio semanal",
      "Finalização e apresentação",
    ],
    workbook: [
      "Como usar este workbook",
      "Diagnóstico inicial",
      "Clareza de objetivos",
      "Mapeamento de bloqueios",
      "Exercícios centrais",
      "Plano de hábitos",
      "Revisão semanal",
      "Compromisso de 30 dias",
    ],
    relatorio: [
      "Sumário executivo",
      "Contexto e metodologia",
      "Mapa do mercado",
      "Principais achados",
      "Oportunidades prioritárias",
      "Riscos e objeções",
      "Recomendações",
      "Roadmap de implementação",
    ],
  };

  const target = data.pages >= 100 ? 10 : data.pages >= 80 ? 9 : data.pages >= 60 ? 8 : data.pages >= 40 ? 7 : 5;
  return base[data.type].slice(0, target);
}

function generateMaterial(data: WizardData): GeneratedMaterial {
  const title = data.title || "Ebook Premium EscalaFlow";
  const topic = data.topic || "produto digital";
  const audience = data.audience || "empreendedores e criadores";
  const depthText = data.depth === "autoridade" ? "com profundidade estratégica" : data.depth === "completo" ? "com exemplos e aplicação" : "de forma direta";
  const titles = chapterTitles(data);

  const chapters = titles.map((chapterTitle, index): Chapter => {
    const chapterNumber = index + 1;
    return {
      number: chapterNumber,
      title: chapterTitle,
      objective: `Aplicar ${topic} ${depthText} para ${audience.toLowerCase()}.`,
      visualLabel: `Visual editorial do capítulo ${chapterNumber}`,
      body: [
        `${chapterTitle} é a etapa em que o leitor entende como transformar intenção em execução. O conteúdo foi estruturado para manter clareza, ritmo e percepção premium dentro da identidade azul/ciano da EscalaFlow.`,
        `Neste ponto, ${audience.toLowerCase()} conectam o conceito central de ${topic} com decisões práticas: o que priorizar, como medir avanço e qual ação tomar ainda hoje.`,
        `A recomendação é avançar com foco em uma única métrica por vez. Isso reduz ruído, acelera aprendizado e torna cada capítulo útil como peça de implementação, não apenas como leitura.`,
      ],
      points: [
        `Definição prática de ${chapterTitle.toLowerCase()}`,
        "Aplicação imediata no contexto do leitor",
        "Critério simples para medir progresso",
        "Erro mais comum e como corrigir rapidamente",
      ],
      checklist: [
        "Li o capítulo com um objetivo claro",
        "Escolhi uma ação para aplicar nas próximas 24 horas",
        "Registrei uma métrica de acompanhamento",
        "Separei dúvidas e próximos ajustes",
      ],
    };
  });

  const playbook = chapters.slice(0, 8).map((chapter, index): PlaybookStep => ({
    number: index + 1,
    title: `Executar: ${chapter.title}`,
    action: `Transforme o capítulo "${chapter.title}" em uma tarefa operacional. Comece pequeno, valide o resultado e documente o aprendizado antes de avançar.`,
    time: index < 2 ? "1 semana" : index < 5 ? "2 semanas" : "30 dias",
    metric: index < 3 ? "Impacto alto" : index < 6 ? "Impacto médio" : "Base de escala",
    visualLabel: `Placeholder visual da etapa ${index + 1}`,
  }));

  const wordsPerChapter = data.depth === "autoridade" ? 1050 : data.depth === "completo" ? 760 : 520;
  const words = chapters.length * wordsPerChapter;

  return {
    chapters,
    playbook,
    words,
    readMinutes: Math.max(4, Math.round(words / 220)),
  };
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCompleteHtml(data: WizardData, material: GeneratedMaterial) {
  const title = escapeHtml(data.title || "Ebook Premium EscalaFlow");
  const subtitle = escapeHtml(data.subtitle || `Um guia prático sobre ${data.topic || "produto digital"}`);
  const author = escapeHtml(data.author || data.brand || "EscalaFlow");
  const cta = escapeHtml(data.cta || data.url || "Acesse o próximo passo com a EscalaFlow");
  const coverImage = data.coverImage ? `<img class="cover-image" src="${data.coverImage}" alt="Capa do ebook" />` : `<div class="html-cover-visual"></div>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
:root{--bg:#020617;--blue:#2563eb;--cyan:#22d3ee;--ink:#0f172a;--muted:#64748b;--line:#dbeafe}
*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.7}
.page{max-width:820px;margin:0 auto 28px;background:#fff;min-height:1050px;padding:56px;box-shadow:0 18px 60px rgba(15,23,42,.12);page-break-after:always}
.cover{background:radial-gradient(circle at 80% 10%,rgba(34,211,238,.28),transparent 34%),linear-gradient(135deg,#020617,#1e3a8a 55%,#0f172a);color:#fff;display:flex;flex-direction:column;justify-content:space-between}
.eyebrow{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#93c5fd;font-weight:800}.cover h1{font-size:54px;line-height:1.02;margin:28px 0 14px;letter-spacing:-2px}.cover p{font-size:20px;color:#cbd5e1;max-width:620px}
.cover-image,.html-cover-visual{width:100%;height:260px;border-radius:18px;margin-top:34px;object-fit:cover;border:1px solid rgba(255,255,255,.22)}
.html-cover-visual{background:linear-gradient(135deg,rgba(59,130,246,.72),rgba(34,211,238,.36)),repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 1px,transparent 1px 18px)}
h2{font-size:30px;line-height:1.16;margin:0 0 18px;color:#1e3a8a}h3{font-size:16px;text-transform:uppercase;letter-spacing:2px;color:#2563eb;margin-top:28px}
.toc-row{display:flex;gap:16px;border-bottom:1px solid var(--line);padding:12px 0}.toc-num{color:#2563eb;font-weight:900;min-width:54px}.toc-title{flex:1;font-weight:700}
.visual{height:170px;border:1px solid #bfdbfe;border-radius:16px;background:linear-gradient(135deg,#dbeafe,#ecfeff);display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;font-size:12px;margin:24px 0}
.quote{border-left:5px solid var(--cyan);background:#eff6ff;padding:18px 22px;border-radius:0 12px 12px 0;color:#1e3a8a;font-weight:700}
.box{border:1px solid var(--line);background:#f8fafc;border-radius:14px;padding:20px;margin:18px 0}.box li{margin:8px 0}.cta{background:linear-gradient(135deg,#1d4ed8,#0891b2);color:#fff;border-radius:18px;padding:28px;margin-top:28px}.cta strong{display:block;font-size:24px;margin-bottom:8px}
.playbook-step{display:grid;grid-template-columns:160px 1fr;gap:20px;border:1px solid var(--line);border-radius:16px;padding:18px;margin:16px 0;background:#fff}.mini-visual{border-radius:12px;background:linear-gradient(135deg,#1e40af,#22d3ee);min-height:120px}
@media print{body{background:#fff}.page{box-shadow:none;margin:0;max-width:none;min-height:auto}.page{page-break-after:always}}
</style>
</head>
<body>
<section class="page cover">
  <div><div class="eyebrow">${escapeHtml(data.brand || "EscalaFlow")} • Ebook & Playbook Engine V3</div><h1>${title}</h1><p>${subtitle}</p>${coverImage}</div>
  <div><div class="eyebrow">Por ${author}</div><p>${escapeHtml(String(data.pages))} páginas estimadas • ${material.chapters.length} capítulos • ${material.readMinutes} min de leitura</p></div>
</section>
<section class="page"><h2>Sumário</h2>${material.chapters.map((chapter) => `<div class="toc-row"><span class="toc-num">CAP ${String(chapter.number).padStart(2, "0")}</span><span class="toc-title">${escapeHtml(chapter.title)}</span><span>${chapter.number + 2}</span></div>`).join("")}</section>
${material.chapters.map((chapter) => `<section class="page"><div class="eyebrow">Capítulo ${chapter.number}</div><h2>${escapeHtml(chapter.title)}</h2><p class="quote">${escapeHtml(chapter.objective)}</p><div class="visual">${escapeHtml(chapter.visualLabel)}</div>${chapter.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}<div class="box"><h3>Pontos-chave</h3><ul>${chapter.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div><div class="box"><h3>Checklist</h3><ul>${chapter.checklist.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div></section>`).join("")}
<section class="page"><h2>Playbook de Implementação</h2><p>Transforme o ebook em execução com um roteiro por etapa.</p>${material.playbook.map((step) => `<div class="playbook-step"><div class="mini-visual"></div><div><div class="eyebrow">Passo ${step.number} • ${escapeHtml(step.metric)}</div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.action)}</p><strong>Prazo:</strong> ${escapeHtml(step.time)}</div></div>`).join("")}<div class="cta"><strong>Próximo passo</strong>${cta}</div></section>
</body>
</html>`;
}

function VisualPlaceholder({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={compact ? "ef-visual ef-visual-compact" : "ef-visual"}>
      <Image size={compact ? 20 : 28} />
      <span>{label}</span>
    </div>
  );
}

function EbookDocument({ data, material, print = false }: { data: WizardData; material: GeneratedMaterial; print?: boolean }) {
  const title = data.title || "Ebook Premium EscalaFlow";
  const subtitle = data.subtitle || `Um guia prático sobre ${data.topic || "produto digital"}`;
  const author = data.author || data.brand || "EscalaFlow";

  return (
    <div className={print ? "ef-print-doc" : "ef-document"}>
      <section className="ef-page ef-cover-page">
        <div className="ef-cover-copy">
          <span className="ef-kicker">{data.brand || "EscalaFlow"} • Ebook & Playbook Engine V3</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {data.coverImage ? (
            <img className="ef-cover-image" src={data.coverImage} alt="Capa do ebook" />
          ) : (
            <div className="ef-cover-art">
              <LayoutTemplate size={44} />
              <span>Capa editorial azul/ciano</span>
            </div>
          )}
        </div>
        <div className="ef-cover-footer">
          <span>Por {author}</span>
          <span>{data.pages} páginas • {material.chapters.length} capítulos</span>
        </div>
      </section>

      <section className="ef-page">
        <span className="ef-kicker">Conteúdo</span>
        <h2>Sumário</h2>
        <div className="ef-toc">
          {material.chapters.map((chapter) => (
            <div className="ef-toc-row" key={chapter.number}>
              <span>CAP {String(chapter.number).padStart(2, "0")}</span>
              <strong>{chapter.title}</strong>
              <em>{chapter.number + 2}</em>
            </div>
          ))}
        </div>
      </section>

      {material.chapters.map((chapter) => (
        <section className="ef-page" key={chapter.number}>
          <span className="ef-kicker">Capítulo {chapter.number}</span>
          <h2>{chapter.title}</h2>
          <p className="ef-objective">{chapter.objective}</p>
          <VisualPlaceholder label={chapter.visualLabel} />
          {chapter.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="ef-content-grid">
            <div className="ef-note-box">
              <h3>Pontos-chave</h3>
              {chapter.points.map((point) => (
                <div className="ef-check-line" key={point}><Check size={15} />{point}</div>
              ))}
            </div>
            <div className="ef-note-box">
              <h3>Checklist</h3>
              {chapter.checklist.map((item) => (
                <div className="ef-check-line" key={item}><span className="ef-empty-check" />{item}</div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="ef-page">
        <span className="ef-kicker">Fechamento</span>
        <h2>Agora é execução</h2>
        <p>O ebook entrega clareza. O playbook transforma essa clareza em ação. Escolha a primeira etapa, defina uma métrica e execute antes de consumir mais conteúdo.</p>
        <div className="ef-cta">
          <strong>Próximo passo</strong>
          <span>{data.cta || data.url || "Use este material para lançar, capturar leads ou vender seu próximo produto digital."}</span>
        </div>
      </section>
    </div>
  );
}

function EbookForgePage() {
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"ebook" | "playbook" | "share" | "export">("ebook");
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<WizardData>(initialData);
  const [generated, setGenerated] = useState<GeneratedMaterial | null>(null);

  const previewMaterial = useMemo(() => generated ?? generateMaterial(data), [data, generated]);
  const canNext = step !== 1 || Boolean(data.title.trim() && data.topic.trim());

  const update = (patch: Partial<WizardData>) => setData((prev) => ({ ...prev, ...patch }));

  const generate = () => {
    setGenerated(generateMaterial(data));
    setStep(4);
    setActiveTab("ebook");
  };

  const handleCoverUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ coverImage: String(reader.result), coverMode: "upload" });
    reader.readAsDataURL(file);
  };

  const exportHtml = () => {
    const material = generated ?? previewMaterial;
    downloadFile(buildCompleteHtml(data, material), `${slugify(data.title)}-ebook-forge-v3.html`, "text/html;charset=utf-8");
  };

  const exportJson = () => {
    downloadFile(JSON.stringify({ metadata: data, material: generated ?? previewMaterial }, null, 2), `${slugify(data.title)}-ebook-forge-v3.json`, "application/json");
  };

  const printPdf = () => window.print();

  const shareText = `Novo ebook: ${data.title || "Ebook Premium EscalaFlow"}\n${data.subtitle || `Guia prático sobre ${data.topic || "produto digital"}`}\n\n${data.cta || data.url || "Criado com EscalaFlow Ebook Forge V3"}`;

  return (
    <div className="ef-shell">
      <div className="ef-bg" />
      <div className="ef-container ef-no-print">
        <header className="ef-header">
          <div className="ef-brand">
            <div className="ef-logo">E</div>
            <div>
              <strong>Escala<span>Flow</span></strong>
              <small>Ebook & Playbook Engine V3</small>
            </div>
          </div>
          <div className="ef-pill"><Sparkles size={14} /> Mestre dos Ebooks</div>
        </header>

        <section className="ef-hero">
          <span className="ef-kicker">Motor de Produto Digital</span>
          <h1>Crie eBooks e <span>Playbooks</span> premium dentro da plataforma</h1>
          <p>Visual inspirado no HTML premium V3, implementado como página React nativa, com exportação HTML completa e PDF via impressão do navegador.</p>
        </section>

        <nav className="ef-stepper">
          {["Tipo & Info", "Estrutura", "Capa & Design", "Resultado"].map((label, index) => {
            const n = index + 1;
            return (
              <button className={n === step ? "active" : n < step ? "done" : ""} key={label} onClick={() => (n < step || generated) && setStep(n)}>
                <span>{n < step ? <Check size={14} /> : n}</span>{label}
              </button>
            );
          })}
        </nav>

        {step === 1 ? (
          <section className="ef-card">
            <h2>Tipo e informações</h2>
            <div className="ef-option-grid">
              {typeOptions.map((option) => (
                <button className={data.type === option.id ? "selected" : ""} key={option.id} onClick={() => update({ type: option.id })}>
                  <BookOpen size={20} /><strong>{option.label}</strong><small>{option.desc}</small>
                </button>
              ))}
            </div>
            <div className="ef-form-grid">
              <label>Título<input value={data.title} onChange={(e) => update({ title: e.target.value })} placeholder="O Guia Definitivo do Marketing Digital" /></label>
              <label>Subtítulo<input value={data.subtitle} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Estratégias práticas para 2026" /></label>
              <label>Tema central<input value={data.topic} onChange={(e) => update({ topic: e.target.value })} placeholder="Funis, tráfego, vendas, IA..." /></label>
              <label>Público-alvo<input value={data.audience} onChange={(e) => update({ audience: e.target.value })} placeholder="Empreendedores iniciantes" /></label>
              <label>Autor / Marca<input value={data.author} onChange={(e) => update({ author: e.target.value })} placeholder="Seu nome ou marca" /></label>
              <label>Brand kit<input value={data.brand} onChange={(e) => update({ brand: e.target.value })} placeholder="EscalaFlow" /></label>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="ef-card">
            <h2>Estrutura</h2>
            <div className="ef-page-grid">
              {pageOptions.map((pages) => <button className={data.pages === pages ? "selected" : ""} key={pages} onClick={() => update({ pages })}><strong>{pages}</strong><small>páginas</small></button>)}
            </div>
            <div className="ef-option-grid three">
              {(["direto", "completo", "autoridade"] as Depth[]).map((depth) => (
                <button className={data.depth === depth ? "selected" : ""} key={depth} onClick={() => update({ depth })}>
                  <Target size={20} /><strong>{depth === "direto" ? "Direto" : depth === "completo" ? "Completo" : "Autoridade"}</strong>
                  <small>{depth === "direto" ? "Compacto e objetivo" : depth === "completo" ? "Rico em exemplos" : "Frameworks e profundidade"}</small>
                </button>
              ))}
            </div>
            <div className="ef-chapter-list">
              {chapterTitles(data).map((title, index) => <div key={title}><span>CAP {String(index + 1).padStart(2, "0")}</span>{title}</div>)}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="ef-card">
            <h2>Capa e design</h2>
            <div className="ef-option-grid">
              {themeOptions.map((theme) => (
                <button className={data.theme === theme.id ? "selected" : ""} key={theme.id} onClick={() => update({ theme: theme.id })}>
                  <LayoutTemplate size={20} /><strong>{theme.label}</strong><small>{theme.desc}</small>
                </button>
              ))}
            </div>
            <div className="ef-cover-tools">
              <button className={data.coverMode === "auto" ? "selected" : ""} onClick={() => update({ coverMode: "auto", coverImage: null })}><Sparkles size={18} /> Capa automática</button>
              <label className={data.coverMode === "upload" ? "selected" : ""}><Upload size={18} /> Importar capa<input type="file" accept="image/*" onChange={(e) => handleCoverUpload(e.target.files?.[0])} /></label>
            </div>
            <div className="ef-form-grid">
              <label>Site / link<input value={data.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://seusite.com" /></label>
              <label>CTA principal<input value={data.cta} onChange={(e) => update({ cta: e.target.value })} placeholder="Acesse o material completo" /></label>
            </div>
            <div className="ef-preview-frame"><EbookDocument data={data} material={previewMaterial} /></div>
          </section>
        ) : null}

        {step === 4 && generated ? (
          <section className="ef-result">
            <div className="ef-result-head">
              <div><span className="ef-kicker">Pronto</span><h2>{data.title || "Ebook Premium EscalaFlow"}</h2><p>{generated.chapters.length} capítulos • {generated.words.toLocaleString("pt-BR")} palavras • {generated.readMinutes} min</p></div>
              <button onClick={() => { setGenerated(null); setStep(1); setData(initialData); }}><ArrowLeft size={16} /> Criar novo</button>
            </div>

            <div className="ef-tabs">
              {[
                ["ebook", BookOpen, "eBook"],
                ["playbook", ClipboardList, "Playbook"],
                ["share", Copy, "Compartilhar"],
                ["export", Download, "Exportar"],
              ].map(([id, Icon, label]) => (
                <button className={activeTab === id ? "active" : ""} key={String(id)} onClick={() => setActiveTab(id as typeof activeTab)}>
                  <Icon size={15} />{String(label)}
                </button>
              ))}
            </div>

            {activeTab === "ebook" ? <div className="ef-preview-frame large"><EbookDocument data={data} material={generated} /></div> : null}

            {activeTab === "playbook" ? (
              <div className="ef-playbook">
                {generated.playbook.map((item) => (
                  <article key={item.number}>
                    <VisualPlaceholder compact label={item.visualLabel} />
                    <div>
                      <span>PASSO {item.number} • {item.metric}</span>
                      <h3>{item.title}</h3>
                      <p>{item.action}</p>
                      <strong>{item.time}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {activeTab === "share" ? (
              <div className="ef-card">
                <h2>Textos de compartilhamento</h2>
                <pre>{shareText}</pre>
                <button className="ef-primary" onClick={() => navigator.clipboard.writeText(shareText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}>
                  <Copy size={16} />{copied ? "Copiado" : "Copiar texto"}
                </button>
              </div>
            ) : null}

            {activeTab === "export" ? (
              <div className="ef-export-grid">
                <button onClick={printPdf}><Printer size={24} /><strong>Exportar PDF real</strong><small>Usa window.print + CSS @media print</small></button>
                <button onClick={exportHtml}><FileText size={24} /><strong>Exportar HTML completo</strong><small>Capa, sumário, capítulos, CTA e playbook</small></button>
                <button onClick={exportJson}><Download size={24} /><strong>Exportar JSON</strong><small>Dados estruturados do material</small></button>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="ef-actions">
          <button disabled={step === 1} onClick={() => setStep((prev) => Math.max(1, prev - 1))}><ArrowLeft size={16} /> Voltar</button>
          {step < 3 ? (
            <button className="ef-primary" disabled={!canNext} onClick={() => canNext && setStep((prev) => prev + 1)}>Próximo <ArrowRight size={16} /></button>
          ) : step === 3 ? (
            <button className="ef-primary" onClick={generate}><Sparkles size={16} /> Gerar eBook + Playbook</button>
          ) : null}
        </div>
      </div>

      <EbookDocument data={data} material={generated ?? previewMaterial} print />

      <style>{`
        .ef-shell{min-height:100vh;background:#020617;color:#f8fafc;font-family:Inter,system-ui,sans-serif;position:relative;overflow-x:hidden}
        .ef-bg{position:fixed;inset:0;background:radial-gradient(ellipse at 15% 10%,rgba(59,130,246,.22),transparent 38%),radial-gradient(ellipse at 85% 80%,rgba(34,211,238,.16),transparent 42%),linear-gradient(135deg,#020617,#0f172a);pointer-events:none}
        .ef-container{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:24px 20px 64px}
        .ef-header{height:58px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,.12);margin-bottom:42px}
        .ef-brand{display:flex;align-items:center;gap:10px}.ef-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2563eb,#22d3ee);display:grid;place-items:center;font-weight:900;box-shadow:0 0 24px rgba(59,130,246,.42)}.ef-brand strong{display:block;font-size:17px}.ef-brand strong span{color:#60a5fa}.ef-brand small{display:block;color:#94a3b8;font-size:10px;margin-top:-2px}.ef-pill{display:flex;align-items:center;gap:7px;border:1px solid rgba(34,211,238,.28);background:rgba(34,211,238,.08);color:#67e8f9;border-radius:999px;padding:6px 13px;font-size:11px;text-transform:uppercase;letter-spacing:1.6px;font-weight:800}
        .ef-hero{text-align:center;max-width:760px;margin:0 auto 34px}.ef-kicker{display:inline-flex;color:#67e8f9;text-transform:uppercase;letter-spacing:2.4px;font-size:11px;font-weight:900}.ef-hero h1{font-size:clamp(34px,6vw,60px);line-height:1.02;letter-spacing:-2px;margin:16px 0}.ef-hero h1 span{background:linear-gradient(135deg,#93c5fd,#22d3ee);-webkit-background-clip:text;color:transparent}.ef-hero p{color:#94a3b8;line-height:1.7;font-size:16px}
        .ef-stepper{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:24px}.ef-stepper button{display:flex;align-items:center;gap:8px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);color:#94a3b8;border-radius:999px;padding:8px 14px;font-weight:700}.ef-stepper span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.05)}.ef-stepper .active{color:#fff;border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.12)}.ef-stepper .active span,.ef-stepper .done span{background:linear-gradient(135deg,#2563eb,#22d3ee);color:white}.ef-stepper .done{color:#67e8f9}
        .ef-card,.ef-result{background:rgba(15,23,42,.78);border:1px solid rgba(148,163,184,.16);border-radius:18px;padding:24px;backdrop-filter:blur(16px);box-shadow:0 24px 70px rgba(0,0,0,.22)}.ef-card h2,.ef-result h2{margin:0 0 18px;font-size:26px;letter-spacing:-.8px}.ef-option-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.ef-option-grid.three{grid-template-columns:repeat(3,1fr)}.ef-option-grid button,.ef-page-grid button,.ef-cover-tools button,.ef-cover-tools label,.ef-export-grid button{background:rgba(255,255,255,.035);border:1.5px solid rgba(148,163,184,.16);border-radius:12px;color:#f8fafc;padding:16px;text-align:left;cursor:pointer;transition:.2s;display:flex;flex-direction:column;gap:7px}.ef-option-grid button:hover,.ef-page-grid button:hover,.ef-cover-tools button:hover,.ef-cover-tools label:hover,.ef-export-grid button:hover{border-color:rgba(34,211,238,.45);transform:translateY(-1px)}.ef-option-grid .selected,.ef-page-grid .selected,.ef-cover-tools .selected{border-color:#3b82f6;background:rgba(59,130,246,.12);box-shadow:0 0 0 1px rgba(59,130,246,.2)}.ef-option-grid small,.ef-page-grid small,.ef-export-grid small{color:#94a3b8;line-height:1.45}
        .ef-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ef-form-grid label{color:#93c5fd;font-size:12px;font-weight:800;letter-spacing:.4px}.ef-form-grid input{display:block;width:100%;margin-top:7px;background:rgba(255,255,255,.04);border:1px solid rgba(148,163,184,.18);color:#fff;border-radius:10px;padding:11px 13px;outline:none}.ef-form-grid input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
        .ef-page-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}.ef-page-grid button{text-align:center;align-items:center}.ef-page-grid strong{font-size:24px}.ef-chapter-list{display:grid;gap:8px}.ef-chapter-list div{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.035);border:1px solid rgba(148,163,184,.13);border-radius:10px;padding:10px 12px;color:#cbd5e1}.ef-chapter-list span{color:#67e8f9;font-size:11px;font-weight:900;min-width:58px}
        .ef-cover-tools{display:flex;gap:12px;margin-bottom:16px}.ef-cover-tools label,.ef-cover-tools button{flex:1;align-items:center;flex-direction:row;justify-content:center;font-weight:800}.ef-cover-tools input{display:none}.ef-preview-frame{background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.14);border-radius:16px;padding:18px;margin-top:18px;max-height:720px;overflow:auto}.ef-preview-frame.large{max-height:none}
        .ef-document{display:flex;flex-direction:column;gap:18px}.ef-page{max-width:760px;margin:0 auto;background:#fff;color:#1e293b;border-radius:10px;min-height:560px;padding:42px 48px;box-shadow:0 16px 60px rgba(2,6,23,.28);font-family:Georgia,serif}.ef-page h1{font-family:Inter,sans-serif;font-size:48px;line-height:1.03;letter-spacing:-1.8px;margin:18px 0 12px}.ef-page h2{font-family:Inter,sans-serif;color:#1e3a8a;font-size:30px;line-height:1.15;margin:8px 0 16px}.ef-page h3{font-family:Inter,sans-serif;color:#1d4ed8;text-transform:uppercase;letter-spacing:1.8px;font-size:11px}.ef-page p{font-size:15px;line-height:1.78}.ef-cover-page{background:radial-gradient(circle at 84% 12%,rgba(34,211,238,.32),transparent 34%),linear-gradient(135deg,#020617,#1e3a8a 55%,#0f172a);color:#fff;display:flex;flex-direction:column;justify-content:space-between}.ef-cover-page h1{color:#fff}.ef-cover-page p{color:#cbd5e1;font-family:Inter,sans-serif}.ef-cover-art,.ef-cover-image{height:210px;width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.22);margin-top:26px;object-fit:cover}.ef-cover-art{display:grid;place-items:center;background:linear-gradient(135deg,rgba(59,130,246,.56),rgba(34,211,238,.22)),repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 1px,transparent 1px 18px);color:#dbeafe;font-family:Inter,sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:1.4px}.ef-cover-footer{display:flex;justify-content:space-between;color:#bfdbfe;font-family:Inter,sans-serif;font-size:13px;border-top:1px solid rgba(255,255,255,.14);padding-top:18px}.ef-toc-row{display:flex;gap:14px;border-bottom:1px solid #dbeafe;padding:12px 0;font-family:Inter,sans-serif}.ef-toc-row span{color:#2563eb;font-weight:900;min-width:70px;font-size:12px}.ef-toc-row strong{flex:1}.ef-toc-row em{color:#94a3b8;font-style:normal}.ef-objective{background:#eff6ff;border-left:5px solid #22d3ee;color:#1e3a8a;border-radius:0 12px 12px 0;padding:16px 18px;font-family:Inter,sans-serif;font-weight:700}.ef-visual{height:155px;border:1px solid #bae6fd;border-radius:14px;background:linear-gradient(135deg,#dbeafe,#ecfeff);display:flex;align-items:center;justify-content:center;gap:10px;color:#1d4ed8;font-family:Inter,sans-serif;font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;margin:20px 0}.ef-visual-compact{height:120px;margin:0}.ef-content-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ef-note-box{background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:16px}.ef-check-line{display:flex;gap:8px;align-items:flex-start;font-family:Inter,sans-serif;font-size:12px;line-height:1.5;margin:8px 0}.ef-empty-check{width:14px;height:14px;border:1.5px solid #2563eb;border-radius:3px;flex:0 0 auto;margin-top:1px}.ef-cta{background:linear-gradient(135deg,#1d4ed8,#0891b2);color:#fff;border-radius:16px;padding:24px;font-family:Inter,sans-serif;margin-top:24px}.ef-cta strong{display:block;font-size:22px;margin-bottom:6px}
        .ef-result-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.ef-result-head p{color:#94a3b8;margin:0}.ef-result-head button,.ef-actions button{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(148,163,184,.2);background:rgba(255,255,255,.05);color:#cbd5e1;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}.ef-tabs{display:flex;background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.13);border-radius:14px;padding:4px;margin-bottom:18px}.ef-tabs button{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;border:0;background:transparent;color:#94a3b8;border-radius:10px;padding:10px;font-weight:800;cursor:pointer}.ef-tabs .active{background:linear-gradient(135deg,#2563eb,#0891b2);color:#fff}.ef-playbook{display:grid;gap:12px}.ef-playbook article{display:grid;grid-template-columns:180px 1fr;gap:18px;background:rgba(15,23,42,.76);border:1px solid rgba(148,163,184,.16);border-left:4px solid #22d3ee;border-radius:0 14px 14px 0;padding:16px}.ef-playbook span{color:#67e8f9;font-size:11px;font-weight:900;letter-spacing:1.4px}.ef-playbook h3{margin:6px 0;color:#fff}.ef-playbook p{color:#cbd5e1;line-height:1.65}.ef-playbook strong{color:#93c5fd}.ef-card pre{white-space:pre-wrap;background:rgba(2,6,23,.62);border:1px solid rgba(148,163,184,.16);border-radius:12px;padding:16px;color:#cbd5e1;line-height:1.7}.ef-export-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ef-export-grid button{min-height:150px}.ef-primary{background:linear-gradient(135deg,#2563eb,#22d3ee)!important;border:0!important;color:#fff!important;box-shadow:0 12px 28px rgba(37,99,235,.32)}.ef-actions{display:flex;justify-content:space-between;margin-top:18px}.ef-actions button:disabled{opacity:.35;cursor:not-allowed}
        .ef-print-doc{display:none}
        @media(max-width:760px){.ef-option-grid,.ef-option-grid.three,.ef-form-grid,.ef-page-grid,.ef-export-grid{grid-template-columns:1fr}.ef-cover-tools,.ef-result-head{flex-direction:column}.ef-playbook article{grid-template-columns:1fr}.ef-content-grid{grid-template-columns:1fr}.ef-page{padding:30px 24px}.ef-tabs{flex-wrap:wrap}.ef-tabs button{min-width:45%}}
        @media print{body{background:#fff!important}.ef-no-print{display:none!important}.ef-shell{background:#fff;color:#000}.ef-bg{display:none}.ef-print-doc{display:block!important;position:absolute;inset:0;background:#fff}.ef-print-doc .ef-page{box-shadow:none;border-radius:0;max-width:none;min-height:auto;width:100%;page-break-after:always;padding:18mm}.ef-print-doc .ef-page:last-child{page-break-after:auto}.ef-print-doc .ef-cover-page{min-height:250mm}.ef-print-doc .ef-content-grid{grid-template-columns:1fr 1fr}@page{size:A4;margin:0}}
      `}</style>
    </div>
  );
}
