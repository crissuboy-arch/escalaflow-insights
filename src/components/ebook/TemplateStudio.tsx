import { useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  FileText,
  Loader2,
  Palette,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { generateEbookCoverFn } from "@/lib/storybook.functions";
import { generateEbookPDF } from "@/lib/pdf-generator";
import type { TemplateMaster, TemplateChapter } from "@/lib/ebook/template-master";
import type { DesignConfig } from "@/lib/pdf-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudioState {
  title: string;
  subtitle: string;
  author: string;
  coverUrl: string;
  chapters: TemplateChapter[];
  bonus: TemplateMaster["bonus"];
  cta: TemplateMaster["cta"];
  finalPage: string;
  design: DesignConfig;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadState(template: TemplateMaster): StudioState {
  const key = `ebook-studio-${template.id}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<StudioState>;
      return {
        title: parsed.title ?? template.meta.title,
        subtitle: parsed.subtitle ?? template.meta.subtitle,
        author: parsed.author ?? template.meta.authorPlaceholder,
        coverUrl: parsed.coverUrl ?? "",
        chapters: parsed.chapters ?? template.chapters.map((c) => ({ ...c })),
        bonus: parsed.bonus ?? (template.bonus ? { ...template.bonus, items: [...template.bonus.items] } : undefined),
        cta: parsed.cta ?? { ...template.cta },
        finalPage: parsed.finalPage ?? template.finalPage,
        design: parsed.design ?? { colorA: template.colorA, colorB: template.colorB, font: "sans" },
      };
    }
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
    design: { colorA: template.colorA, colorB: template.colorB, font: "sans" },
  };
}

function saveState(template: TemplateMaster, state: StudioState) {
  localStorage.setItem(`ebook-studio-${template.id}`, JSON.stringify(state));
}

// ─── Section types ────────────────────────────────────────────────────────────

type SideSection = "chapters" | "cover" | "design" | "export";

// ─── HTML export ─────────────────────────────────────────────────────────────

function buildHtml(state: StudioState, template: TemplateMaster): string {
  const cA = state.design.colorA;
  const cB = state.design.colorB;

  const chaptersHtml = state.chapters
    .map(
      (ch, i) => `
    <section class="chapter">
      ${ch.badge ? `<div class="badge">${ch.badge}</div>` : ""}
      <h2>${i + 1}. ${ch.title}</h2>
      ${ch.pullQuote ? `<blockquote>${ch.pullQuote}</blockquote>` : ""}
      <div class="body">${ch.body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</div>
      ${ch.checklist?.length ? `<div class="checklist"><h4>✅ Checklist</h4><ul>${ch.checklist.map((it) => `<li>${it}</li>`).join("")}</ul></div>` : ""}
      ${ch.exercise ? `<div class="exercise"><h4>📝 Exercício</h4><p>${ch.exercise.replace(/\n/g, "<br>")}</p></div>` : ""}
    </section>`,
    )
    .join("\n");

  const bonusHtml = state.bonus
    ? `<section class="bonus"><h2>🎁 ${state.bonus.title}</h2><p>${state.bonus.description}</p><ul>${state.bonus.items.map((it) => `<li>${it}</li>`).join("")}</ul></section>`
    : "";

  const toc = state.chapters.map((ch, i) => `<li>${i + 1}. ${ch.title}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${state.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#FAFAF8;color:#1a1a1a;line-height:1.7}
    .cover{background:linear-gradient(140deg,${cA} 0%,${cB} 100%);${state.coverUrl ? `background-image:url('${state.coverUrl}');background-size:cover;background-position:center;` : ""}color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 40px;page-break-after:always}
    .cover h1{font-family:'Playfair Display',serif;font-size:clamp(28px,5vw,52px);font-weight:900;margin-bottom:16px;text-shadow:0 2px 12px rgba(0,0,0,.4)}
    .cover .subtitle{font-size:17px;opacity:.9;max-width:580px;margin-bottom:20px}
    .cover .author{font-size:13px;opacity:.7;letter-spacing:2px;text-transform:uppercase}
    .toc{max-width:720px;margin:60px auto;padding:48px 40px;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.06)}
    .toc h2{font-family:'Playfair Display',serif;font-size:26px;margin-bottom:20px}
    .toc ol{padding-left:20px}.toc li{padding:6px 0;font-size:15px;color:#4a4a4a}
    .chapter{max-width:720px;margin:0 auto 60px;padding:48px 40px;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.06);page-break-inside:avoid}
    .badge{display:inline-block;background:${cA}18;color:${cA};border:1px solid ${cA}40;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
    .chapter h2{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;margin-bottom:18px;color:#111;line-height:1.25}
    .chapter blockquote{border-left:4px solid ${cA};padding:12px 20px;margin:20px 0;font-style:italic;color:#555;background:${cA}08;border-radius:0 8px 8px 0}
    .body p{margin-bottom:16px;font-size:16px;color:#333}
    .checklist{margin-top:24px;background:#f8fafb;border-radius:8px;padding:20px 24px}
    .checklist h4{font-size:13px;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}
    .checklist ul{list-style:none}.checklist li{padding:5px 0 5px 22px;position:relative;font-size:14px;color:#444}
    .checklist li::before{content:'☐';position:absolute;left:0;color:${cA}}
    .exercise{margin-top:22px;background:${cA}08;border:1px solid ${cA}25;border-radius:8px;padding:20px 24px}
    .exercise h4{font-size:13px;font-weight:700;margin-bottom:8px}.exercise p{font-size:14px;color:#444}
    .bonus{max-width:720px;margin:0 auto 60px;padding:48px 40px;background:linear-gradient(135deg,${cA}12 0%,${cB}10 100%);border:2px solid ${cA}30;border-radius:12px}
    .bonus h2{font-family:'Playfair Display',serif;font-size:24px;margin-bottom:10px}.bonus ul{padding-left:20px;margin-top:14px}.bonus li{padding:5px 0;font-size:15px}
    .cta{max-width:720px;margin:0 auto 60px;padding:60px 40px;background:linear-gradient(140deg,${cA} 0%,${cB} 100%);color:#fff;border-radius:16px;text-align:center}
    .cta h2{font-family:'Playfair Display',serif;font-size:28px;margin-bottom:14px}
    .cta p{font-size:15px;opacity:.9;max-width:540px;margin:0 auto 22px}
    .cta-btn{display:inline-block;background:#fff;color:${cB};padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;margin-bottom:14px}
    .urgency{font-size:12px;opacity:.7}
    @media print{.cover{min-height:100vmin}.chapter,.bonus,.cta{box-shadow:none}body{background:#fff}}
  </style>
</head>
<body>
  <div class="cover">
    <div style="font-size:52px;margin-bottom:20px">${template.emoji}</div>
    <h1>${state.title}</h1>
    <p class="subtitle">${state.subtitle}</p>
    <p class="author">por ${state.author}</p>
  </div>
  <div class="toc"><h2>Índice</h2><ol>${toc}</ol></div>
  ${chaptersHtml}
  ${bonusHtml}
  <section class="cta">
    <h2>${state.cta.headline}</h2>
    <p>${state.cta.body}</p>
    <div class="cta-btn">${state.cta.buttonText}</div>
    <p class="urgency">${state.cta.urgency}</p>
  </section>
  <div style="max-width:720px;margin:0 auto 80px;padding:40px;text-align:center;color:#999;font-size:13px">
    ${state.finalPage.replace(/\n/g, "<br>")}
  </div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateStudio({ template }: { template: TemplateMaster }) {
  const navigate = useNavigate();
  const [state, setState] = useState<StudioState>(() => loadState(template));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeId, setActiveId] = useState<string>(template.chapters[0]?.id ?? "meta");
  const [sideSection, setSideSection] = useState<SideSection>("chapters");
  const [aiPrompt, setAiPrompt] = useState(template.coverPrompt ?? "");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const genCover = useServerFn(generateEbookCoverFn);

  const update = useCallback((patch: Partial<StudioState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setSaved(false);
  }, []);

  const updateChapter = useCallback((id: string, patch: Partial<TemplateChapter>) => {
    setState((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    setDirty(true);
    setSaved(false);
  }, []);

  function handleSave() {
    saveState(template, state);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Ebook salvo!");
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ coverUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function handleAiCover() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await genCover({ data: { prompt: aiPrompt } });
      update({ coverUrl: result.url });
      setAiOpen(false);
      toast.success("Capa gerada com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar capa com IA");
    } finally {
      setAiLoading(false);
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
    toast.success("HTML exportado!");
  }

  async function handleExportPdf() {
    setPdfLoading(true);
    try {
      await generateEbookPDF(state, template, state.design);
      toast.success("PDF exportado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  const activeChapter = state.chapters.find((c) => c.id === activeId);
  const isMetaActive = activeId === "meta";
  const isBonusActive = activeId === "bonus";
  const isCtaActive = activeId === "cta";

  const BD = "rgba(255,255,255,0.07)";
  const cA = state.design.colorA;

  const SIDE_TABS: { key: SideSection; label: string }[] = [
    { key: "chapters", label: "Capítulos" },
    { key: "cover", label: "Capa" },
    { key: "design", label: "Design" },
    { key: "export", label: "Exportar" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#080D1A",
        color: "#F0F4FF",
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          borderBottom: `1px solid ${BD}`,
          background: "#080D1A",
          flexShrink: 0,
          height: 50,
        }}
      >
        <button
          onClick={() => navigate({ to: "/produtos/ebook" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            color: "#6B7FA8",
            cursor: "pointer",
            fontSize: 12,
            padding: "4px 6px",
            borderRadius: 6,
          }}
        >
          <ArrowLeft size={13} /> Voltar
        </button>

        <div style={{ width: 1, height: 18, background: BD }} />
        <BookOpen size={15} color={cA} />

        <input
          value={state.title}
          onChange={(e) => update({ title: e.target.value })}
          style={{
            flex: 1,
            minWidth: 0,
            background: "none",
            border: "none",
            color: "#F0F4FF",
            fontSize: 14,
            fontWeight: 700,
            outline: "none",
            fontFamily: "inherit",
          }}
        />

        <span
          style={{
            fontSize: 11,
            color: dirty ? "#F59E0B" : saved ? "#10B981" : "#6B7FA8",
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
          }}
        >
          {saved && <Check size={11} />}
          {saved ? "Salvo" : dirty ? "● Não salvo" : ""}
        </span>

        <Button
          size="sm"
          variant="outline"
          style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 11, height: 30, gap: 5 }}
          onClick={handleSave}
        >
          <Save size={12} /> Salvar
        </Button>

        <Button
          size="sm"
          disabled={pdfLoading}
          style={{
            background: `linear-gradient(135deg, ${cA}, ${state.design.colorB})`,
            fontSize: 11,
            height: 30,
            gap: 5,
          }}
          onClick={handleExportPdf}
        >
          {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Exportar PDF
        </Button>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Sidebar ── */}
        <aside
          style={{
            width: 232,
            flexShrink: 0,
            borderRight: `1px solid ${BD}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#0A0F1E",
          }}
        >
          {/* Section tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderBottom: `1px solid ${BD}`,
            }}
          >
            {SIDE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSideSection(tab.key)}
                style={{
                  padding: "9px 2px",
                  background: sideSection === tab.key ? "#111827" : "none",
                  border: "none",
                  color: sideSection === tab.key ? "#F0F4FF" : "#6B7FA8",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderBottom: `2px solid ${sideSection === tab.key ? cA : "transparent"}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {/* ── Chapters ── */}
            {sideSection === "chapters" && (
              <>
                <SideItem label="📋 Informações gerais" active={isMetaActive} onClick={() => setActiveId("meta")} color={cA} />
                {state.chapters.map((ch, i) => (
                  <SideItem
                    key={ch.id}
                    label={`${i + 1}. ${ch.title}`}
                    active={activeId === ch.id}
                    onClick={() => setActiveId(ch.id)}
                    color={cA}
                    badge={ch.badge}
                  />
                ))}
                {state.bonus && (
                  <SideItem label="🎁 Bônus" active={isBonusActive} onClick={() => setActiveId("bonus")} color={cA} />
                )}
                <SideItem label="🎯 CTA Final" active={isCtaActive} onClick={() => setActiveId("cta")} color={cA} />
              </>
            )}

            {/* ── Cover ── */}
            {sideSection === "cover" && (
              <div style={{ padding: "12px 13px" }}>
                {/* Preview */}
                <div
                  style={{
                    aspectRatio: "3/4",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 12,
                    background: `linear-gradient(140deg, ${cA}, ${state.design.colorB})`,
                    position: "relative",
                  }}
                >
                  {state.coverUrl && (
                    <img
                      src={state.coverUrl}
                      alt="Capa"
                      style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                      textAlign: "center",
                      background: state.coverUrl ? "rgba(0,0,0,0.32)" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 5 }}>{template.emoji}</span>
                    <p style={{ fontSize: 8, fontWeight: 700, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>
                      {state.title}
                    </p>
                    <p style={{ fontSize: 7, color: "rgba(255,255,255,.65)", marginTop: 3 }}>por {state.author}</p>
                  </div>
                </div>

                {/* Upload */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverUpload} />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mb-1.5"
                  style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 11, height: 29, gap: 4 }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={11} /> Upload de imagem
                </Button>

                {/* AI generate */}
                {!aiOpen ? (
                  <Button
                    size="sm"
                    className="w-full"
                    style={{
                      background: `linear-gradient(135deg, ${cA}, ${state.design.colorB})`,
                      fontSize: 11,
                      height: 29,
                      gap: 4,
                    }}
                    onClick={() => setAiOpen(true)}
                  >
                    <Sparkles size={11} /> Gerar Capa com IA
                  </Button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <Textarea
                      placeholder="Descreva a capa em inglês... Ex: 'dramatic dark cover with golden title, professional business book'"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={3}
                      style={{ fontSize: 11, resize: "none" }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        style={{ flex: 1, fontSize: 10, height: 26 }}
                        onClick={() => setAiOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        disabled={aiLoading || !aiPrompt.trim()}
                        style={{
                          flex: 2,
                          background: `linear-gradient(135deg, ${cA}, ${state.design.colorB})`,
                          fontSize: 10,
                          height: 26,
                          gap: 4,
                        }}
                        onClick={handleAiCover}
                      >
                        {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        {aiLoading ? "Gerando..." : "Gerar"}
                      </Button>
                    </div>
                  </div>
                )}

                {state.coverUrl && (
                  <button
                    onClick={() => update({ coverUrl: "" })}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "3px 0",
                      background: "none",
                      border: "none",
                      color: "#6B7FA8",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ✕ Remover capa
                  </button>
                )}
              </div>
            )}

            {/* ── Design ── */}
            {sideSection === "design" && (
              <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: 14 }}>
                <DesignField label="Cor principal">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={state.design.colorA}
                      onChange={(e) =>
                        update({ design: { ...state.design, colorA: e.target.value } })
                      }
                      style={{ width: 32, height: 26, border: "none", cursor: "pointer", borderRadius: 4, background: "none" }}
                    />
                    <span style={{ fontSize: 11, color: "#9BAAC8", fontFamily: "monospace" }}>
                      {state.design.colorA}
                    </span>
                  </div>
                </DesignField>

                <DesignField label="Cor secundária">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={state.design.colorB}
                      onChange={(e) =>
                        update({ design: { ...state.design, colorB: e.target.value } })
                      }
                      style={{ width: 32, height: 26, border: "none", cursor: "pointer", borderRadius: 4, background: "none" }}
                    />
                    <span style={{ fontSize: 11, color: "#9BAAC8", fontFamily: "monospace" }}>
                      {state.design.colorB}
                    </span>
                  </div>
                </DesignField>

                <DesignField label="Fonte">
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["sans", "serif"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => update({ design: { ...state.design, font: f } })}
                        style={{
                          flex: 1,
                          padding: "5px 0",
                          borderRadius: 6,
                          border: `1px solid ${state.design.font === f ? cA : "rgba(255,255,255,0.12)"}`,
                          background: state.design.font === f ? `${cA}20` : "none",
                          color: state.design.font === f ? "#F0F4FF" : "#6B7FA8",
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: f === "serif" ? "Georgia, serif" : "Inter, sans-serif",
                        }}
                      >
                        {f === "sans" ? "Sans-serif" : "Serifada"}
                      </button>
                    ))}
                  </div>
                </DesignField>

                {/* Preview gradient */}
                <div style={{ marginTop: 4 }}>
                  <p style={{ fontSize: 10, color: "#6B7FA8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Preview
                  </p>
                  <div
                    style={{
                      height: 60,
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${state.design.colorA}, ${state.design.colorB})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: state.design.font === "serif" ? "Georgia" : "Inter" }}>
                      {state.title.slice(0, 22)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => update({ design: { colorA: template.colorA, colorB: template.colorB, font: "sans" } })}
                  style={{
                    padding: "6px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    color: "#6B7FA8",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }}
                >
                  <Palette size={11} /> Restaurar cores do template
                </button>
              </div>
            )}

            {/* ── Export ── */}
            {sideSection === "export" && (
              <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
                <p style={{ fontSize: 10.5, color: "#6B7FA8", marginBottom: 2 }}>
                  Salve antes de exportar para incluir todas as edições.
                </p>

                <Button
                  size="sm"
                  disabled={pdfLoading}
                  style={{
                    background: `linear-gradient(135deg, ${cA}, ${state.design.colorB})`,
                    fontSize: 12,
                    height: 34,
                    gap: 6,
                    justifyContent: "flex-start",
                  }}
                  onClick={handleExportPdf}
                >
                  {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Exportar PDF Profissional
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 12, height: 34, gap: 6, justifyContent: "flex-start" }}
                  onClick={handleExportHtml}
                >
                  <FileText size={13} /> Exportar HTML
                </Button>

                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#6B7FA8",
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: "#9BAAC8" }}>PDF Profissional</strong> inclui: capa com suas cores, índice, capítulos formatados, checklists, exercícios, bônus e CTA final.
                </div>

                <div style={{ marginTop: 4, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "#9BAAC8", fontWeight: 600, marginBottom: 6 }}>
                    Estatísticas
                  </p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}>{state.chapters.length} capítulos</p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}>
                    {state.chapters
                      .reduce((s, c) => s + c.body.split(/\s+/).length, 0)
                      .toLocaleString("pt-BR")}{" "}
                    palavras
                  </p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}>{template.pages} páginas estimadas</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Editor ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
          {/* Meta */}
          {isMetaActive && (
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 22, color: "#F0F4FF" }}>
                Informações do Ebook
              </h2>
              <div style={{ display: "grid", gap: 14 }}>
                <Field label="Título">
                  <Input
                    value={state.title}
                    onChange={(e) => update({ title: e.target.value })}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }}
                  />
                </Field>
                <Field label="Subtítulo">
                  <Textarea
                    value={state.subtitle}
                    onChange={(e) => update({ subtitle: e.target.value })}
                    rows={2}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "none" }}
                  />
                </Field>
                <Field label="Autor">
                  <Input
                    value={state.author}
                    onChange={(e) => update({ author: e.target.value })}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }}
                  />
                </Field>
              </div>
              <div
                style={{
                  marginTop: 24,
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p style={{ fontSize: 12, color: "#9BAAC8", fontWeight: 600, marginBottom: 7 }}>
                  Proposta de Valor Original
                </p>
                <p style={{ fontSize: 12, color: "#6B7FA8", lineHeight: 1.7 }}>{template.meta.promise}</p>
                <p style={{ fontSize: 11, color: "#6B7FA8", marginTop: 7 }}>
                  <strong style={{ color: "#9BAAC8" }}>Mecanismo único:</strong> {template.meta.uniqueMechanism}
                </p>
                <p style={{ fontSize: 11, color: "#6B7FA8" }}>
                  <strong style={{ color: "#9BAAC8" }}>Transformação:</strong> {template.meta.transformation}
                </p>
              </div>
            </div>
          )}

          {/* Chapter editor */}
          {activeChapter && (
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {activeChapter.badge && (
                  <Badge
                    variant="outline"
                    style={{ borderColor: `${cA}50`, color: cA, fontSize: 10 }}
                  >
                    {activeChapter.badge}
                  </Badge>
                )}
              </div>

              <Input
                value={activeChapter.title}
                onChange={(e) => updateChapter(activeChapter.id, { title: e.target.value })}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                  color: "#F0F4FF",
                  fontSize: 20,
                  fontWeight: 700,
                  padding: "4px 0",
                  marginBottom: 14,
                  borderRadius: 0,
                  outline: "none",
                  fontFamily: "Georgia, serif",
                }}
              />

              {activeChapter.pullQuote !== undefined && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, color: "#6B7FA8", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                    Pull quote
                  </p>
                  <Textarea
                    value={activeChapter.pullQuote ?? ""}
                    onChange={(e) => updateChapter(activeChapter.id, { pullQuote: e.target.value })}
                    rows={2}
                    style={{
                      background: `${cA}08`,
                      border: `1px solid ${cA}22`,
                      color: "#9BAAC8",
                      fontStyle: "italic",
                      resize: "none",
                      fontSize: 13,
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 22 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <p style={{ fontSize: 10, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1 }}>
                    Conteúdo
                  </p>
                  <p style={{ fontSize: 10, color: "#4A5568" }}>
                    {activeChapter.body.split(/\s+/).length} palavras
                  </p>
                </div>
                <Textarea
                  value={activeChapter.body}
                  onChange={(e) => updateChapter(activeChapter.id, { body: e.target.value })}
                  rows={20}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#C8D4F0",
                    fontSize: 14,
                    lineHeight: 1.8,
                    resize: "vertical",
                    fontFamily:
                      state.design.font === "serif"
                        ? "Georgia, serif"
                        : "Inter, sans-serif",
                  }}
                />
              </div>

              {activeChapter.checklist && (
                <div
                  style={{
                    marginBottom: 18,
                    padding: "14px 18px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <p style={{ fontSize: 10, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    ✅ Checklist
                  </p>
                  {activeChapter.checklist.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, marginBottom: 5 }}>
                      <span style={{ color: "#6B7FA8", fontSize: 12, marginTop: 5 }}>•</span>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const nl = [...(activeChapter.checklist ?? [])];
                          nl[i] = e.target.value;
                          updateChapter(activeChapter.id, { checklist: nl });
                        }}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#C8D4F0",
                          fontSize: 12,
                          height: 30,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeChapter.exercise !== undefined && (
                <div
                  style={{
                    padding: "14px 18px",
                    background: `${cA}08`,
                    borderRadius: 10,
                    border: `1px solid ${cA}20`,
                  }}
                >
                  <p style={{ fontSize: 10, color: "#6B7FA8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>
                    📝 Exercício
                  </p>
                  <Textarea
                    value={activeChapter.exercise ?? ""}
                    onChange={(e) => updateChapter(activeChapter.id, { exercise: e.target.value })}
                    rows={4}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#C8D4F0",
                      fontSize: 12,
                      resize: "none",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Bonus editor */}
          {isBonusActive && state.bonus && (
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 22, color: "#F0F4FF" }}>
                🎁 Seção de Bônus
              </h2>
              <div style={{ display: "grid", gap: 14 }}>
                <Field label="Título do bônus">
                  <Input
                    value={state.bonus.title}
                    onChange={(e) => update({ bonus: { ...state.bonus!, title: e.target.value } })}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }}
                  />
                </Field>
                <Field label="Descrição">
                  <Textarea
                    value={state.bonus.description}
                    onChange={(e) => update({ bonus: { ...state.bonus!, description: e.target.value } })}
                    rows={2}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "none" }}
                  />
                </Field>
                <Field label="Itens do bônus">
                  {state.bonus.items.map((item, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const items = [...state.bonus!.items];
                          items[i] = e.target.value;
                          update({ bonus: { ...state.bonus!, items } });
                        }}
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", fontSize: 12 }}
                      />
                    </div>
                  ))}
                </Field>
              </div>
            </div>
          )}

          {/* CTA editor */}
          {isCtaActive && (
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 22, color: "#F0F4FF" }}>
                🎯 CTA Final
              </h2>
              <div style={{ display: "grid", gap: 14 }}>
                <Field label="Headline do CTA">
                  <Input
                    value={state.cta.headline}
                    onChange={(e) => update({ cta: { ...state.cta, headline: e.target.value } })}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }}
                  />
                </Field>
                <Field label="Corpo do texto">
                  <Textarea
                    value={state.cta.body}
                    onChange={(e) => update({ cta: { ...state.cta, body: e.target.value } })}
                    rows={3}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "none" }}
                  />
                </Field>
                <Field label="Texto do botão">
                  <Input
                    value={state.cta.buttonText}
                    onChange={(e) => update({ cta: { ...state.cta, buttonText: e.target.value } })}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }}
                  />
                </Field>
                <Field label="Urgência">
                  <Input
                    value={state.cta.urgency}
                    onChange={(e) => update({ cta: { ...state.cta, urgency: e.target.value } })}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF" }}
                  />
                </Field>
                <Field label="Mensagem final">
                  <Textarea
                    value={state.finalPage}
                    onChange={(e) => update({ finalPage: e.target.value })}
                    rows={5}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#F0F4FF", resize: "vertical" }}
                  />
                </Field>
              </div>

              {/* CTA preview */}
              <div
                style={{
                  marginTop: 28,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: `linear-gradient(140deg, ${cA}, ${state.design.colorB})`,
                  padding: "32px 28px",
                  textAlign: "center",
                }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                  {state.cta.headline}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,.85)",
                    marginBottom: 18,
                    maxWidth: 440,
                    margin: "0 auto 18px",
                  }}
                >
                  {state.cta.body}
                </p>
                <div
                  style={{
                    display: "inline-block",
                    background: "#fff",
                    color: state.design.colorB,
                    padding: "10px 24px",
                    borderRadius: 7,
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {state.cta.buttonText}
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{state.cta.urgency}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SideItem({
  label,
  active,
  onClick,
  color,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "7px 13px",
        background: active ? `${color}15` : "none",
        border: "none",
        borderLeft: `3px solid ${active ? color : "transparent"}`,
        color: active ? "#F0F4FF" : "#6B7FA8",
        fontSize: 11.5,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1.35,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {badge && !active && (
        <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.45 }}>({badge})</span>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          color: "#6B7FA8",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 5,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function DesignField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          color: "#6B7FA8",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
