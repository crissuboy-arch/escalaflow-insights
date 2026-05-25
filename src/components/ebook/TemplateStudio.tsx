import { useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Image,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { generateStoryCoverFn } from "@/lib/storybook.functions";
import type { TemplateMaster, TemplateChapter } from "@/lib/ebook/template-master";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudioState {
  title: string;
  subtitle: string;
  author: string;
  coverUrl: string;
  chapters: TemplateChapter[];
  bonus: TemplateMaster["bonus"];
  cta: TemplateMaster["cta"];
  finalPage: string;
}

function loadState(template: TemplateMaster): StudioState {
  const key = `ebook-studio-${template.id}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as StudioState;
  } catch { /* ignore */ }
  return {
    title: template.meta.title,
    subtitle: template.meta.subtitle,
    author: template.meta.authorPlaceholder,
    coverUrl: "",
    chapters: template.chapters.map((c) => ({ ...c })),
    bonus: template.bonus ? { ...template.bonus, items: [...template.bonus.items] } : undefined,
    cta: { ...template.cta },
    finalPage: template.finalPage,
  };
}

function saveState(template: TemplateMaster, state: StudioState) {
  localStorage.setItem(`ebook-studio-${template.id}`, JSON.stringify(state));
}

// ─── Sidebar Items ────────────────────────────────────────────────────────────

type SidebarSection = "chapters" | "cover" | "export";

// ─── HTML Export ─────────────────────────────────────────────────────────────

function buildHtml(state: StudioState, template: TemplateMaster): string {
  const chapterHtml = state.chapters.map((ch, i) => `
    <section class="chapter">
      ${ch.badge ? `<div class="badge">${ch.badge}</div>` : ""}
      <h2>${i + 1}. ${ch.title}</h2>
      ${ch.pullQuote ? `<blockquote>${ch.pullQuote}</blockquote>` : ""}
      <div class="body">${ch.body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</div>
      ${ch.checklist && ch.checklist.length > 0 ? `
        <div class="checklist">
          <h4>✅ Checklist</h4>
          <ul>${ch.checklist.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>` : ""}
      ${ch.exercise ? `<div class="exercise"><h4>📝 Exercício</h4><p>${ch.exercise.replace(/\n/g, "<br>")}</p></div>` : ""}
    </section>`).join("\n");

  const bonusHtml = state.bonus ? `
    <section class="bonus">
      <h2>🎁 ${state.bonus.title}</h2>
      <p>${state.bonus.description}</p>
      <ul>${state.bonus.items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>` : "";

  const ctaHtml = `
    <section class="cta">
      <h2>${state.cta.headline}</h2>
      <p>${state.cta.body}</p>
      <div class="cta-button">${state.cta.buttonText}</div>
      <p class="urgency">${state.cta.urgency}</p>
    </section>`;

  const toc = state.chapters.map((ch, i) => `<li>${i + 1}. ${ch.title}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${state.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #FAFAF8; color: #1a1a1a; line-height: 1.7; }
    .cover { background: linear-gradient(140deg, ${template.colorA} 0%, ${template.colorB} 100%); color: #fff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 40px; page-break-after: always; }
    ${state.coverUrl ? `.cover { background-image: url('${state.coverUrl}'); background-size: cover; background-position: center; }` : ""}
    .cover-emoji { font-size: 64px; margin-bottom: 24px; }
    .cover h1 { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(32px, 5vw, 56px); font-weight: 900; line-height: 1.15; margin-bottom: 16px; text-shadow: 0 2px 12px rgba(0,0,0,0.4); }
    .cover .subtitle { font-size: 18px; opacity: 0.9; max-width: 600px; margin-bottom: 24px; }
    .cover .author { font-size: 14px; opacity: 0.75; text-transform: uppercase; letter-spacing: 2px; }
    .toc { max-width: 720px; margin: 60px auto; padding: 48px 40px; background: #fff; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); }
    .toc h2 { font-family: 'Playfair Display', serif; font-size: 28px; margin-bottom: 24px; }
    .toc ol { padding-left: 20px; }
    .toc li { padding: 6px 0; font-size: 15px; color: #4a4a4a; }
    .chapter { max-width: 720px; margin: 0 auto 60px; padding: 48px 40px; background: #fff; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); page-break-inside: avoid; }
    .badge { display: inline-block; background: ${template.colorA}18; color: ${template.colorA}; border: 1px solid ${template.colorA}40; border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .chapter h2 { font-family: 'Playfair Display', serif; font-size: 30px; font-weight: 700; margin-bottom: 20px; color: #111; line-height: 1.25; }
    .chapter blockquote { border-left: 4px solid ${template.colorA}; padding: 12px 20px; margin: 20px 0; font-style: italic; color: #555; background: ${template.colorA}08; border-radius: 0 8px 8px 0; }
    .body p { margin-bottom: 16px; font-size: 16px; color: #333; }
    .checklist { margin-top: 28px; background: #f8fafb; border-radius: 8px; padding: 20px 24px; }
    .checklist h4 { font-size: 14px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .checklist ul { list-style: none; }
    .checklist li { padding: 6px 0 6px 24px; position: relative; font-size: 14px; color: #444; }
    .checklist li::before { content: '☐'; position: absolute; left: 0; color: ${template.colorA}; }
    .exercise { margin-top: 24px; background: ${template.colorA}08; border: 1px solid ${template.colorA}25; border-radius: 8px; padding: 20px 24px; }
    .exercise h4 { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
    .exercise p { font-size: 14px; color: #444; }
    .bonus { max-width: 720px; margin: 0 auto 60px; padding: 48px 40px; background: linear-gradient(135deg, ${template.colorA}12 0%, ${template.colorB}10 100%); border: 2px solid ${template.colorA}30; border-radius: 12px; }
    .bonus h2 { font-family: 'Playfair Display', serif; font-size: 26px; margin-bottom: 12px; }
    .bonus ul { padding-left: 20px; margin-top: 16px; }
    .bonus li { padding: 6px 0; font-size: 15px; }
    .cta { max-width: 720px; margin: 0 auto 60px; padding: 60px 40px; background: linear-gradient(140deg, ${template.colorA} 0%, ${template.colorB} 100%); color: #fff; border-radius: 16px; text-align: center; }
    .cta h2 { font-family: 'Playfair Display', serif; font-size: 30px; margin-bottom: 16px; }
    .cta p { font-size: 16px; opacity: 0.9; max-width: 560px; margin: 0 auto 24px; }
    .cta-button { display: inline-block; background: #fff; color: ${template.colorB}; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; margin-bottom: 16px; }
    .urgency { font-size: 13px; opacity: 0.75; }
    @media print {
      .cover { min-height: 100vmin; }
      .chapter, .bonus, .cta { box-shadow: none; margin: 0 auto 40px; }
      body { background: #fff; }
    }
    @media (max-width: 600px) {
      .chapter, .bonus, .cta, .toc { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-emoji">${template.emoji}</div>
    <h1>${state.title}</h1>
    <p class="subtitle">${state.subtitle}</p>
    <p class="author">por ${state.author}</p>
  </div>
  <div class="toc">
    <h2>Índice</h2>
    <ol>${toc}</ol>
  </div>
  <div class="chapters-wrap">
    ${chapterHtml}
  </div>
  ${bonusHtml}
  ${ctaHtml}
  <div style="max-width:720px;margin:0 auto 80px;padding:40px;text-align:center;color:#999;font-size:13px;">
    ${state.finalPage.replace(/\n/g, "<br>")}
  </div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  template: TemplateMaster;
}

export function TemplateStudio({ template }: Props) {
  const navigate = useNavigate();
  const [state, setState] = useState<StudioState>(() => loadState(template));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string>(template.chapters[0]?.id ?? "meta");
  const [sideSection, setSideSection] = useState<SidebarSection>("chapters");
  const [aiCoverPrompt, setAiCoverPrompt] = useState("");
  const [aiCoverLoading, setAiCoverLoading] = useState(false);
  const [aiCoverOpen, setAiCoverOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const genCover = useServerFn(generateStoryCoverFn);

  const update = useCallback((patch: Partial<StudioState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setSaved(false);
  }, []);

  const updateChapter = useCallback((id: string, patch: Partial<TemplateChapter>) => {
    setState((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));
    setDirty(true);
    setSaved(false);
  }, []);

  function handleSave() {
    saveState(template, state);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update({ coverUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  async function handleAiCover() {
    if (!aiCoverPrompt.trim()) return;
    setAiCoverLoading(true);
    try {
      const result = await genCover({ data: { prompt: aiCoverPrompt } });
      update({ coverUrl: result.url });
      setAiCoverOpen(false);
      setAiCoverPrompt("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao gerar capa");
    } finally {
      setAiCoverLoading(false);
    }
  }

  function handleExportHtml() {
    const html = buildHtml(state, template);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `${state.title.replace(/\W+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const html = buildHtml(state, template);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  }

  const activeChapter = state.chapters.find((c) => c.id === activeChapterId);
  const isMetaActive = activeChapterId === "meta";
  const isBonusActive = activeChapterId === "bonus";
  const isCtaActive = activeChapterId === "cta";

  const sidebarBg = "background: #0D1526";
  const borderColor = "rgba(255,255,255,0.07)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080D1A", color: "#F0F4FF", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>

      {/* ── Top Bar ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${borderColor}`, background: "#080D1A", flexShrink: 0, minHeight: 52 }}>
        <button
          onClick={() => navigate({ to: "/ebook-forge" })}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#6B7FA8", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <div style={{ width: 1, height: 20, background: borderColor }} />

        <BookOpen size={16} color={template.colorA} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={state.title}
            onChange={(e) => update({ title: e.target.value })}
            style={{ background: "none", border: "none", color: "#F0F4FF", fontSize: 15, fontWeight: 700, width: "100%", outline: "none", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ fontSize: 12, color: dirty ? "#F59E0B" : saved ? "#10B981" : "#6B7FA8", display: "flex", alignItems: "center", gap: 4 }}>
          {saved ? <Check size={12} /> : null}
          {saved ? "Salvo" : dirty ? "● Não salvo" : ""}
        </div>

        <Button
          size="sm"
          variant="outline"
          style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 12, height: 32, gap: 6 }}
          onClick={handleSave}
        >
          <Save size={13} /> Salvar
        </Button>

        <Button
          size="sm"
          style={{ background: `linear-gradient(135deg, ${template.colorA}, ${template.colorB})`, fontSize: 12, height: 32, gap: 6 }}
          onClick={handleExportHtml}
        >
          <Download size={13} /> Exportar HTML
        </Button>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0A0F1E" }}>

          {/* Section tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${borderColor}` }}>
            {(["chapters", "cover", "export"] as SidebarSection[]).map((s) => (
              <button
                key={s}
                onClick={() => setSideSection(s)}
                style={{ flex: 1, padding: "10px 4px", background: sideSection === s ? "#111827" : "none", border: "none", color: sideSection === s ? "#F0F4FF" : "#6B7FA8", fontSize: 11, cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit", borderBottom: sideSection === s ? `2px solid ${template.colorA}` : "2px solid transparent" }}
              >
                {s === "chapters" ? "Capítulos" : s === "cover" ? "Capa" : "Exportar"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

            {/* Chapters section */}
            {sideSection === "chapters" && (
              <>
                {/* Meta */}
                <SideItem
                  label="📋 Informações gerais"
                  active={isMetaActive}
                  onClick={() => setActiveChapterId("meta")}
                  accentColor={template.colorA}
                />
                {/* Chapters */}
                {state.chapters.map((ch, i) => (
                  <SideItem
                    key={ch.id}
                    label={`${i + 1}. ${ch.title}`}
                    active={activeChapterId === ch.id}
                    onClick={() => setActiveChapterId(ch.id)}
                    accentColor={template.colorA}
                    badge={ch.badge}
                  />
                ))}
                {/* Bonus */}
                {state.bonus && (
                  <SideItem
                    label="🎁 Bônus"
                    active={isBonusActive}
                    onClick={() => setActiveChapterId("bonus")}
                    accentColor={template.colorA}
                  />
                )}
                {/* CTA */}
                <SideItem
                  label="🎯 CTA Final"
                  active={isCtaActive}
                  onClick={() => setActiveChapterId("cta")}
                  accentColor={template.colorA}
                />
              </>
            )}

            {/* Cover section */}
            {sideSection === "cover" && (
              <div style={{ padding: "12px 14px" }}>
                {/* Preview */}
                <div style={{ aspectRatio: "3/4", borderRadius: 10, overflow: "hidden", marginBottom: 14, background: `linear-gradient(140deg, ${template.colorA}, ${template.colorB})`, position: "relative" }}>
                  {state.coverUrl && (
                    <img src={state.coverUrl} alt="Capa" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 10, textAlign: "center", background: state.coverUrl ? "rgba(0,0,0,0.35)" : "transparent" }}>
                    <span style={{ fontSize: 28, marginBottom: 6 }}>{template.emoji}</span>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{state.title}</p>
                    <p style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>por {state.author}</p>
                  </div>
                </div>

                {/* Upload */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverUpload} />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 11, height: 30, gap: 5, marginBottom: 6 }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={11} /> Upload de imagem
                </Button>

                {/* AI generate */}
                {!aiCoverOpen ? (
                  <Button
                    size="sm"
                    className="w-full"
                    style={{ background: `linear-gradient(135deg, ${template.colorA}, ${template.colorB})`, fontSize: 11, height: 30, gap: 5 }}
                    onClick={() => setAiCoverOpen(true)}
                  >
                    <Sparkles size={11} /> Gerar com IA
                  </Button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Textarea
                      placeholder="Descreva a capa em inglês para melhores resultados... Ex: 'dramatic dark cover with golden title, professional business book'"
                      value={aiCoverPrompt}
                      onChange={(e) => setAiCoverPrompt(e.target.value)}
                      rows={3}
                      style={{ fontSize: 11, resize: "none" }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="sm" variant="outline" style={{ flex: 1, fontSize: 10, height: 26 }} onClick={() => setAiCoverOpen(false)}>Cancelar</Button>
                      <Button
                        size="sm"
                        disabled={aiCoverLoading || !aiCoverPrompt.trim()}
                        style={{ flex: 2, background: `linear-gradient(135deg, ${template.colorA}, ${template.colorB})`, fontSize: 10, height: 26, gap: 4 }}
                        onClick={handleAiCover}
                      >
                        {aiCoverLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        {aiCoverLoading ? "Gerando..." : "Gerar"}
                      </Button>
                    </div>
                  </div>
                )}

                {state.coverUrl && (
                  <button
                    onClick={() => update({ coverUrl: "" })}
                    style={{ width: "100%", marginTop: 8, padding: "4px 0", background: "none", border: "none", color: "#6B7FA8", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    ✕ Remover capa
                  </button>
                )}
              </div>
            )}

            {/* Export section */}
            {sideSection === "export" && (
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 11, color: "#6B7FA8", marginBottom: 4 }}>Salve antes de exportar para incluir todas as edições.</p>
                <Button
                  size="sm"
                  variant="outline"
                  style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 12, height: 34, gap: 6, justifyContent: "flex-start" }}
                  onClick={handleExportHtml}
                >
                  <FileText size={13} /> Exportar HTML
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 12, height: 34, gap: 6, justifyContent: "flex-start" }}
                  onClick={handlePrint}
                >
                  <Printer size={13} /> Imprimir / Salvar PDF
                </Button>
                <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, fontSize: 11, color: "#6B7FA8", lineHeight: 1.6 }}>
                  <strong style={{ color: "#9BAAC8" }}>Dica PDF:</strong> Use "Imprimir" e selecione "Salvar como PDF" no diálogo do navegador para exportar com design premium.
                </div>
                <div style={{ marginTop: 4, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "#9BAAC8", fontWeight: 600, marginBottom: 6 }}>Informações do ebook</p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}>{state.chapters.length} capítulos</p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}>{state.chapters.reduce((sum, c) => sum + c.body.split(" ").length, 0).toLocaleString()} palavras</p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}>{template.pages} páginas estimadas</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Editor Main ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>

          {/* Meta panel */}
          {isMetaActive && (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#F0F4FF" }}>Informações do Ebook</h2>
              <div style={{ display: "grid", gap: 16 }}>
                <Field label="Título">
                  <Input value={state.title} onChange={(e) => update({ title: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }} />
                </Field>
                <Field label="Subtítulo">
                  <Textarea value={state.subtitle} onChange={(e) => update({ subtitle: e.target.value })} rows={2} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "none" }} />
                </Field>
                <Field label="Autor">
                  <Input value={state.author} onChange={(e) => update({ author: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }} />
                </Field>
              </div>
              <div style={{ marginTop: 28, padding: "16px 20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontSize: 13, color: "#9BAAC8", fontWeight: 600, marginBottom: 8 }}>Proposta de Valor Original</p>
                <p style={{ fontSize: 13, color: "#6B7FA8", lineHeight: 1.7 }}>{template.meta.promise}</p>
                <p style={{ fontSize: 12, color: "#6B7FA8", marginTop: 8 }}><strong style={{ color: "#9BAAC8" }}>Mecanismo único:</strong> {template.meta.uniqueMechanism}</p>
                <p style={{ fontSize: 12, color: "#6B7FA8" }}><strong style={{ color: "#9BAAC8" }}>Transformação:</strong> {template.meta.transformation}</p>
              </div>
            </div>
          )}

          {/* Chapter editor */}
          {activeChapter && (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              {/* Chapter header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {activeChapter.badge && (
                  <Badge variant="outline" style={{ borderColor: `${template.colorA}50`, color: template.colorA, fontSize: 10 }}>
                    {activeChapter.badge}
                  </Badge>
                )}
              </div>

              <Input
                value={activeChapter.title}
                onChange={(e) => updateChapter(activeChapter.id, { title: e.target.value })}
                style={{ background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", fontSize: 22, fontWeight: 700, padding: "4px 0", marginBottom: 16, borderRadius: 0, outline: "none", fontFamily: "Georgia, serif" }}
              />

              {/* Pull quote */}
              {activeChapter.pullQuote !== undefined && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: "#6B7FA8", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Pull quote</p>
                  <Textarea
                    value={activeChapter.pullQuote ?? ""}
                    onChange={(e) => updateChapter(activeChapter.id, { pullQuote: e.target.value })}
                    rows={2}
                    style={{ background: `${template.colorA}08`, border: `1px solid ${template.colorA}20`, color: "#9BAAC8", fontStyle: "italic", resize: "none", fontSize: 14 }}
                  />
                </div>
              )}

              {/* Body */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1 }}>Conteúdo</p>
                  <p style={{ fontSize: 11, color: "#4A5568" }}>{activeChapter.body.split(" ").length} palavras</p>
                </div>
                <Textarea
                  value={activeChapter.body}
                  onChange={(e) => updateChapter(activeChapter.id, { body: e.target.value })}
                  rows={20}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#C8D4F0", fontSize: 14, lineHeight: 1.8, resize: "vertical", fontFamily: "Georgia, serif" }}
                />
              </div>

              {/* Checklist editor */}
              {activeChapter.checklist && (
                <div style={{ marginBottom: 20, padding: "16px 20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ fontSize: 11, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>✅ Checklist</p>
                  {activeChapter.checklist.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: "#6B7FA8", fontSize: 13, marginTop: 6 }}>•</span>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newList = [...(activeChapter.checklist ?? [])];
                          newList[i] = e.target.value;
                          updateChapter(activeChapter.id, { checklist: newList });
                        }}
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#C8D4F0", fontSize: 13, height: 32 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Exercise editor */}
              {activeChapter.exercise !== undefined && (
                <div style={{ padding: "16px 20px", background: `${template.colorA}08`, borderRadius: 10, border: `1px solid ${template.colorA}20` }}>
                  <p style={{ fontSize: 11, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>📝 Exercício</p>
                  <Textarea
                    value={activeChapter.exercise ?? ""}
                    onChange={(e) => updateChapter(activeChapter.id, { exercise: e.target.value })}
                    rows={4}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#C8D4F0", fontSize: 13, resize: "none" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Bonus editor */}
          {isBonusActive && state.bonus && (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#F0F4FF" }}>🎁 Seção de Bônus</h2>
              <div style={{ display: "grid", gap: 16 }}>
                <Field label="Título do bônus">
                  <Input value={state.bonus.title} onChange={(e) => update({ bonus: { ...state.bonus!, title: e.target.value } })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }} />
                </Field>
                <Field label="Descrição">
                  <Textarea value={state.bonus.description} onChange={(e) => update({ bonus: { ...state.bonus!, description: e.target.value } })} rows={2} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "none" }} />
                </Field>
                <Field label="Itens do bônus">
                  {state.bonus.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const items = [...state.bonus!.items];
                          items[i] = e.target.value;
                          update({ bonus: { ...state.bonus!, items } });
                        }}
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", fontSize: 13 }}
                      />
                    </div>
                  ))}
                </Field>
              </div>
            </div>
          )}

          {/* CTA editor */}
          {isCtaActive && (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#F0F4FF" }}>🎯 CTA Final</h2>
              <div style={{ display: "grid", gap: 16 }}>
                <Field label="Headline do CTA">
                  <Input value={state.cta.headline} onChange={(e) => update({ cta: { ...state.cta, headline: e.target.value } })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }} />
                </Field>
                <Field label="Corpo do texto">
                  <Textarea value={state.cta.body} onChange={(e) => update({ cta: { ...state.cta, body: e.target.value } })} rows={3} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "none" }} />
                </Field>
                <Field label="Texto do botão">
                  <Input value={state.cta.buttonText} onChange={(e) => update({ cta: { ...state.cta, buttonText: e.target.value } })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }} />
                </Field>
                <Field label="Urgência">
                  <Input value={state.cta.urgency} onChange={(e) => update({ cta: { ...state.cta, urgency: e.target.value } })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }} />
                </Field>
                <Field label="Página final (mensagem de encerramento)">
                  <Textarea value={state.finalPage} onChange={(e) => update({ finalPage: e.target.value })} rows={5} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "vertical" }} />
                </Field>
              </div>

              {/* CTA preview */}
              <div style={{ marginTop: 32, borderRadius: 12, overflow: "hidden", background: `linear-gradient(140deg, ${template.colorA}, ${template.colorB})`, padding: "36px 32px", textAlign: "center" }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{state.cta.headline}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 20, maxWidth: 460, margin: "0 auto 20px" }}>{state.cta.body}</p>
                <div style={{ display: "inline-block", background: "#fff", color: template.colorB, padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{state.cta.buttonText}</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{state.cta.urgency}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SideItem({ label, active, onClick, accentColor, badge }: { label: string; active: boolean; onClick: () => void; accentColor: string; badge?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 14px",
        background: active ? `${accentColor}15` : "none",
        border: "none",
        borderLeft: `3px solid ${active ? accentColor : "transparent"}`,
        color: active ? "#F0F4FF" : "#6B7FA8",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1.4,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {badge && !active && (
        <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.5 }}>({badge})</span>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}
