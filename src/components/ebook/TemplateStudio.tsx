import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlignLeft, AlertCircle, ArrowLeft, BookMarked, BookOpen, Check, CheckSquare,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Download, Eye, EyeOff,
  FileText, Image as ImageIcon, Info, ListOrdered, Loader2, Minus, Palette, Plus,
  Quote, RefreshCw, Save, Settings, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  generateEbookCoverFn, generateMultiLanguageBookFn,
  generateOutlineFn, generateChapterDraftFn, editChapterFn, consistencyCheckFn,
} from "@/lib/storybook.functions";
import {
  saveCover, loadCover, deleteCover, restoreCoverOnMount,
  loadCoverForLang, saveCoverForLang, clearCoverForLang,
} from "@/lib/ebook/cover-storage";
import { generateEbookPDF, type PdfChapter } from "@/lib/pdf-generator";
import type { TemplateMaster, TemplateChapter } from "@/lib/ebook/template-master";
import type { DesignConfig } from "@/lib/pdf-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = "text" | "quote" | "callout" | "checklist" | "image" | "divider" | "cta";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  meta?: { level?: "info" | "success" | "warning"; imageUrl?: string };
}

interface StudioChapter {
  id: string;
  title: string;
  badge?: string;
  blocks: Block[];
}

export interface EbookConfig {
  pages: number;
  language: "pt-BR" | "pt-PT" | "en-US" | "es" | "fr" | "it" | "de";
  tone: "formal" | "informal" | "inspiracional" | "técnico" | "storytelling";
  goal: string;
  avatar: string;
  publicLevel: "iniciante" | "intermediário" | "avançado";
  structure: "linear" | "modular" | "workbook";
  includeExercises: boolean;
  includeChecklist: boolean;
  includeCTA: boolean;
  includeBonus: boolean;
  visualStyle: "clean" | "minimalista" | "premium" | "luxury" | "dark" | "feminino" | "corporate" | "neon";
}

export interface StudioState {
  title: string;
  subtitle: string;
  author: string;
  coverUrl: string;
  chapters: StudioChapter[];
  bonus?: { title: string; description: string; items: string[] };
  cta: { headline: string; body: string; buttonText: string; urgency: string };
  finalPage: string;
  design: DesignConfig;
  config: EbookConfig;
  bible: BookBible;
  outline: EbookOutline | null;
  pipeline: ChapterPipeline[];
  consistencyReport: ConsistencyReport | null;
}

// ─── mkbook pipeline types ────────────────────────────────────────────────────

interface BookBible {
  promise: string;
  audience: string;
  toneAdjectives: string;
  goal: string;
  keywords: string;
  redLines: string;
  salesModel: string;
  voiceSamples: string;
  targetChapters: number;
  personalStories: string;
  genre: string;
}

interface OutlineChapter {
  number: number;
  title: string;
  promise: string;
  transformation: string;
  wordTarget: number;
  notes: string;
}

interface EbookOutline {
  intro: string;
  chapters: OutlineChapter[];
  conclusion: string;
  generatedAt: string;
}

interface ChapterPipeline {
  chapterId: string;
  draft: string;
  edited: string;
  scoreBefore?: number;
  scoreAfter?: number;
  changes?: string[];
  isDraftGenerated: boolean;
  isEdited: boolean;
  lastUpdated?: string;
}

interface ConsistencyIssue {
  type: string;
  chapter: string;
  problem: string;
  fix: string;
}

interface ConsistencyReport {
  isClean: boolean;
  issues: ConsistencyIssue[];
  generatedAt: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function migrateChapter(ch: TemplateChapter): StudioChapter {
  const blocks: Block[] = [];
  if (ch.pullQuote) blocks.push({ id: uid(), type: "quote", content: ch.pullQuote });
  for (const para of ch.body.split(/\n{2,}/)) {
    const t = para.trim();
    if (t) blocks.push({ id: uid(), type: "text", content: t });
  }
  if (ch.checklist?.length) {
    blocks.push({ id: uid(), type: "checklist", content: ch.checklist.join("\n") });
  }
  if (ch.exercise) {
    blocks.push({ id: uid(), type: "callout", content: ch.exercise, meta: { level: "info" } });
  }
  return { id: ch.id, title: ch.title, badge: ch.badge, blocks };
}

function defaultConfig(template: TemplateMaster): EbookConfig {
  return {
    pages: template.pages,
    language: "pt-BR",
    tone: "informal",
    goal: template.meta.promise,
    avatar: template.meta.audience,
    publicLevel: template.level === "Iniciante" ? "iniciante" : template.level === "Premium" ? "intermediário" : "avançado",
    structure: "linear",
    includeExercises: true,
    includeChecklist: true,
    includeCTA: true,
    includeBonus: !!template.bonus,
    visualStyle: "premium",
  };
}

function defaultBible(template: TemplateMaster): BookBible {
  return {
    promise: template.meta.promise,
    audience: template.meta.audience,
    toneAdjectives: "claro, prático, inspirador",
    goal: template.meta.transformation,
    keywords: template.category,
    redLines: "",
    salesModel: "lead magnet",
    voiceSamples: "",
    targetChapters: template.chapters.length || 8,
    personalStories: "",
    genre: "",
  };
}

function loadState(template: TemplateMaster): StudioState {
  try {
    const raw = localStorage.getItem(`ebook-studio-${template.id}`);
    if (raw) {
      const p = JSON.parse(raw) as Partial<StudioState>;
      return {
        title: p.title ?? template.meta.title,
        subtitle: p.subtitle ?? template.meta.subtitle,
        author: p.author ?? template.meta.authorPlaceholder,
        coverUrl: restoreCoverOnMount(template.id),
        chapters: p.chapters
          ? p.chapters.map((ch) =>
              Array.isArray((ch as StudioChapter).blocks)
                ? (ch as StudioChapter)
                : migrateChapter(ch as unknown as TemplateChapter),
            )
          : template.chapters.map(migrateChapter),
        bonus: p.bonus ?? (template.bonus ? { ...template.bonus } : undefined),
        cta: p.cta ?? { ...template.cta },
        finalPage: p.finalPage ?? template.finalPage,
        design: p.design ?? { colorA: template.colorA, colorB: template.colorB, font: "sans" },
        config: p.config ?? defaultConfig(template),
        bible: (p as Partial<StudioState>).bible ?? defaultBible(template),
        outline: (p as Partial<StudioState>).outline ?? null,
        pipeline: (p as Partial<StudioState>).pipeline ?? [],
        consistencyReport: (p as Partial<StudioState>).consistencyReport ?? null,
      };
    }
  } catch { /* ignore */ }
  return {
    title: template.meta.title,
    subtitle: template.meta.subtitle,
    author: template.meta.authorPlaceholder,
    coverUrl: restoreCoverOnMount(template.id),
    chapters: template.chapters.map(migrateChapter),
    bonus: template.bonus ? { ...template.bonus } : undefined,
    cta: { ...template.cta },
    finalPage: template.finalPage,
    design: { colorA: template.colorA, colorB: template.colorB, font: "sans" },
    config: defaultConfig(template),
    bible: defaultBible(template),
    outline: null,
    pipeline: [],
    consistencyReport: null,
  };
}

async function toPdfChapters(chapters: StudioChapter[]): Promise<PdfChapter[]> {
  return Promise.all(chapters.map(async (ch) => {
    const blocks: Block[] = Array.isArray(ch.blocks) ? ch.blocks : [];
    const textContent = blocks
      .filter((b) => b.type === "text" || b.type === "cta")
      .map((b) => b.content)
      .join("\n\n");
    const quoteBlock = blocks.find((b) => b.type === "quote");
    const checkBlock = blocks.find((b) => b.type === "checklist");
    const calloutBlock = blocks.find((b) => b.type === "callout");
    const imageBlocks = blocks.filter((b) => b.type === "image" && b.meta?.imageUrl);
    const images = await Promise.all(
      imageBlocks.map(async (b) => {
        const dataUrl = b.meta!.imageUrl!;
        const aspectRatio = await new Promise<number>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.width / Math.max(img.height, 1));
          img.onerror = () => resolve(4 / 3);
          img.src = dataUrl;
        });
        return { dataUrl, aspectRatio };
      }),
    );
    return {
      id: ch.id,
      title: ch.title,
      badge: ch.badge,
      body: textContent,
      pullQuote: quoteBlock?.content,
      checklist: checkBlock?.content.split("\n").filter(Boolean),
      exercise: calloutBlock?.content,
      images: images.length > 0 ? images : undefined,
    };
  }));
}

// ─── Block metadata ───────────────────────────────────────────────────────────

const BLOCK_DEFS: Record<BlockType, { label: string; color: string; placeholder: string }> = {
  text:      { label: "Texto",    color: "#9BAAC8", placeholder: "Escreva o conteúdo aqui..." },
  quote:     { label: "Citação", color: "#60A5FA", placeholder: "Digite a citação..." },
  callout:   { label: "Destaque", color: "#FBBF24", placeholder: "Exercício, dica ou destaque importante..." },
  checklist: { label: "Checklist", color: "#34D399", placeholder: "Item 1\nItem 2\nItem 3" },
  image:     { label: "Imagem",   color: "#A78BFA", placeholder: "" },
  divider:   { label: "Divisor",  color: "#4B5563", placeholder: "" },
  cta:       { label: "CTA",      color: "#F87171", placeholder: "Texto do call-to-action..." },
};

const BLOCK_TYPES_MENU: BlockType[] = ["text", "quote", "callout", "checklist", "image", "divider", "cta"];

// ─── Block Item ───────────────────────────────────────────────────────────────

function BlockItem({
  block, index, total, colorA,
  onChange, onDelete, onMoveUp, onMoveDown, onDuplicate,
}: {
  block: Block; index: number; total: number; colorA: string;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const def = BLOCK_DEFS[block.type];
  const fileRef = useRef<HTMLInputElement>(null);

  const containerStyle: React.CSSProperties = (() => {
    switch (block.type) {
      case "quote":
        return { borderLeft: `3px solid ${colorA}`, paddingLeft: 14, background: `${colorA}08`, borderRadius: "0 6px 6px 0" };
      case "callout":
        return { background: "#FBBF2410", border: "1px solid #FBBF2428", borderRadius: 8, padding: "12px 14px" };
      case "checklist":
        return { background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 8, padding: "12px 14px" };
      case "image":
        return { border: "2px dashed rgba(167,139,250,0.3)", borderRadius: 8, padding: 20, textAlign: "center" };
      case "cta":
        return { background: `linear-gradient(135deg,${colorA}22,${colorA}0a)`, border: `1px solid ${colorA}35`, borderRadius: 10, padding: "14px 16px", textAlign: "center" };
      case "divider":
        return { padding: "6px 0" };
      default:
        return {};
    }
  })();

  function renderView() {
    if (block.type === "divider") {
      return <div style={{ height: 1, background: "rgba(255,255,255,0.10)" }} />;
    }
    if (block.type === "image") {
      if (block.meta?.imageUrl) {
        return <img src={block.meta.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 6, maxHeight: 260, objectFit: "cover" }} />;
      }
      return (
        <div style={{ color: "#9BAAC8", fontSize: 13, cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
          <ImageIcon size={28} style={{ opacity: 0.35, display: "block", margin: "0 auto 8px" }} />
          Clique para adicionar imagem
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange({ ...block, meta: { ...block.meta, imageUrl: reader.result as string } });
            reader.readAsDataURL(file);
          }} />
        </div>
      );
    }
    if (block.type === "quote") {
      return <div style={{ fontSize: 14, fontStyle: "italic", color: "#C8D4F0", lineHeight: 1.75 }}>"{block.content || "..."}"</div>;
    }
    if (block.type === "callout") {
      return (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#FBBF24", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>
            📝 Exercício / Destaque
          </div>
          <div style={{ fontSize: 13, color: "#C8D4F0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{block.content || "..."}</div>
        </div>
      );
    }
    if (block.type === "checklist") {
      return (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#34D399", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>✔ Checklist</div>
          {(block.content || "").split("\n").filter(Boolean).map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C8D4F0", marginBottom: 4 }}>
              <div style={{ width: 14, height: 14, border: "1.5px solid #34D39950", borderRadius: 3, flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>
      );
    }
    if (block.type === "cta") {
      return (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: colorA, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>🎯 CTA</div>
          <div style={{ fontSize: 14, color: "#F0F4FF", lineHeight: 1.6, marginBottom: 10, whiteSpace: "pre-wrap" }}>{block.content || "..."}</div>
          <div style={{ display: "inline-block", background: colorA, color: "#fff", padding: "7px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            Clique aqui
          </div>
        </div>
      );
    }
    return <div style={{ fontSize: 14, lineHeight: 1.85, color: "#C8D4F0", whiteSpace: "pre-wrap" }}>{block.content || <span style={{ opacity: 0.3, fontStyle: "italic" }}>Vazio — clique para editar</span>}</div>;
  }

  return (
    <div style={{ position: "relative", marginTop: 22 }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Toolbar */}
      <div style={{
        position: "absolute", top: -20, left: 0, right: 0, height: 20,
        display: "flex", alignItems: "center", gap: 3,
        opacity: hovered || editing ? 1 : 0, transition: "opacity 0.15s",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: def.color, background: "#1A2236", border: `1px solid ${def.color}30`, borderRadius: "3px 3px 0 0", padding: "2px 7px", letterSpacing: 0.5 }}>
          {def.label.toUpperCase()}
        </span>
        <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
          {index > 0 && <ToolBtn title="Mover cima" onClick={onMoveUp}><ChevronUp size={10} /></ToolBtn>}
          {index < total - 1 && <ToolBtn title="Mover baixo" onClick={onMoveDown}><ChevronDown size={10} /></ToolBtn>}
          <ToolBtn title="Duplicar" onClick={onDuplicate}><Copy size={9} /></ToolBtn>
          <ToolBtn title="Excluir" onClick={onDelete} danger><Trash2 size={9} /></ToolBtn>
        </div>
      </div>

      {/* Block body */}
      <div
        onClick={() => !editing && block.type !== "divider" && block.type !== "image" && setEditing(true)}
        style={{
          ...containerStyle,
          padding: containerStyle.padding ?? "7px 2px",
          cursor: block.type === "divider" || block.type === "image" ? "default" : "text",
          outline: editing ? `1px solid ${colorA}60` : hovered ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
          borderRadius: (containerStyle as React.CSSProperties).borderRadius ?? 4,
          transition: "outline 0.12s",
          minHeight: 28,
        }}
      >
        {editing && block.type !== "divider" && block.type !== "image" ? (
          <Textarea
            autoFocus
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            onBlur={() => setEditing(false)}
            rows={block.type === "checklist" ? 5 : block.type === "callout" ? 4 : 3}
            placeholder={def.placeholder}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              color: block.type === "quote" ? "#C8D4F0" : "#C8D4F0",
              fontStyle: block.type === "quote" ? "italic" : "normal",
              fontSize: 14, lineHeight: 1.85, resize: "vertical", padding: 0,
              fontFamily: "inherit", boxShadow: "none",
            }}
          />
        ) : renderView()}
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 18, background: "#1A2236",
      border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3,
      color: danger ? "#F87171" : "#9BAAC8", cursor: "pointer", padding: 0,
    }}>
      {children}
    </button>
  );
}

// ─── Full Preview Modal ───────────────────────────────────────────────────────

function FullPreviewModal({
  state, template, onClose,
}: {
  state: StudioState;
  template: TemplateMaster;
  onClose: () => void;
}) {
  const cA = state.design.colorA;
  const cB = state.design.colorB;
  const ff = state.design.font === "serif" ? "Georgia,serif" : "Inter,sans-serif";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function renderBlock(block: Block): React.ReactNode {
    switch (block.type) {
      case "divider":
        return <hr key={block.id} style={{ border: "none", borderTop: `1px solid ${cA}25`, margin: "20px 0" }} />;
      case "image":
        return block.meta?.imageUrl ? (
          <div key={block.id} style={{ textAlign: "center", margin: "24px 0" }}>
            <img src={block.meta.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, boxShadow: "0 2px 16px rgba(0,0,0,0.1)" }} />
          </div>
        ) : null;
      case "quote":
        return (
          <blockquote key={block.id} style={{ borderLeft: `4px solid ${cA}`, background: `${cA}06`, borderRadius: "0 8px 8px 0", padding: "14px 18px 14px 20px", margin: "20px 0", fontStyle: "italic", color: "#555" }}>
            <span style={{ fontSize: 15, lineHeight: 1.8 }}>"{block.content}"</span>
          </blockquote>
        );
      case "callout":
        return (
          <div key={block.id} style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "16px 20px", margin: "20px 0" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>📝 Exercício</p>
            <p style={{ color: "#78350F", margin: 0, lineHeight: 1.75, fontSize: 14 }}>{block.content}</p>
          </div>
        );
      case "checklist":
        return (
          <div key={block.id} style={{ background: "#f8fafb", borderRadius: 8, padding: "16px 20px", margin: "20px 0" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#374151", margin: "0 0 12px" }}>✔ Checklist</p>
            {block.content.split("\n").filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 7 }}>
                <div style={{ width: 16, height: 16, border: `1.5px solid ${cA}60`, borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, color: "#333", lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        );
      case "cta":
        return (
          <div key={block.id} style={{ background: `linear-gradient(135deg,${cA}18,${cA}08)`, border: `1px solid ${cA}30`, borderRadius: 10, padding: "22px 24px", margin: "20px 0", textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 14px", lineHeight: 1.5 }}>{block.content}</p>
            <span style={{ display: "inline-block", background: cA, color: "#fff", padding: "9px 26px", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>Clique aqui</span>
          </div>
        );
      default:
        return block.content ? (
          <p key={block.id} style={{ fontSize: 15, lineHeight: 1.9, color: "#222", margin: "0 0 16px", fontFamily: ff, whiteSpace: "pre-wrap" }}>{block.content}</p>
        ) : null;
    }
  }

  const page: React.CSSProperties = {
    width: "100%", maxWidth: 794, background: "#fff",
    borderRadius: 6, boxShadow: "0 6px 40px rgba(0,0,0,0.5)",
    marginBottom: 20, overflow: "hidden",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(5,8,20,0.96)", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 20px 40px" }}
      onClick={onClose}
    >
      {/* Close bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2200, background: "rgba(8,13,26,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,255,255,0.08)", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <span style={{ fontSize: 13, color: "#9BAAC8" }}>{template.emoji} {state.title}</span>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F0F4FF", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
          <X size={13} /> Fechar (Esc)
        </button>
      </div>

      {/* Page 1 — Cover */}
      <div style={page} onClick={(e) => e.stopPropagation()}>
        <div style={{ minHeight: 560, background: state.coverUrl ? `url(${state.coverUrl}) center/cover no-repeat` : `linear-gradient(145deg,${cA},${cB})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 48px", textAlign: "center" }}>
          {!state.coverUrl && <p style={{ fontSize: 56, margin: "0 0 20px" }}>{template.emoji}</p>}
          <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: "0 0 14px", fontFamily: ff, textShadow: "0 2px 16px rgba(0,0,0,0.4)" }}>{state.title}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.8)", margin: "0 0 28px", fontFamily: ff, maxWidth: 420 }}>{state.subtitle}</p>
          <div style={{ width: 40, height: 2, background: "rgba(255,255,255,0.45)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontFamily: ff }}>por {state.author}</p>
        </div>
      </div>

      {/* Page 2 — Table of contents */}
      <div style={page} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "48px 52px", fontFamily: ff }}>
          <div style={{ borderLeft: `5px solid ${cA}`, paddingLeft: 18, marginBottom: 36 }}>
            <p style={{ fontSize: 11, color: cA, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, margin: "0 0 4px" }}>Conteúdo</p>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111", margin: 0 }}>Sumário</h2>
          </div>
          {state.chapters.map((ch, i) => (
            <div key={ch.id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: cA, minWidth: 28 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 15, color: "#111", flex: 1, lineHeight: 1.4 }}>{ch.title}</span>
              {ch.badge && <span style={{ fontSize: 11, color: "#888", background: "#f5f5f5", padding: "2px 8px", borderRadius: 10, flexShrink: 0 }}>{ch.badge}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Chapter pages */}
      {state.chapters.map((ch, chIdx) => (
        <div key={ch.id} style={page} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: `linear-gradient(135deg,${cA},${cB})`, padding: "24px 52px 20px" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, margin: "0 0 6px" }}>Capítulo {chIdx + 1}</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>{ch.title}</h2>
            {ch.badge && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "8px 0 0" }}>{ch.badge}</p>}
          </div>
          <div style={{ padding: "32px 52px 48px", fontFamily: ff }}>
            {(Array.isArray(ch.blocks) ? ch.blocks : []).map(renderBlock)}
          </div>
        </div>
      ))}

      {/* Last page — Author */}
      <div style={page} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "64px 52px", textAlign: "center", fontFamily: ff, display: "flex", flexDirection: "column", alignItems: "center", minHeight: 360 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg,${cA},${cB})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: `0 4px 24px ${cA}40` }}>
            <span style={{ fontSize: 36 }}>✍</span>
          </div>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 14px" }}>{state.author}</h3>
          {state.bible?.salesModel ? (
            <p style={{ fontSize: 15, color: "#555", maxWidth: 440, lineHeight: 1.75, margin: "0 auto 28px" }}>{state.bible.salesModel}</p>
          ) : null}
          <div style={{ width: 48, height: 3, background: `linear-gradient(90deg,${cA},${cB})`, borderRadius: 2, margin: "0 auto 20px" }} />
          <p style={{ fontSize: 13, color: "#aaa" }}>{state.title}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Add Block Menu ───────────────────────────────────────────────────────────

function AddBlockMenu({ colorA, onAdd, onAddImage }: { colorA: string; onAdd: (type: BlockType) => void; onAddImage: (dataUrl: string) => void }) {
  const [open, setOpen] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ position: "relative", marginTop: 18, textAlign: "center" }}>
      <input
        ref={imgInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => { onAddImage(reader.result as string); setOpen(false); };
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px",
          background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: 8, color: "#6B7FA8", fontSize: 12, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${colorA}60`; (e.currentTarget as HTMLElement).style.color = colorA; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#6B7FA8"; }}
      >
        <Plus size={13} /> Adicionar bloco
      </button>
      {open && (
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)", top: 38, zIndex: 50,
          background: "#161D2E", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
          padding: 6, display: "flex", gap: 4, flexWrap: "wrap", width: 260,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {BLOCK_TYPES_MENU.map((type) => {
            const def = BLOCK_DEFS[type];
            return (
              <button key={type} onClick={() => {
                if (type === "image") { imgInputRef.current?.click(); return; }
                onAdd(type); setOpen(false);
              }} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${def.color}25`,
                borderRadius: 6, color: def.color, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                minWidth: 110,
              }}>
                {type === "text" && <AlignLeft size={11} />}
                {type === "quote" && <Quote size={11} />}
                {type === "callout" && <Info size={11} />}
                {type === "checklist" && <Check size={11} />}
                {type === "image" && <ImageIcon size={11} />}
                {type === "divider" && <Minus size={11} />}
                {type === "cta" && <Download size={11} />}
                {def.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({ state, template, chapterIndex }: { state: StudioState; template: TemplateMaster; chapterIndex: number }) {
  const ch = state.chapters[chapterIndex];
  const cA = state.design.colorA;
  const cB = state.design.colorB;
  const ff = state.design.font === "serif" ? "Georgia,serif" : "Inter,sans-serif";

  if (!ch) return null;

  return (
    <div style={{ padding: "16px 12px", height: "100%", overflowY: "auto" }}>
      <p style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, textAlign: "center" }}>
        Preview · A4
      </p>
      {/* Scaled page mockup */}
      <div style={{
        width: "100%", aspectRatio: "0.707", background: "#fff", borderRadius: 4,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)", overflow: "hidden", position: "relative",
        fontFamily: ff,
      }}>
        {/* Chapter header band */}
        <div style={{ background: `linear-gradient(135deg,${cA},${cB})`, height: "12%", display: "flex", alignItems: "flex-end", padding: "0 14px 8px" }}>
          <div>
            <div style={{ fontSize: 6, color: "rgba(255,255,255,0.65)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Cap. {chapterIndex + 1}
              {ch.badge && ` · ${ch.badge}`}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginTop: 2 }}>
              {ch.title}
            </div>
          </div>
        </div>
        {/* Content area */}
        <div style={{ padding: "10px 14px 14px", height: "88%", overflowY: "hidden" }}>
          {ch.blocks.slice(0, 8).map((block) => {
            if (block.type === "divider") return <div key={block.id} style={{ height: 1, background: `${cA}30`, margin: "6px 0" }} />;
            if (block.type === "quote") return (
              <div key={block.id} style={{ borderLeft: `2px solid ${cA}`, paddingLeft: 6, marginBottom: 5, fontStyle: "italic" }}>
                <div style={{ fontSize: 6.5, color: "#555", lineHeight: 1.5 }}>"{block.content.slice(0, 80)}{block.content.length > 80 ? "..." : ""}"</div>
              </div>
            );
            if (block.type === "callout") return (
              <div key={block.id} style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 3, padding: "4px 6px", marginBottom: 5 }}>
                <div style={{ fontSize: 5.5, fontWeight: 700, color: "#92400E", marginBottom: 2 }}>EXERCÍCIO</div>
                <div style={{ fontSize: 6, color: "#78350F", lineHeight: 1.5 }}>{block.content.slice(0, 80)}{block.content.length > 80 ? "..." : ""}</div>
              </div>
            );
            if (block.type === "checklist") return (
              <div key={block.id} style={{ marginBottom: 5 }}>
                {block.content.split("\n").filter(Boolean).slice(0, 3).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <div style={{ width: 6, height: 6, border: `1px solid ${cA}`, borderRadius: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 6, color: "#444", lineHeight: 1.4 }}>{item.slice(0, 40)}</span>
                  </div>
                ))}
              </div>
            );
            if (block.type === "cta") return (
              <div key={block.id} style={{ background: `linear-gradient(135deg,${cA}15,${cA}05)`, border: `1px solid ${cA}25`, borderRadius: 4, padding: "5px 6px", marginBottom: 5, textAlign: "center" }}>
                <div style={{ fontSize: 6, color: cA, fontWeight: 700 }}>{block.content.slice(0, 40)}</div>
              </div>
            );
            if (block.type === "image" && block.meta?.imageUrl) return (
              <div key={block.id} style={{ textAlign: "center", marginBottom: 5 }}>
                <img src={block.meta.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 3 }} />
              </div>
            );
            return (
              <div key={block.id} style={{ fontSize: 6.5, color: "#333", lineHeight: 1.65, marginBottom: 5 }}>
                {block.content.slice(0, 200)}{block.content.length > 200 ? "..." : ""}
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 14,
          background: "#F8F8F8", borderTop: `1px solid ${cA}15`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 14px", fontSize: 5.5, color: "#999",
        }}>
          <span>{state.title.slice(0, 30)}</span>
          <span>{chapterIndex + 2}</span>
        </div>
      </div>

      {/* Cover preview */}
      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, textAlign: "center" }}>Capa</p>
        <div style={{
          width: "100%", aspectRatio: "0.707",
          background: state.coverUrl
            ? `url(${state.coverUrl}) center/cover no-repeat`
            : `linear-gradient(145deg,${cA},${cB})`,
          borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.35)", overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "12px 14px",
        }}>
          {/* FLOW seal */}
          <div style={{
            position: "absolute", top: 6, right: 6,
            background: "linear-gradient(135deg,#FFD700,#FFA500)",
            borderRadius: "50%", width: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 5, fontWeight: 900, color: "#000",
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)", letterSpacing: 0.5,
          }}>FLOW</div>
          {!state.coverUrl && (
            <>
              <div style={{ fontSize: 24, textAlign: "center", marginBottom: 6 }}>{template.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", lineHeight: 1.3, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                {state.title.slice(0, 35)}
              </div>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 4 }}>
                por {state.author}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Sections ─────────────────────────────────────────────────────────

type SideTab = "bible" | "outline" | "conteudo" | "design" | "capa" | "exportar";

function SideLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: "#9BAAC8", fontWeight: 600, marginBottom: 8, letterSpacing: 0.2 }}>{children}</p>;
}

function SideGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginBottom: 22, ...style }}>{children}</div>;
}

function ConfigToggle({ label, value, onChange, color }: { label: string; value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 0", cursor: "pointer", userSelect: "none",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: 14, color: "#C8D4F0" }}>{label}</span>
      <div style={{
        width: 38, height: 22, borderRadius: 11, background: value ? color : "rgba(255,255,255,0.10)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16,
          borderRadius: "50%", background: "#fff", transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }} />
      </div>
    </div>
  );
}

// ─── Cover utilities ──────────────────────────────────────────────────────────

async function compressForStorage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const scale = img.width > MAX ? MAX / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(blobUrl); reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl); // revoke immediately — result is JPEG data URL
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("load")); };
    img.src = blobUrl;
  });
}

function generateFallbackCover(
  title: string,
  subtitle: string,
  author: string,
  colorA: string,
  colorB: string,
  pages: number,
  chapters: number,
  category?: string,
): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function wrapLines(text: string, maxChars: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars) {
        if (cur) lines.push(cur);
        cur = w;
        if (lines.length >= 3) break;
      } else {
        cur = (cur + " " + w).trim();
      }
    }
    if (cur && lines.length < 3) lines.push(cur);
    return lines.slice(0, 3);
  }

  const titleLines = wrapLines(esc(title), 20);
  const titleSvg = titleLines
    .map(
      (l, i) =>
        `<text x="30" y="${200 + i * 36}" font-family="system-ui,sans-serif" ` +
        `font-size="28" font-weight="900" fill="#FFFFFF">${l}</text>`,
    )
    .join("\n");
  const catW = category ? esc(category).length * 7 + 24 : 0;
  const subY = 200 + titleLines.length * 36 + 28;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 594" width="420" height="594">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="420" y2="594" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#070B17"/>
    <stop offset="100%" stop-color="#0C1428"/>
  </linearGradient>
  <radialGradient id="glo" cx="210" cy="220" r="230" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="${colorA}" stop-opacity="0.3"/>
    <stop offset="100%" stop-color="${colorA}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${colorA}"/>
    <stop offset="100%" stop-color="${colorB}"/>
  </linearGradient>
</defs>
<rect width="420" height="594" fill="url(#bg)"/>
<rect width="420" height="594" fill="url(#glo)"/>
<rect x="0" y="0" width="7" height="594" fill="url(#acc)"/>
<rect x="0" y="0" width="420" height="4" fill="url(#acc)"/>
<rect x="0" y="590" width="420" height="4" fill="url(#acc)"/>
${category ? `<rect x="26" y="46" width="${catW}" height="24" rx="12" fill="${colorA}" fill-opacity="0.14"/>
<rect x="26" y="46" width="${catW}" height="24" rx="12" fill="none" stroke="${colorA}" stroke-opacity="0.45" stroke-width="1"/>
<text x="38" y="62" font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="${colorA}">${esc(category)}</text>` : ""}
${titleSvg}
<text x="30" y="${subY}" font-family="system-ui,sans-serif" font-size="13" fill="rgba(255,255,255,0.55)">${esc(subtitle).slice(0, 55)}</text>
<text x="30" y="540" font-family="system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)">por ${esc(author)}</text>
<text x="30" y="558" font-family="system-ui,sans-serif" font-size="10" fill="rgba(255,255,255,0.25)">${pages} páginas · ${chapters} capítulos</text>
<circle cx="382" cy="50" r="30" fill="${colorA}" fill-opacity="0.12" stroke="rgba(255,215,0,0.45)" stroke-width="1.5"/>
<text x="382" y="47" font-family="system-ui,sans-serif" font-size="9" font-weight="900" fill="#FFD700" text-anchor="middle">FLOW</text>
<text x="382" y="59" font-family="system-ui,sans-serif" font-size="7" fill="rgba(255,215,0,0.7)" text-anchor="middle">STUDIO</text>
</svg>`;

  try {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  } catch { return ""; }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateStudio({ template }: { template: TemplateMaster }) {
  const navigate = useNavigate();
  const [state, setState] = useState<StudioState>(() => loadState(template));
  const [sideTab, setSideTab] = useState<SideTab>("bible");
  const [chapterIdx, setChapterIdx] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(template.coverPrompt ?? "");
  const [coverTab, setCoverTab] = useState<"preview" | "ai" | "upload">("preview");
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [aiCoverError, setAiCoverError] = useState<"quota" | "unavailable" | "unknown" | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const genCover = useServerFn(generateEbookCoverFn);
  const genMultiLang = useServerFn(generateMultiLanguageBookFn);
  const genOutline = useServerFn(generateOutlineFn);
  const genChapterDraft = useServerFn(generateChapterDraftFn);
  const editChapter = useServerFn(editChapterFn);
  const checkConsistency = useServerFn(consistencyCheckFn);
  const [multiLangLoading, setMultiLangLoading] = useState(false);
  const [multiLangProgress, setMultiLangProgress] = useState("");
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [chapterGenLoading, setChapterGenLoading] = useState<number | null>(null);
  const [chapterEditLoading, setChapterEditLoading] = useState<number | null>(null);
  const [chapterCruelLoading, setChapterCruelLoading] = useState<number | null>(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [consistencyModalOpen, setConsistencyModalOpen] = useState(false);

  const cA = state.design.colorA;
  const cB = state.design.colorB;
  const BD = "rgba(255,255,255,0.07)";

  // Auto-save with debounce
  useEffect(() => {
    if (!dirty) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      // Store cover separately (in ebook_covers_v2) — never in the full state —
      // to prevent the base64 image from pushing the entry over the 5 MB quota.
      const { coverUrl: _cv, ...stateWithoutCover } = state;
      void _cv;
      localStorage.setItem(`ebook-studio-${template.id}`, JSON.stringify(stateWithoutCover));
      setSaving(true);
      setTimeout(() => setSaving(false), 1200);
      setDirty(false);
    }, 1400);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [state, dirty, template.id]);

  const update = useCallback((patch: Partial<StudioState>) => {
    setState((p) => ({ ...p, ...patch }));
    setDirty(true);
  }, []);

  const updateChapter = useCallback((idx: number, patch: Partial<StudioChapter>) => {
    setState((p) => {
      const chapters = [...p.chapters];
      chapters[idx] = { ...chapters[idx], ...patch };
      return { ...p, chapters };
    });
    setDirty(true);
  }, []);

  const updateBlocks = useCallback((idx: number, blocks: Block[]) => {
    updateChapter(idx, { blocks });
  }, [updateChapter]);

  // Chapter management
  function addChapter() {
    const newCh: StudioChapter = {
      id: uid(),
      title: `Capítulo ${state.chapters.length + 1}`,
      blocks: [{ id: uid(), type: "text", content: "" }],
    };
    setState((p) => ({ ...p, chapters: [...p.chapters, newCh] }));
    setChapterIdx(state.chapters.length);
    setDirty(true);
  }

  function deleteChapter(idx: number) {
    if (state.chapters.length <= 1) return;
    setState((p) => {
      const chapters = p.chapters.filter((_, i) => i !== idx);
      return { ...p, chapters };
    });
    setChapterIdx((prev) => Math.min(prev, state.chapters.length - 2));
    setDirty(true);
  }

  function duplicateChapter(idx: number) {
    const ch = state.chapters[idx];
    const copy: StudioChapter = {
      ...ch,
      id: uid(),
      title: `${ch.title} (cópia)`,
      blocks: ch.blocks.map((b) => ({ ...b, id: uid() })),
    };
    setState((p) => {
      const chapters = [...p.chapters];
      chapters.splice(idx + 1, 0, copy);
      return { ...p, chapters };
    });
    setChapterIdx(idx + 1);
    setDirty(true);
  }

  function moveChapter(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= state.chapters.length) return;
    setState((p) => {
      const chapters = [...p.chapters];
      [chapters[idx], chapters[to]] = [chapters[to], chapters[idx]];
      return { ...p, chapters };
    });
    setChapterIdx(to);
    setDirty(true);
  }

  // Block management for current chapter
  function addBlock(type: BlockType) {
    const ch = state.chapters[chapterIdx];
    if (!ch) return;
    updateBlocks(chapterIdx, [...ch.blocks, { id: uid(), type, content: "" }]);
  }

  function addImageBlock(dataUrl: string) {
    const ch = state.chapters[chapterIdx];
    if (!ch) return;
    updateBlocks(chapterIdx, [...ch.blocks, { id: uid(), type: "image" as BlockType, content: "", meta: { imageUrl: dataUrl } }]);
  }

  function updateBlock(blockIdx: number, block: Block) {
    const ch = state.chapters[chapterIdx];
    if (!ch) return;
    const blocks = ch.blocks.map((b, i) => (i === blockIdx ? block : b));
    updateBlocks(chapterIdx, blocks);
  }

  function deleteBlock(blockIdx: number) {
    const ch = state.chapters[chapterIdx];
    if (!ch) return;
    updateBlocks(chapterIdx, ch.blocks.filter((_, i) => i !== blockIdx));
  }

  function moveBlock(blockIdx: number, dir: -1 | 1) {
    const ch = state.chapters[chapterIdx];
    if (!ch) return;
    const to = blockIdx + dir;
    if (to < 0 || to >= ch.blocks.length) return;
    const blocks = [...ch.blocks];
    [blocks[blockIdx], blocks[to]] = [blocks[to], blocks[blockIdx]];
    updateBlocks(chapterIdx, blocks);
  }

  function duplicateBlock(blockIdx: number) {
    const ch = state.chapters[chapterIdx];
    if (!ch) return;
    const copy = { ...ch.blocks[blockIdx], id: uid() };
    const blocks = [...ch.blocks];
    blocks.splice(blockIdx + 1, 0, copy);
    updateBlocks(chapterIdx, blocks);
  }

  // Cover generation with retry + persistent save
  async function handleAiCover() {
    if (!aiPrompt.trim()) return;
    const lang = state.config.language; // capture before any await
    setAiLoading(true);
    setAiCoverError(null);
    try {
      const result = await genCover({ data: { prompt: aiPrompt, title: state.title, subtitle: state.subtitle } });
      const coverType = result.isFallback ? "fallback" : "ai";
      saveCover(template.id, { imageUrl: result.url, prompt: aiPrompt, type: coverType, source: result.isFallback ? "css" : "gemini" });
      saveCoverForLang(template.id, lang, result.url);
      setState((p) => ({ ...p, coverUrl: result.url }));
      setCoverTab("preview");
      setAiCoverError(null);
      if (result.isFallback) {
        toast("Gemini indisponível — capa visual aplicada automaticamente.", { icon: "⚠️" });
      } else {
        toast.success("Capa gerada e salva automaticamente!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar capa");
      setAiCoverError("unknown");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const lang = state.config.language; // capture before any await or callback
    try {
      const compressed = await compressForStorage(file);
      saveCover(template.id, { imageUrl: compressed, type: "upload", source: "upload" });
      saveCoverForLang(template.id, lang, compressed);
      setState((p) => ({ ...p, coverUrl: compressed }));
      setCoverTab("preview");
      toast.success("Capa salva automaticamente!");
    } catch {
      // Canvas unavailable — fall back to plain FileReader (no compression)
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        saveCover(template.id, { imageUrl: url, type: "upload", source: "upload" });
        saveCoverForLang(template.id, lang, url);
        setState((p) => ({ ...p, coverUrl: url }));
        setCoverTab("preview");
        toast.success("Capa salva automaticamente!");
      };
      reader.readAsDataURL(file);
    }
  }

  function handleFallbackCover() {
    const svg = generateFallbackCover(
      state.title, state.subtitle, state.author,
      cA, cB, state.config.pages, state.chapters.length,
      template.category,
    );
    if (!svg) return;
    saveCover(template.id, { imageUrl: svg, type: "fallback", source: "css" });
    saveCoverForLang(template.id, state.config.language, svg);
    setState((p) => ({ ...p, coverUrl: svg }));
    setCoverTab("preview");
    toast.success("Capa visual aplicada e salva!");
  }

  // Multi-language generation
  async function handleMultiLang() {
    const LANGS = [
      { code: "pt-BR" as const, name: "Português Brasil" },
      { code: "pt-PT" as const, name: "Português Portugal" },
      { code: "en-US" as const, name: "English" },
      { code: "es" as const, name: "Español" },
      { code: "fr" as const, name: "Français" },
      { code: "it" as const, name: "Italiano" },
      { code: "de" as const, name: "Deutsch" },
    ];
    const toGenerate = LANGS.filter((l) => l.code !== state.config.language);
    setMultiLangLoading(true);

    const chaptersForTranslation = state.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      body: (Array.isArray(ch.blocks) ? ch.blocks : [])
        .filter((b) => b.type === "text" || b.type === "quote" || b.type === "callout" || b.type === "checklist")
        .map((b) => b.content)
        .join("\n\n")
        .slice(0, 600),
    }));

    let successCount = 0;
    for (let i = 0; i < toGenerate.length; i++) {
      const lang = toGenerate[i];
      setMultiLangProgress(`${lang.name} (${i + 1}/${toGenerate.length})`);
      try {
        const result = await genMultiLang({
          data: {
            language: lang.code,
            title: state.title,
            subtitle: state.subtitle,
            chapters: chaptersForTranslation,
          },
        });
        const translatedChapters: StudioChapter[] = state.chapters.map((ch) => {
          const tch = result.chapters.find((t) => t.id === ch.id);
          if (!tch) return ch;
          const textBlocks: Block[] = tch.body
            .split(/\n{2,}/)
            .filter((t) => t.trim())
            .map((t) => ({ id: uid(), type: "text" as BlockType, content: t.trim() }));
          const nonTextBlocks = (Array.isArray(ch.blocks) ? ch.blocks : []).filter(
            (b) => b.type !== "text",
          );
          return { ...ch, title: tch.title, blocks: [...textBlocks, ...nonTextBlocks] };
        });
        const translatedState: Partial<StudioState> = {
          ...state,
          title: result.title,
          subtitle: result.subtitle,
          chapters: translatedChapters,
          config: { ...state.config, language: lang.code },
        };
        localStorage.setItem(
          `ebook-studio-${template.id}-${lang.code}`,
          JSON.stringify(translatedState),
        );
        successCount++;
      } catch (e) {
        toast.error(`${lang.name}: ${e instanceof Error ? e.message : "Falha"}`);
      }
    }

    setMultiLangLoading(false);
    setMultiLangProgress("");
    if (successCount > 0) {
      toast.success(
        `Livro gerado em ${successCount} idioma${successCount !== 1 ? "s" : ""}! Troque o idioma em Config para acessar.`,
      );
    }
  }

  function handleLanguageChange(lang: EbookConfig["language"]) {
    try {
      const raw = localStorage.getItem(`ebook-studio-${template.id}-${lang}`);
      if (raw) {
        const p = JSON.parse(raw) as Partial<StudioState>;
        const chapters = p.chapters
          ? p.chapters.map((ch) =>
              Array.isArray((ch as StudioChapter).blocks)
                ? (ch as StudioChapter)
                : migrateChapter(ch as unknown as TemplateChapter),
            )
          : undefined;
        setState((prev) => ({
          ...prev,
          ...(p.title ? { title: p.title } : {}),
          ...(p.subtitle ? { subtitle: p.subtitle } : {}),
          ...(chapters?.length ? { chapters } : {}),
          coverUrl: loadCoverForLang(template.id, lang) || prev.coverUrl,
          config: { ...prev.config, language: lang },
        }));
        toast.info(`Versão em ${lang} carregada!`);
        setDirty(true);
        return;
      }
    } catch { /* ignore */ }
    const cover = loadCoverForLang(template.id, lang);
    setState((prev) => ({
      ...prev,
      coverUrl: cover || prev.coverUrl,
      config: { ...prev.config, language: lang },
    }));
    setDirty(true);
  }

  // mkbook pipeline handlers
  async function handleGenerateOutline() {
    setOutlineLoading(true);
    try {
      const result = await genOutline({
        data: {
          title: state.title, subtitle: state.subtitle,
          promise: state.bible.promise, audience: state.bible.audience,
          tone: state.bible.toneAdjectives, goal: state.bible.goal,
          keywords: state.bible.keywords, redLines: state.bible.redLines,
          targetChapters: state.bible.targetChapters,
          language: state.config.language,
          genre: state.bible.genre || undefined,
        },
      });
      // Sincronizar capítulos do editor com o outline gerado
      const newChapters = result.chapters.map((oc: any, i: number) => ({
        id: state.chapters[i]?.id ?? crypto.randomUUID(),
        title: oc.title,
        blocks: state.chapters[i]?.blocks ?? [],
        theme: oc.theme ?? "",
      }));
      update({ outline: result, chapters: newChapters });
      toast.success(`Outline com ${result.chapters.length} capítulos gerado!`);
      setSideTab("outline");
    } catch {
      const fallbackChapters: OutlineChapter[] = [
        { number: 1, title: "Introdução",   promise: "", transformation: "", wordTarget: 800, notes: "" },
        { number: 2, title: "O Problema",   promise: "", transformation: "", wordTarget: 800, notes: "" },
        { number: 3, title: "A Solução",    promise: "", transformation: "", wordTarget: 800, notes: "" },
        { number: 4, title: "Como Aplicar", promise: "", transformation: "", wordTarget: 800, notes: "" },
        { number: 5, title: "Conclusão",    promise: "", transformation: "", wordTarget: 800, notes: "" },
      ];
      update({ outline: { intro: "", chapters: fallbackChapters, conclusion: "", generatedAt: new Date().toISOString() } });
      setSideTab("outline");
      toast("IA indisponível — outline básico criado. Edite os títulos.", { icon: "⚠️" });
    } finally {
      setOutlineLoading(false);
    }
  }

  async function handleGenerateChapter(idx: number) {
    const ch = state.chapters[idx];
    if (!ch) return;
    const outlineCh = state.outline?.chapters[idx];
    setChapterGenLoading(idx);
    try {
      const result = await genChapterDraft({
        data: {
          chapterNumber: idx + 1, chapterTitle: ch.title,
          chapterPromise: outlineCh?.promise ?? state.bible.promise,
          chapterNotes: outlineCh?.notes ?? "",
          bookTitle: state.title, tone: state.bible.toneAdjectives,
          audience: state.bible.audience, keywords: state.bible.keywords,
          wordTarget: outlineCh?.wordTarget ?? 800,
          language: state.config.language,
          niche: template.category,
          personalStories: state.bible.personalStories || undefined,
          genre: state.bible.genre || undefined,
        },
      });
      const textBlocks: Block[] = result.draft
        .split(/\n{2,}/).filter((t) => t.trim())
        .map((t) => ({ id: uid(), type: "text" as BlockType, content: t.trim() }));
      const nonTextBlocks = (Array.isArray(ch.blocks) ? ch.blocks : []).filter((b) => b.type !== "text");
      updateChapter(idx, { blocks: [...textBlocks, ...nonTextBlocks] });
      const newPipeline = [...(state.pipeline ?? [])];
      const pIdx = newPipeline.findIndex((p) => p.chapterId === ch.id);
      const entry: ChapterPipeline = { chapterId: ch.id, draft: result.draft, edited: "", isDraftGenerated: true, isEdited: false, lastUpdated: new Date().toISOString() };
      if (pIdx >= 0) newPipeline[pIdx] = { ...newPipeline[pIdx], ...entry };
      else newPipeline.push(entry);
      update({ pipeline: newPipeline });
      toast.success(`Capítulo ${idx + 1} gerado!`);
      setChapterIdx(idx);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar capítulo");
    } finally {
      setChapterGenLoading(null);
    }
  }

  async function handleEditChapter(idx: number) {
    const ch = state.chapters[idx];
    if (!ch) return;
    const entry = (state.pipeline ?? []).find((p) => p.chapterId === ch.id);
    const draft = entry?.draft || (Array.isArray(ch.blocks) ? ch.blocks : []).filter((b) => b.type === "text").map((b) => b.content).join("\n\n");
    if (!draft.trim()) { toast.error("Gere o rascunho primeiro."); return; }
    const outlineCh = state.outline?.chapters[idx];
    setChapterEditLoading(idx);
    try {
      const result = await editChapter({
        data: {
          draft, bookTitle: state.title, chapterTitle: ch.title,
          promise: outlineCh?.promise ?? state.bible.promise,
          tone: state.bible.toneAdjectives, audience: state.bible.audience,
        },
      });
      const newPipeline = [...(state.pipeline ?? [])];
      const pIdx = newPipeline.findIndex((p) => p.chapterId === ch.id);
      const updated: ChapterPipeline = { chapterId: ch.id, draft: entry?.draft ?? draft, edited: result.edited, scoreBefore: result.scoreBefore, scoreAfter: result.scoreAfter, changes: result.changes, isDraftGenerated: true, isEdited: true, lastUpdated: new Date().toISOString() };
      if (pIdx >= 0) newPipeline[pIdx] = updated;
      else newPipeline.push(updated);
      update({ pipeline: newPipeline });
      toast.success(`Cap. ${idx + 1} editado! Score: ${result.scoreBefore} → ${result.scoreAfter}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao editar capítulo");
    } finally {
      setChapterEditLoading(null);
    }
  }

  async function handleCruelEdit(idx: number) {
    const ch = state.chapters[idx];
    if (!ch) return;
    const entry = (state.pipeline ?? []).find((p) => p.chapterId === ch.id);
    const draft = entry?.draft || (Array.isArray(ch.blocks) ? ch.blocks : []).filter((b) => b.type === "text").map((b) => b.content).join("\n\n");
    if (!draft.trim()) { toast.error("Gere o rascunho primeiro."); return; }
    const outlineCh = state.outline?.chapters[idx];
    setChapterCruelLoading(idx);
    try {
      const result = await editChapter({
        data: {
          draft, bookTitle: state.title, chapterTitle: ch.title,
          promise: outlineCh?.promise ?? state.bible.promise,
          tone: state.bible.toneAdjectives, audience: state.bible.audience,
          mode: "cruel",
        },
      });
      const newPipeline = [...(state.pipeline ?? [])];
      const pIdx = newPipeline.findIndex((p) => p.chapterId === ch.id);
      const updated: ChapterPipeline = { chapterId: ch.id, draft: entry?.draft ?? draft, edited: result.edited, scoreBefore: result.scoreBefore, scoreAfter: result.scoreAfter, changes: result.changes, isDraftGenerated: true, isEdited: true, lastUpdated: new Date().toISOString() };
      if (pIdx >= 0) newPipeline[pIdx] = updated;
      else newPipeline.push(updated);
      update({ pipeline: newPipeline });
      toast.success(`Edição Cruel concluída! Score: ${result.scoreBefore} → ${result.scoreAfter}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na Edição Cruel");
    } finally {
      setChapterCruelLoading(null);
    }
  }

  function handleApplyToEditor(idx: number) {
    const ch = state.chapters[idx];
    if (!ch) return;
    const entry = (state.pipeline ?? []).find((p) => p.chapterId === ch.id);
    const content = entry?.edited || entry?.draft;
    if (!content) { toast.error("Sem conteúdo para aplicar."); return; }
    const textBlocks: Block[] = content.split(/\n{2,}/).filter((t) => t.trim()).map((t) => ({ id: uid(), type: "text" as BlockType, content: t.trim() }));
    const nonTextBlocks = (Array.isArray(ch.blocks) ? ch.blocks : []).filter((b) => b.type !== "text");
    updateChapter(idx, { blocks: [...textBlocks, ...nonTextBlocks] });
    setChapterIdx(idx);
    toast.success("Conteúdo aplicado ao editor!");
  }

  async function handleConsistencyCheck() {
    setConsistencyLoading(true);
    try {
      const chapters = state.chapters.map((ch) => ({
        id: ch.id, title: ch.title,
        body: (Array.isArray(ch.blocks) ? ch.blocks : []).filter((b) => b.type === "text").map((b) => b.content).join("\n\n").slice(0, 500),
      }));
      const result = await checkConsistency({
        data: { bookTitle: state.title, promise: state.bible.promise, tone: state.bible.toneAdjectives, audience: state.bible.audience, chapters },
      });
      update({ consistencyReport: result });
      setConsistencyModalOpen(true);
      if (result.isClean) toast.success("Ebook consistente! Nenhum problema encontrado.");
      else toast.warning(`${result.issues.length} problema${result.issues.length !== 1 ? "s" : ""} encontrado${result.issues.length !== 1 ? "s" : ""}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao verificar consistência");
    } finally {
      setConsistencyLoading(false);
    }
  }

  // Export PDF
  async function handleExportPdf() {
    setPdfLoading(true);
    try {
      const chapters = await toPdfChapters(state.chapters);
      await generateEbookPDF(
        {
          title: state.title,
          subtitle: state.subtitle,
          author: state.author,
          coverUrl: state.coverUrl,
          chapters,
          bonus: state.bonus,
          cta: state.cta,
          finalPage: state.finalPage,
        },
        template,
        state.design,
      );
      toast.success("PDF exportado!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  function handleExportHtml() {
    const html = buildHtml(state, template);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${state.title.replace(/\W+/g, "-")}.html`;
    a.click();
    toast.success("HTML exportado!");
  }

  const currentChapter = state.chapters[chapterIdx];
  const totalWords = state.chapters.reduce(
    (s, ch) => s + (Array.isArray(ch.blocks) ? ch.blocks : []).filter((b) => b.type === "text").reduce((s2, b) => s2 + b.content.split(/\s+/).filter(Boolean).length, 0),
    0,
  );

  const SIDE_TABS: { key: SideTab; label: string; icon: React.ReactNode }[] = [
    { key: "bible",    label: "Bíblia",   icon: <BookMarked size={13} /> },
    { key: "outline",  label: "Outline",  icon: <ListOrdered size={13} /> },
    { key: "conteudo", label: "Conteúdo", icon: <BookOpen size={13} /> },
    { key: "design",   label: "Design",   icon: <Palette size={13} /> },
    { key: "capa",     label: "Capa",     icon: <ImageIcon size={13} /> },
    { key: "exportar", label: "Exportar", icon: <Download size={13} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080D1A", color: "#F0F4FF", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", height: 58, borderBottom: `1px solid ${BD}`, flexShrink: 0, background: "#080D1A" }}>
        <button onClick={() => navigate({ to: "/produtos/ebook" })} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#6B7FA8", cursor: "pointer", fontSize: 13, padding: "5px 8px", borderRadius: 6, fontFamily: "inherit" }}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <div style={{ width: 1, height: 22, background: BD }} />
        <span style={{ fontSize: 18 }}>{template.emoji}</span>
        <input
          value={state.title}
          onChange={(e) => update({ title: e.target.value })}
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", color: "#F0F4FF", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit" }}
        />
        <span style={{ fontSize: 12, color: saving ? "#10B981" : dirty ? "#F59E0B" : "#4B5563", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          {saving ? <><Check size={12} /> Salvo</> : dirty ? "● Não salvo" : `${totalWords.toLocaleString("pt-BR")} palavras`}
        </span>
        <button
          onClick={() => setPreviewModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#9BAAC8", cursor: "pointer", fontSize: 12, padding: "6px 12px", borderRadius: 7, fontFamily: "inherit" }}
        >
          <Eye size={13} /> Preview
        </button>
        <Button disabled={pdfLoading} onClick={handleExportPdf}
          style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 13, height: 36, gap: 6, flexShrink: 0, borderRadius: 8, paddingLeft: 14, paddingRight: 14 }}>
          {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Exportar PDF
        </Button>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${BD}`, display: "flex", flexDirection: "column", background: "#090E1C", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderBottom: `1px solid ${BD}` }}>
            {SIDE_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setSideTab(tab.key)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "11px 2px 9px", background: sideTab === tab.key ? "#111827" : "none",
                border: "none", borderBottom: `2px solid ${sideTab === tab.key ? cA : "transparent"}`,
                color: sideTab === tab.key ? "#F0F4FF" : "#4B5563", fontSize: 10, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s", letterSpacing: 0.2,
              }}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 0" }}>

            {/* ── OUTLINE ── */}
            {sideTab === "outline" && (
              <div style={{ padding: "4px 20px 24px" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#F0F4FF", margin: "0 0 4px" }}>📐 Outline & Geração</p>
                <p style={{ fontSize: 13, color: "#4B5563", marginBottom: 20 }}>Gere e edite cada capítulo com IA.</p>

                {!state.outline && (
                  <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, marginBottom: 20, textAlign: "center" }}>
                    <ListOrdered size={28} style={{ color: "#4B5563", margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 14, color: "#6B7FA8", lineHeight: 1.6, marginBottom: 14 }}>
                      Nenhum outline gerado ainda.<br />
                      Preencha a Bíblia e clique em <strong style={{ color: "#9BAAC8" }}>Gerar Outline</strong>.
                    </p>
                    <Button disabled={outlineLoading} onClick={handleGenerateOutline}
                      style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 14, height: 44, gap: 8, borderRadius: 8, width: "100%" }}>
                      {outlineLoading ? <Loader2 size={14} className="animate-spin" /> : <ListOrdered size={14} />}
                      {outlineLoading ? "Gerando..." : "Gerar Outline com IA"}
                    </Button>
                  </div>
                )}

                {state.outline && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "#6B7FA8" }}>Outline · {state.outline.chapters.length} capítulos</span>
                      <button onClick={handleGenerateOutline} disabled={outlineLoading} style={{ fontSize: 12, color: cA, background: "none", border: `1px solid ${cA}40`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                        {outlineLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} Regerar
                      </button>
                    </div>
                    <button onClick={() => { void handleConsistencyCheck(); }} disabled={consistencyLoading}
                      style={{ width: "100%", marginBottom: 12, padding: "9px 0", fontSize: 12, borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", color: "#F59E0B" }}>
                      {consistencyLoading ? <Loader2 size={11} className="animate-spin" /> : <span style={{ fontSize: 13 }}>⚠</span>} Verificar Consistência
                    </button>
                    <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 12, borderLeft: `3px solid ${cA}30` }}>
                      {state.outline.intro}
                    </div>
                  </div>
                )}

                {state.chapters.map((ch, i) => {
                  const pEntry = (state.pipeline ?? []).find((p) => p.chapterId === ch.id);
                  const status = pEntry?.isEdited ? "editado" : pEntry?.isDraftGenerated ? "rascunho" : "vazio";
                  const statusColor = status === "editado" ? "#10B981" : status === "rascunho" ? "#F59E0B" : "#4B5563";
                  const oc = state.outline?.chapters[i];
                  return (
                    <div key={ch.id} style={{ marginBottom: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, color: "#F0F4FF", fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 11, color: "#4B5563", marginRight: 5 }}>{i + 1}.</span>{ch.title}
                          </p>
                          {oc && <p style={{ fontSize: 11, color: "#6B7FA8", margin: 0, lineHeight: 1.4 }}>{oc.promise.slice(0, 70)}{oc.promise.length > 70 ? "…" : ""}</p>}
                        </div>
                        <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
                          {status === "editado" ? "✓ Editado" : status === "rascunho" ? "~ Rascunho" : "· Vazio"}
                        </span>
                      </div>
                      {pEntry?.isEdited && pEntry.scoreBefore !== undefined && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, fontSize: 12, color: "#6B7FA8" }}>
                          Score: <span style={{ color: "#F59E0B", fontWeight: 700 }}>{pEntry.scoreBefore}</span>
                          <span style={{ color: "#374151" }}>→</span>
                          <span style={{ color: "#10B981", fontWeight: 700 }}>{pEntry.scoreAfter}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button disabled={chapterGenLoading === i} onClick={() => handleGenerateChapter(i)}
                          style={{ flex: 1, padding: "8px 0", fontSize: 12, borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: `${cA}15`, border: `1px solid ${cA}30`, color: cA }}>
                          {chapterGenLoading === i ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Gerar
                        </button>
                        <button disabled={chapterEditLoading === i} onClick={() => handleEditChapter(i)}
                          style={{ flex: 1, padding: "8px 0", fontSize: 12, borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#9BAAC8" }}>
                          {chapterEditLoading === i ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Editar
                        </button>
                        <button disabled={chapterCruelLoading === i} onClick={() => handleCruelEdit(i)}
                          style={{ flex: 1, padding: "8px 0", fontSize: 12, borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", color: "#EF4444" }}>
                          {chapterCruelLoading === i ? <Loader2 size={11} className="animate-spin" /> : <span style={{ fontSize: 11 }}>🔥</span>} Cruel
                        </button>
                        {pEntry && (pEntry.isDraftGenerated || pEntry.isEdited) && (
                          <button onClick={() => handleApplyToEditor(i)}
                            style={{ flex: 1, padding: "8px 0", fontSize: 12, borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}>
                            <Check size={11} /> Aplicar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── BÍBLIA ── */}
            {sideTab === "bible" && (() => {
              const SI: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#F0F4FF", fontSize: 15, height: 44, borderRadius: 8 };
              const TA: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#F0F4FF", fontSize: 15, resize: "none", borderRadius: 8, lineHeight: 1.6 };
              const SE: React.CSSProperties = { width: "100%", background: "#0E1525", border: "1px solid rgba(255,255,255,0.12)", color: "#F0F4FF", fontSize: 15, height: 44, borderRadius: 8, padding: "0 12px" };
              const CHIP = (active: boolean) => ({
                padding: "7px 14px", borderRadius: 20, fontSize: 13,
                background: active ? `${cA}30` : "rgba(255,255,255,0.05)",
                border: `1px solid ${active ? cA : "rgba(255,255,255,0.10)"}`,
                color: active ? cA : "#9BAAC8", cursor: "pointer" as const, fontFamily: "inherit",
              });
              return (
                <div style={{ padding: "4px 20px 24px" }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#F0F4FF", margin: "0 0 4px" }}>📖 Bíblia do Ebook</p>
                  <p style={{ fontSize: 13, color: "#4B5563", marginBottom: 24 }}>Defina os fundamentos antes de escrever.</p>

                  <SideGroup>
                    <SideLabel>Gênero do Ebook</SideLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      {([
                        { emoji: "📈", label: "Negócios & Marketing" },
                        { emoji: "💰", label: "Finanças & Investimento" },
                        { emoji: "❤️", label: "Relacionamento & Conquista" },
                        { emoji: "💪", label: "Saúde & Emagrecimento" },
                        { emoji: "🧠", label: "Desenvolvimento Pessoal" },
                        { emoji: "👶", label: "Infantil & Educativo" },
                        { emoji: "📖", label: "Ficção & Romance" },
                        { emoji: "😱", label: "Thriller & Suspense" },
                        { emoji: "🔥", label: "Tráfego & Vendas" },
                        { emoji: "👑", label: "Liderança & CEO" },
                        { emoji: "🎨", label: "Criatividade & Arte" },
                        { emoji: "🙏", label: "Espiritualidade" },
                      ] as const).map(({ emoji, label }) => {
                        const active = state.bible.genre === label;
                        return (
                          <button key={label} onClick={() => update({ bible: { ...state.bible, genre: active ? "" : label } })}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", background: active ? `${cA}20` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? cA : "rgba(255,255,255,0.09)"}`, transition: "all 0.15s" }}>
                            <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
                            <span style={{ fontSize: 9, color: active ? cA : "#6B7FA8", textAlign: "center", lineHeight: 1.3, fontWeight: active ? 700 : 400 }}>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </SideGroup>

                  <SideGroup>
                    <SideLabel>Título</SideLabel>
                    <Input value={state.title} onChange={(e) => update({ title: e.target.value })} style={SI} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Subtítulo</SideLabel>
                    <Textarea value={state.subtitle} onChange={(e) => update({ subtitle: e.target.value })} rows={2} style={TA} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Autor</SideLabel>
                    <Input value={state.author} onChange={(e) => update({ author: e.target.value })} style={SI} />
                  </SideGroup>

                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0 24px" }} />

                  <SideGroup>
                    <SideLabel>Promessa central</SideLabel>
                    <Textarea value={state.bible.promise} onChange={(e) => update({ bible: { ...state.bible, promise: e.target.value } })} rows={3} placeholder="O leitor vai conseguir X mesmo que Y..." style={TA} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Público-alvo</SideLabel>
                    <Input value={state.bible.audience} onChange={(e) => update({ bible: { ...state.bible, audience: e.target.value } })} placeholder="Ex: empreendedores iniciantes que..." style={SI} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Tom de voz</SideLabel>
                    <Input value={state.bible.toneAdjectives} onChange={(e) => update({ bible: { ...state.bible, toneAdjectives: e.target.value } })} placeholder="Ex: direto, motivador, sem jargões" style={SI} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Objetivo / Transformação</SideLabel>
                    <Input value={state.bible.goal} onChange={(e) => update({ bible: { ...state.bible, goal: e.target.value } })} placeholder="De X para Y em Z dias..." style={SI} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Palavras-chave</SideLabel>
                    <Input value={state.bible.keywords} onChange={(e) => update({ bible: { ...state.bible, keywords: e.target.value } })} placeholder="produtividade, foco, rotina matinal" style={SI} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Linhas vermelhas — não fazer</SideLabel>
                    <Textarea value={state.bible.redLines} onChange={(e) => update({ bible: { ...state.bible, redLines: e.target.value } })} rows={2} placeholder="Não usar termos acadêmicos, não prometer X..." style={TA} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Banco de histórias pessoais</SideLabel>
                    <Textarea value={state.bible.personalStories ?? ""} onChange={(e) => update({ bible: { ...state.bible, personalStories: e.target.value } })} rows={4} placeholder="Cole aqui histórias reais suas para a IA usar nos capítulos. Ex: 'Em 2021 perdi meu emprego e decidi...' A IA vai incorporar essas histórias no conteúdo gerado." style={TA} />
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Modelo de distribuição</SideLabel>
                    <select value={state.bible.salesModel} onChange={(e) => update({ bible: { ...state.bible, salesModel: e.target.value } })} style={SE}>
                      <option value="lead magnet">Lead Magnet (gratuito)</option>
                      <option value="produto pago">Produto Pago</option>
                      <option value="upsell">Upsell / OTO</option>
                      <option value="autoridade">Autoridade / Branding</option>
                    </select>
                  </SideGroup>

                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0 24px" }} />

                  <SideGroup>
                    <SideLabel>Capítulos-alvo</SideLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[5, 7, 8, 10, 12, 15].map((n) => (
                        <button key={n} onClick={() => update({ bible: { ...state.bible, targetChapters: n } })} style={CHIP(state.bible.targetChapters === n)}>{n}</button>
                      ))}
                    </div>
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Páginas estimadas</SideLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[30, 45, 60, 75, 100].map((p) => (
                        <button key={p} onClick={() => update({ config: { ...state.config, pages: p } })} style={CHIP(state.config.pages === p)}>{p}p</button>
                      ))}
                    </div>
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Idioma do ebook</SideLabel>
                    <select value={state.config.language} onChange={(e) => handleLanguageChange(e.target.value as EbookConfig["language"])} style={SE}>
                      <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                      <option value="pt-PT">🇵🇹 Português (Portugal)</option>
                      <option value="en-US">🇺🇸 English (US)</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="it">🇮🇹 Italiano</option>
                      <option value="de">🇩🇪 Deutsch</option>
                    </select>
                    <div style={{ marginTop: 10 }}>
                      {multiLangLoading ? (
                        <div style={{ fontSize: 13, color: "#9BAAC8", display: "flex", alignItems: "center", gap: 7, padding: "6px 0" }}>
                          <Loader2 size={13} className="animate-spin" /> {multiLangProgress}
                        </div>
                      ) : (
                        <button onClick={handleMultiLang} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", background: `${cA}15`, border: `1px solid ${cA}35`, borderRadius: 8, color: cA, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                          <Sparkles size={13} /> Gerar em todos os idiomas
                        </button>
                      )}
                    </div>
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Tom de escrita</SideLabel>
                    <select value={state.config.tone} onChange={(e) => update({ config: { ...state.config, tone: e.target.value as EbookConfig["tone"] } })} style={SE}>
                      <option value="informal">Informal / Conversacional</option>
                      <option value="formal">Formal / Acadêmico</option>
                      <option value="inspiracional">Inspiracional</option>
                      <option value="técnico">Técnico</option>
                      <option value="storytelling">Storytelling</option>
                    </select>
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Nível do público</SideLabel>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["iniciante", "intermediário", "avançado"] as const).map((l) => (
                        <button key={l} onClick={() => update({ config: { ...state.config, publicLevel: l } })} style={{ ...CHIP(state.config.publicLevel === l), flex: 1, textAlign: "center" as const }}>{l.charAt(0).toUpperCase() + l.slice(1, 8)}</button>
                      ))}
                    </div>
                  </SideGroup>
                  <SideGroup>
                    <SideLabel>Elementos do ebook</SideLabel>
                    <ConfigToggle label="Exercícios práticos" value={state.config.includeExercises} onChange={(v) => update({ config: { ...state.config, includeExercises: v } })} color={cA} />
                    <ConfigToggle label="Checklists" value={state.config.includeChecklist} onChange={(v) => update({ config: { ...state.config, includeChecklist: v } })} color={cA} />
                    <ConfigToggle label="Seção de Bônus" value={state.config.includeBonus} onChange={(v) => update({ config: { ...state.config, includeBonus: v } })} color={cA} />
                    <ConfigToggle label="CTA no final" value={state.config.includeCTA} onChange={(v) => update({ config: { ...state.config, includeCTA: v } })} color={cA} />
                  </SideGroup>

                  <div style={{ paddingTop: 8, borderTop: `1px solid ${BD}` }}>
                    <Button disabled={outlineLoading} onClick={handleGenerateOutline}
                      style={{ width: "100%", background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 15, height: 48, gap: 8, borderRadius: 10, fontWeight: 700 }}>
                      {outlineLoading ? <Loader2 size={16} className="animate-spin" /> : <ListOrdered size={16} />}
                      {outlineLoading ? "Gerando outline..." : "Gerar Outline com IA"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* ── CONTEÚDO ── */}
            {sideTab === "conteudo" && (
              <>
                <button onClick={() => setChapterIdx(-1)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "11px 20px",
                  background: chapterIdx === -1 ? `${cA}12` : "none",
                  borderLeft: `3px solid ${chapterIdx === -1 ? cA : "transparent"}`,
                  border: "none", color: chapterIdx === -1 ? "#F0F4FF" : "#6B7FA8",
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>
                  📋 Informações do Ebook
                </button>

                {state.chapters.map((ch, i) => (
                  <div key={ch.id} style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={(e) => { const el = (e.currentTarget.querySelector(".ch-act") as HTMLElement | null); if (el) el.style.opacity = "1"; }}
                    onMouseLeave={(e) => { const el = (e.currentTarget.querySelector(".ch-act") as HTMLElement | null); if (el) el.style.opacity = "0"; }}>
                    <button onClick={() => setChapterIdx(i)} style={{
                      display: "block", width: "100%", textAlign: "left", padding: "10px 20px 10px 44px",
                      background: chapterIdx === i ? `${cA}12` : "none",
                      borderLeft: `3px solid ${chapterIdx === i ? cA : "transparent"}`,
                      border: "none", color: chapterIdx === i ? "#F0F4FF" : "#9BAAC8",
                      fontSize: 14, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.35,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      <span style={{ fontSize: 11, color: "#4B5563", marginRight: 5 }}>{i + 1}.</span>
                      {ch.title}
                    </button>
                    <div className="ch-act" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 3, opacity: 0, transition: "opacity 0.15s" }}>
                      {i > 0 && <ToolBtn title="Mover cima" onClick={() => moveChapter(i, -1)}><ChevronUp size={10} /></ToolBtn>}
                      {i < state.chapters.length - 1 && <ToolBtn title="Mover baixo" onClick={() => moveChapter(i, 1)}><ChevronDown size={10} /></ToolBtn>}
                      <ToolBtn title="Duplicar" onClick={() => duplicateChapter(i)}><Copy size={10} /></ToolBtn>
                      <ToolBtn title="Excluir" onClick={() => deleteChapter(i)} danger><Trash2 size={10} /></ToolBtn>
                    </div>
                  </div>
                ))}

                <button onClick={addChapter} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 20px",
                  background: "none", border: "none", borderTop: `1px solid ${BD}`,
                  color: "#4B5563", fontSize: 14, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
                }}>
                  <Plus size={14} /> Adicionar Capítulo
                </button>

                {state.bonus && (
                  <button onClick={() => setChapterIdx(-2)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 20px",
                    background: chapterIdx === -2 ? `${cA}12` : "none",
                    borderLeft: `3px solid ${chapterIdx === -2 ? cA : "transparent"}`,
                    border: "none", borderTop: `1px solid ${BD}`,
                    color: chapterIdx === -2 ? "#F0F4FF" : "#6B7FA8", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  }}>🎁 Bônus</button>
                )}
                <button onClick={() => setChapterIdx(-3)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "10px 20px",
                  background: chapterIdx === -3 ? `${cA}12` : "none",
                  borderLeft: `3px solid ${chapterIdx === -3 ? cA : "transparent"}`,
                  border: "none", color: chapterIdx === -3 ? "#F0F4FF" : "#6B7FA8",
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>🎯 CTA Final</button>
              </>
            )}

            {/* ── DESIGN ── */}
            {sideTab === "design" && (
              <div style={{ padding: "4px 20px 24px" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#F0F4FF", margin: "0 0 4px" }}>🎨 Design</p>
                <p style={{ fontSize: 13, color: "#4B5563", marginBottom: 24 }}>Cores, tipografia e estilo visual.</p>

                <SideGroup>
                  <SideLabel>Cor principal</SideLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10 }}>
                    <input type="color" value={state.design.colorA} onChange={(e) => update({ design: { ...state.design, colorA: e.target.value } })}
                      style={{ width: 44, height: 44, border: "none", cursor: "pointer", borderRadius: 8, background: "none", padding: 0 }} />
                    <div>
                      <code style={{ fontSize: 15, color: "#F0F4FF", fontWeight: 600 }}>{state.design.colorA}</code>
                      <p style={{ fontSize: 11, color: "#4B5563", margin: "2px 0 0" }}>Títulos, destaques, CTAs</p>
                    </div>
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Cor secundária</SideLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10 }}>
                    <input type="color" value={state.design.colorB} onChange={(e) => update({ design: { ...state.design, colorB: e.target.value } })}
                      style={{ width: 44, height: 44, border: "none", cursor: "pointer", borderRadius: 8, background: "none", padding: 0 }} />
                    <div>
                      <code style={{ fontSize: 15, color: "#F0F4FF", fontWeight: 600 }}>{state.design.colorB}</code>
                      <p style={{ fontSize: 11, color: "#4B5563", margin: "2px 0 0" }}>Gradiente, fundos</p>
                    </div>
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Tipografia</SideLabel>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["sans", "serif"] as const).map((f) => (
                      <button key={f} onClick={() => update({ design: { ...state.design, font: f } })} style={{
                        flex: 1, padding: "11px 0", borderRadius: 8, fontSize: 14,
                        border: `1px solid ${state.design.font === f ? cA : "rgba(255,255,255,0.10)"}`,
                        background: state.design.font === f ? `${cA}20` : "rgba(255,255,255,0.04)",
                        color: state.design.font === f ? "#F0F4FF" : "#6B7FA8", cursor: "pointer",
                        fontFamily: f === "serif" ? "Georgia,serif" : "Inter,sans-serif",
                      }}>
                        {f === "sans" ? "Sans-serif" : "Serifada"}
                      </button>
                    ))}
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Estilo visual</SideLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(["clean", "premium", "luxury", "dark", "feminino", "corporate", "neon"] as const).map((s) => (
                      <button key={s} onClick={() => update({ config: { ...state.config, visualStyle: s } })} style={{
                        padding: "6px 12px", borderRadius: 20, fontSize: 13,
                        background: state.config.visualStyle === s ? `${cA}25` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${state.config.visualStyle === s ? cA : "rgba(255,255,255,0.08)"}`,
                        color: state.config.visualStyle === s ? cA : "#6B7FA8", cursor: "pointer", fontFamily: "inherit",
                      }}>{s}</button>
                    ))}
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Preview</SideLabel>
                  <div style={{ height: 72, borderRadius: 10, background: `linear-gradient(135deg,${cA},${cB})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${cA}40` }}>
                    <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: state.design.font === "serif" ? "Georgia" : "Inter", textShadow: "0 1px 4px rgba(0,0,0,0.4)", padding: "0 16px", textAlign: "center" }}>
                      {state.title.slice(0, 28)}
                    </span>
                  </div>
                </SideGroup>
                <button onClick={() => update({ design: { colorA: template.colorA, colorB: template.colorB, font: "sans" } })}
                  style={{ width: "100%", padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B7FA8", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Restaurar cores do template
                </button>
              </div>
            )}

            {/* ── CAPA ── */}
            {sideTab === "capa" && (
              <div style={{ padding: "4px 20px 24px" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#F0F4FF", margin: "0 0 4px" }}>🖼 Capa</p>
                <p style={{ fontSize: 13, color: "#4B5563", marginBottom: 20 }}>Gere com IA, envie uma imagem ou use o visual automático.</p>

                {/* Error recovery card */}
                {aiCoverError && (
                  <div style={{ marginBottom: 20, padding: "16px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.30)", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <AlertCircle size={16} style={{ color: "#FBBF24", flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: "#F0F4FF", fontWeight: 600, margin: 0 }}>
                        {aiCoverError === "quota" ? "Limite da IA atingido" : aiCoverError === "unavailable" ? "IA temporariamente indisponível" : "Erro ao gerar capa"}
                      </p>
                    </div>
                    <p style={{ fontSize: 13, color: "#9BAAC8", lineHeight: 1.55, margin: "0 0 14px" }}>
                      Limite da IA atingido. Você pode enviar uma capa manual ou usar a capa automática.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => { handleFallbackCover(); setAiCoverError(null); }} style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        padding: "11px 16px", background: `${cA}20`, border: `1px solid ${cA}50`,
                        borderRadius: 8, color: cA, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        <Sparkles size={13} /> Usar capa automática
                      </button>
                      <button onClick={() => { coverFileRef.current?.click(); }} style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        padding: "11px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8, color: "#C8D4F0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        <Upload size={13} /> Enviar capa manual
                      </button>
                      <button onClick={() => { setAiCoverError(null); setCoverTab("ai"); }} style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        padding: "11px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, color: "#6B7FA8", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        <RefreshCw size={13} /> Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                {/* Cover thumbnail — click to open full-size modal */}
                <div
                  onClick={() => state.coverUrl && setCoverModalOpen(true)}
                  style={{
                    aspectRatio: "0.707", borderRadius: 10, overflow: "hidden", marginBottom: 14,
                    background: state.coverUrl ? `url(${state.coverUrl}) center/cover` : `linear-gradient(145deg,${cA},${cB})`,
                    position: "relative", cursor: state.coverUrl ? "zoom-in" : "default",
                    boxShadow: state.coverUrl ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 10, right: 10, zIndex: 10,
                    background: "linear-gradient(135deg,#FFD700,#FFA500)",
                    borderRadius: "50%", width: 30, height: 30,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 900, color: "#000",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)", letterSpacing: 0.5,
                    pointerEvents: "none",
                  }}>FLOW</div>
                  {state.coverUrl && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.2s",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.3)"; (e.currentTarget.querySelector("svg") as SVGElement | null)?.setAttribute("style", "opacity:1;color:#fff"); }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0)"; (e.currentTarget.querySelector("svg") as SVGElement | null)?.setAttribute("style", "opacity:0;color:#fff"); }}
                    >
                      <Eye size={28} style={{ color: "#fff", opacity: 0, transition: "opacity 0.2s", pointerEvents: "none" }} />
                    </div>
                  )}
                  {!state.coverUrl && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 14, textAlign: "center" }}>
                      <span style={{ fontSize: 40, marginBottom: 8 }}>{template.emoji}</span>
                      <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,.5)", margin: "0 0 6px" }}>{state.title.slice(0, 40)}</p>
                      <p style={{ fontSize: 11, opacity: 0.65, margin: 0 }}>por {state.author}</p>
                    </div>
                  )}
                </div>

                {/* Sub-tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {(["preview", "ai", "upload"] as const).map((t) => (
                    <button key={t} onClick={() => setCoverTab(t)} style={{
                      flex: 1, padding: "8px 0", fontSize: 12, borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                      background: coverTab === t ? `${cA}25` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${coverTab === t ? cA : "rgba(255,255,255,0.08)"}`,
                      color: coverTab === t ? cA : "#6B7FA8",
                    }}>
                      {t === "preview" ? "Ver" : t === "ai" ? "✨ IA" : "📎 Upload"}
                    </button>
                  ))}
                </div>

                {/* ── Ver tab ── */}
                {coverTab === "preview" && (() => {
                  const saved = loadCover(template.id);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {state.coverUrl ? (
                        <>
                          <button onClick={() => setCoverModalOpen(true)} style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%",
                            padding: "11px 16px", background: `${cA}18`,
                            border: `1px solid ${cA}40`, borderRadius: 8,
                            color: cA, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            <Eye size={13} /> Abrir em tamanho real
                          </button>
                          {saved && (
                            <p style={{ fontSize: 12, color: "#6B7FA8", margin: 0 }}>
                              {saved.source === "gemini" ? "✨ Gerada por IA" : saved.source === "upload" ? "⬆ Upload manual" : "🎨 Visual premium"}
                              {" · "}
                              {new Date(saved.updatedAt).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                          {saved?.prompt && (
                            <p style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                              "{saved.prompt.slice(0, 70)}{saved.prompt.length > 70 ? "…" : ""}"
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 13, color: "#6B7FA8", lineHeight: 1.6, margin: 0 }}>
                            Sem capa definida. Gere com IA, faça upload ou use a capa visual automática.
                          </p>
                          <button onClick={handleFallbackCover} style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%",
                            padding: "11px 16px", background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8,
                            color: "#9BAAC8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            <Sparkles size={13} /> Gerar capa visual automática
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ── IA tab ── */}
                {coverTab === "ai" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <SideLabel>Prompt da capa (inglês)</SideLabel>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={4}
                      placeholder="Professional ebook cover, dark premium gradient, minimalist typography..."
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#F0F4FF", fontSize: 14, resize: "none", borderRadius: 8, lineHeight: 1.6 }}
                    />
                    <Button disabled={aiLoading || !aiPrompt.trim()} onClick={handleAiCover}
                      style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 14, height: 48, gap: 8, borderRadius: 10, fontWeight: 700, width: "100%" }}>
                      {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      {aiLoading ? "Gerando capa..." : "Gerar com Gemini IA"}
                    </Button>
                    <button onClick={handleFallbackCover}
                      style={{ fontSize: 13, color: "#4B5563", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "4px 0" }}>
                      Sem IA? → Usar capa automática gratuita
                    </button>
                  </div>
                )}

                {/* ── Upload tab ── */}
                {coverTab === "upload" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 13, color: "#6B7FA8", lineHeight: 1.6, margin: 0 }}>
                      A imagem é comprimida e salva automaticamente. Funciona offline e em qualquer dispositivo.
                    </p>
                    <input ref={coverFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverUpload} />
                    <button onClick={() => coverFileRef.current?.click()} style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                      padding: "13px 16px", background: "rgba(255,255,255,0.05)", border: `1px dashed ${cA}50`,
                      borderRadius: 10, color: cA, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <Upload size={15} /> Escolher imagem do dispositivo
                    </button>
                    <p style={{ fontSize: 12, color: "#374151", margin: 0, textAlign: "center" }}>
                      JPG, PNG, WebP · máx ~3 MB
                    </p>
                  </div>
                )}

                {state.coverUrl && (
                  <button
                    onClick={() => {
                      deleteCover(template.id);
                      clearCoverForLang(template.id, state.config.language);
                      setState((p) => ({ ...p, coverUrl: "" }));
                    }}
                    style={{ width: "100%", marginTop: 14, padding: "8px", background: "none", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, color: "#374151", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    ✕ Remover capa atual
                  </button>
                )}
              </div>
            )}

            {/* ── EXPORTAR ── */}
            {sideTab === "exportar" && (
              <div style={{ padding: "4px 20px 24px" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#F0F4FF", margin: "0 0 4px" }}>📤 Exportar</p>
                <p style={{ fontSize: 13, color: "#4B5563", marginBottom: 24 }}>PDF, HTML e verificação de consistência.</p>

                <SideGroup>
                  <Button disabled={pdfLoading} onClick={handleExportPdf}
                    style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 15, height: 48, gap: 8, borderRadius: 10, fontWeight: 700, width: "100%", justifyContent: "center" }}>
                    {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {pdfLoading ? "Gerando PDF..." : "Exportar PDF Profissional"}
                  </Button>
                  <p style={{ fontSize: 12, color: "#374151", margin: "8px 0 0", lineHeight: 1.5 }}>
                    Inclui capa, índice, capítulos, checklists, exercícios, bônus e CTA.
                  </p>
                </SideGroup>

                <SideGroup>
                  <button onClick={handleExportHtml} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "11px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, color: "#9BAAC8", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <FileText size={14} /> Exportar HTML
                  </button>
                </SideGroup>

                {/* Stats */}
                <SideGroup>
                  <SideLabel>Estatísticas</SideLabel>
                  <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 0" }}>
                    {[
                      ["Capítulos", state.chapters.length],
                      ["Palavras", totalWords.toLocaleString("pt-BR")],
                      ["Páginas", `~${state.config.pages}`],
                      ["Idioma", state.config.language],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <p style={{ fontSize: 11, color: "#4B5563", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
                        <p style={{ fontSize: 15, color: "#F0F4FF", fontWeight: 700, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </SideGroup>

                {/* Consistency check */}
                <SideGroup>
                  <SideLabel>Revisão de consistência</SideLabel>
                  <Button disabled={consistencyLoading} onClick={handleConsistencyCheck}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#9BAAC8", fontSize: 14, height: 44, gap: 8, borderRadius: 8, justifyContent: "center" }}>
                    {consistencyLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                    {consistencyLoading ? "Verificando..." : "Verificar consistência com IA"}
                  </Button>
                  {state.consistencyReport && (
                    <div style={{ marginTop: 14, padding: "14px 16px", background: state.consistencyReport.isClean ? "rgba(16,185,129,0.08)" : "rgba(251,191,36,0.08)", border: `1px solid ${state.consistencyReport.isClean ? "rgba(16,185,129,0.25)" : "rgba(251,191,36,0.25)"}`, borderRadius: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: state.consistencyReport.isClean ? "#10B981" : "#FBBF24", margin: "0 0 8px" }}>
                        {state.consistencyReport.isClean ? "✓ Ebook consistente!" : `⚠ ${state.consistencyReport.issues.length} problema${state.consistencyReport.issues.length !== 1 ? "s" : ""} encontrado${state.consistencyReport.issues.length !== 1 ? "s" : ""}`}
                      </p>
                      {state.consistencyReport.issues.map((issue, i) => (
                        <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < state.consistencyReport!.issues.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                          <p style={{ fontSize: 12, color: "#FBBF24", fontWeight: 600, margin: "0 0 3px" }}>{issue.chapter} — {issue.type}</p>
                          <p style={{ fontSize: 12, color: "#9BAAC8", margin: "0 0 4px", lineHeight: 1.5 }}>{issue.problem}</p>
                          <p style={{ fontSize: 12, color: "#10B981", margin: 0, lineHeight: 1.5 }}>→ {issue.fix}</p>
                        </div>
                      ))}
                      <p style={{ fontSize: 11, color: "#374151", margin: "6px 0 0" }}>
                        {new Date(state.consistencyReport.generatedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                </SideGroup>
              </div>
            )}
          </div>
        </aside>

        {/* ── EDITOR ── */}
        <main style={{ flex: 1, overflowY: "auto", background: "#0C1220", padding: "0 0 80px" }}>

          {/* Chapter navigation */}
          {chapterIdx >= 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 36px 0", marginBottom: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={() => setChapterIdx((p) => Math.max(0, p - 1))} disabled={chapterIdx === 0}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: chapterIdx === 0 ? "#2D3748" : "#6B7FA8", cursor: chapterIdx === 0 ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", padding: "4px 0" }}>
                <ChevronLeft size={15} /> Anterior
              </button>
              <span style={{ fontSize: 12, color: "#4B5563" }}>
                Capítulo {chapterIdx + 1} de {state.chapters.length}
              </span>
              <button onClick={() => setChapterIdx((p) => Math.min(state.chapters.length - 1, p + 1))} disabled={chapterIdx === state.chapters.length - 1}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: chapterIdx === state.chapters.length - 1 ? "#2D3748" : "#6B7FA8", cursor: chapterIdx === state.chapters.length - 1 ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", padding: "4px 0" }}>
                Próximo <ChevronRight size={15} />
              </button>
            </div>
          )}

          <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 40px" }}>

            {/* ── Meta editor ── */}
            {chapterIdx === -1 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#F0F4FF" }}>Informações do Ebook</h2>
                <div style={{ display: "grid", gap: 16 }}>
                  <EditorField label="Título">
                    <Input value={state.title} onChange={(e) => update({ title: e.target.value })} style={editorInputStyle} />
                  </EditorField>
                  <EditorField label="Subtítulo">
                    <Textarea value={state.subtitle} onChange={(e) => update({ subtitle: e.target.value })} rows={2} style={{ ...editorInputStyle, resize: "none" }} />
                  </EditorField>
                  <EditorField label="Autor">
                    <Input value={state.author} onChange={(e) => update({ author: e.target.value })} style={editorInputStyle} />
                  </EditorField>
                </div>
                <div style={{ marginTop: 24, padding: "16px 18px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ fontSize: 11, color: "#9BAAC8", fontWeight: 600, marginBottom: 6 }}>Proposta original do template</p>
                  <p style={{ fontSize: 12, color: "#6B7FA8", lineHeight: 1.7 }}>{template.meta.promise}</p>
                  <p style={{ fontSize: 11, color: "#6B7FA8", marginTop: 6 }}><strong style={{ color: "#9BAAC8" }}>Mecanismo:</strong> {template.meta.uniqueMechanism}</p>
                  <p style={{ fontSize: 11, color: "#6B7FA8" }}><strong style={{ color: "#9BAAC8" }}>Transformação:</strong> {template.meta.transformation}</p>
                </div>
              </div>
            )}

            {/* ── Chapter editor ── */}
            {chapterIdx >= 0 && currentChapter && (
              <div>
                {/* Chapter number */}
                <div style={{ fontSize: 72, fontWeight: 900, color: "rgba(255,255,255,0.04)", lineHeight: 1, marginBottom: -16, userSelect: "none" }}>
                  {String(chapterIdx + 1).padStart(2, "0")}
                </div>

                {/* Badge */}
                {currentChapter.badge !== undefined && (
                  <div style={{ marginBottom: 8 }}>
                    <input
                      value={currentChapter.badge ?? ""}
                      onChange={(e) => updateChapter(chapterIdx, { badge: e.target.value })}
                      placeholder="Badge (ex: Fundação, Módulo 1...)"
                      style={{
                        background: `${cA}15`, border: `1px solid ${cA}30`, color: cA,
                        borderRadius: 20, padding: "2px 12px", fontSize: 11, fontWeight: 700,
                        outline: "none", fontFamily: "inherit",
                      }}
                    />
                  </div>
                )}

                {/* Chapter title */}
                <input
                  value={currentChapter.title}
                  onChange={(e) => updateChapter(chapterIdx, { title: e.target.value })}
                  style={{
                    width: "100%", background: "none", border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    color: "#F0F4FF", fontSize: 24, fontWeight: 800, padding: "4px 0 10px",
                    marginBottom: 24, outline: "none", fontFamily: "Georgia, serif",
                  }}
                />

                {/* Accent rule */}
                <div style={{ display: "flex", gap: 0, marginBottom: 28, height: 2 }}>
                  <div style={{ width: 40, background: cA, borderRadius: 1 }} />
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Blocks */}
                {currentChapter.blocks.map((block, bIdx) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    index={bIdx}
                    total={currentChapter.blocks.length}
                    colorA={cA}
                    onChange={(b) => updateBlock(bIdx, b)}
                    onDelete={() => deleteBlock(bIdx)}
                    onMoveUp={() => moveBlock(bIdx, -1)}
                    onMoveDown={() => moveBlock(bIdx, 1)}
                    onDuplicate={() => duplicateBlock(bIdx)}
                  />
                ))}

                <AddBlockMenu colorA={cA} onAdd={addBlock} onAddImage={addImageBlock} />

                {/* Word count */}
                <div style={{ marginTop: 24, fontSize: 11, color: "#2D3748", textAlign: "right" }}>
                  {currentChapter.blocks.filter((b) => b.type === "text").reduce((s, b) => s + b.content.split(/\s+/).filter(Boolean).length, 0)} palavras neste capítulo
                </div>
              </div>
            )}

            {/* ── Bonus editor ── */}
            {chapterIdx === -2 && state.bonus && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#F0F4FF" }}>🎁 Seção de Bônus</h2>
                <div style={{ display: "grid", gap: 14 }}>
                  <EditorField label="Título do bônus">
                    <Input value={state.bonus.title} onChange={(e) => update({ bonus: { ...state.bonus!, title: e.target.value } })} style={editorInputStyle} />
                  </EditorField>
                  <EditorField label="Descrição">
                    <Textarea value={state.bonus.description} onChange={(e) => update({ bonus: { ...state.bonus!, description: e.target.value } })} rows={2} style={{ ...editorInputStyle, resize: "none" }} />
                  </EditorField>
                  <EditorField label="Itens">
                    {state.bonus.items.map((item, i) => (
                      <div key={i} style={{ marginBottom: 5 }}>
                        <Input value={item} onChange={(e) => {
                          const items = [...state.bonus!.items];
                          items[i] = e.target.value;
                          update({ bonus: { ...state.bonus!, items } });
                        }} style={{ ...editorInputStyle, fontSize: 12 }} />
                      </div>
                    ))}
                  </EditorField>
                </div>
              </div>
            )}

            {/* ── CTA editor ── */}
            {chapterIdx === -3 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#F0F4FF" }}>🎯 CTA Final</h2>
                <div style={{ display: "grid", gap: 14 }}>
                  <EditorField label="Headline">
                    <Input value={state.cta.headline} onChange={(e) => update({ cta: { ...state.cta, headline: e.target.value } })} style={editorInputStyle} />
                  </EditorField>
                  <EditorField label="Corpo">
                    <Textarea value={state.cta.body} onChange={(e) => update({ cta: { ...state.cta, body: e.target.value } })} rows={3} style={{ ...editorInputStyle, resize: "none" }} />
                  </EditorField>
                  <EditorField label="Texto do botão">
                    <Input value={state.cta.buttonText} onChange={(e) => update({ cta: { ...state.cta, buttonText: e.target.value } })} style={editorInputStyle} />
                  </EditorField>
                  <EditorField label="Urgência">
                    <Input value={state.cta.urgency} onChange={(e) => update({ cta: { ...state.cta, urgency: e.target.value } })} style={editorInputStyle} />
                  </EditorField>
                  <EditorField label="Mensagem final">
                    <Textarea value={state.finalPage} onChange={(e) => update({ finalPage: e.target.value })} rows={4} style={{ ...editorInputStyle, resize: "vertical" }} />
                  </EditorField>
                </div>
                {/* CTA preview */}
                <div style={{ marginTop: 24, borderRadius: 12, overflow: "hidden", background: `linear-gradient(140deg,${cA},${cB})`, padding: "28px 24px", textAlign: "center" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{state.cta.headline}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 16, maxWidth: 420, margin: "0 auto 16px" }}>{state.cta.body}</p>
                  <div style={{ display: "inline-block", background: "#fff", color: cB, padding: "9px 22px", borderRadius: 7, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                    {state.cta.buttonText}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 8 }}>{state.cta.urgency}</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── PREVIEW PANEL ── */}
        {showPreview && (
          <aside style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${BD}`, background: "#090E1C", overflowY: "auto" }}>
            {chapterIdx >= 0 ? (
              <PreviewPanel state={state} template={template} chapterIndex={chapterIdx} />
            ) : (
              <div style={{ padding: 16, textAlign: "center", color: "#4B5563", fontSize: 12, marginTop: 40 }}>
                <BookOpen size={28} style={{ opacity: 0.2, display: "block", margin: "0 auto 8px" }} />
                Selecione um capítulo para ver o preview
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Full preview modal ── */}
      {previewModalOpen && (
        <FullPreviewModal state={state} template={template} onClose={() => setPreviewModalOpen(false)} />
      )}

      {/* ── Consistency report modal ── */}
      {consistencyModalOpen && state.consistencyReport && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConsistencyModalOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#0E1525", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, width: "min(520px,92vw)", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#F0F4FF" }}>
                {state.consistencyReport.isClean ? "✅ Ebook Consistente" : `⚠️ ${state.consistencyReport.issues.length} Problema${state.consistencyReport.issues.length !== 1 ? "s" : ""} Encontrado${state.consistencyReport.issues.length !== 1 ? "s" : ""}`}
              </span>
              <button onClick={() => setConsistencyModalOpen(false)} style={{ background: "none", border: "none", color: "#6B7FA8", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "16px 20px 20px" }}>
              {state.consistencyReport.isClean ? (
                <p style={{ fontSize: 14, color: "#10B981", lineHeight: 1.6 }}>Nenhum problema de consistência detectado. Seu ebook está coerente!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {state.consistencyReport.issues.map((issue, i) => (
                    <div key={i} style={{ padding: "12px 14px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.20)", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 10 }}>{issue.type}</span>
                        <span style={{ fontSize: 12, color: "#9BAAC8" }}>{issue.chapter}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#D1D5DB", margin: "0 0 6px", lineHeight: 1.5 }}>{issue.problem}</p>
                      <p style={{ fontSize: 12, color: "#6EE7B7", margin: 0, lineHeight: 1.5 }}>💡 {issue.fix}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cover modal / lightbox ── */}
      {coverModalOpen && state.coverUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setCoverModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: "min(90vw, 480px)", maxHeight: "92vh" }}
          >
            <img
              src={state.coverUrl}
              alt="Capa do ebook"
              style={{
                width: "100%", maxHeight: "88vh",
                objectFit: "contain", borderRadius: 10,
                boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
              }}
            />
            <button
              onClick={() => setCoverModalOpen(false)}
              style={{
                position: "absolute", top: -14, right: -14,
                background: "#1E293B", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "50%", width: 34, height: 34,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#F0F4FF", cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
            {/* FLOW badge on modal */}
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              background: "linear-gradient(135deg,#FFD700,#FFA500)",
              borderRadius: "50%", width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900, color: "#000",
              boxShadow: "0 2px 12px rgba(0,0,0,0.6)", letterSpacing: 0.5,
            }}>FLOW</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const editorInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#F0F4FF",
};

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{label}</p>
      {children}
    </div>
  );
}

// ─── HTML export ──────────────────────────────────────────────────────────────

function buildHtml(state: StudioState, template: TemplateMaster): string {
  const cA = state.design.colorA;
  const cB = state.design.colorB;

  const chaptersHtml = state.chapters.map((ch, i) => {
    const blocks = ch.blocks.map((b) => {
      if (b.type === "divider") return `<hr style="border:none;border-top:1px solid ${cA}30;margin:18px 0">`;
      if (b.type === "quote") return `<blockquote style="border-left:4px solid ${cA};padding:10px 16px;margin:16px 0;font-style:italic;color:#555;background:${cA}08">${b.content}</blockquote>`;
      if (b.type === "callout") return `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:14px 16px;margin:16px 0"><strong style="font-size:11px;color:#92400E;text-transform:uppercase">📝 Exercício</strong><p style="margin-top:6px;color:#78350F">${b.content}</p></div>`;
      if (b.type === "checklist") return `<div style="background:#f8fafb;border-radius:8px;padding:14px 16px;margin:16px 0"><strong style="font-size:11px;text-transform:uppercase">✔ Checklist</strong><ul style="list-style:none;padding-left:0;margin-top:8px">${b.content.split("\n").filter(Boolean).map((it) => `<li style="padding:4px 0;padding-left:22px;position:relative;font-size:14px">☐ ${it}</li>`).join("")}</ul></div>`;
      if (b.type === "cta") return `<div style="background:linear-gradient(135deg,${cA}20,${cA}08);border:1px solid ${cA}30;border-radius:8px;padding:16px;margin:16px 0;text-align:center"><strong>${b.content}</strong></div>`;
      if (b.type === "image" && b.meta?.imageUrl) return `<img src="${b.meta.imageUrl}" style="max-width:100%;border-radius:8px;margin:16px 0">`;
      return `<p style="margin-bottom:14px;line-height:1.8;color:#333">${b.content}</p>`;
    }).join("");

    return `<section class="chapter">
      ${ch.badge ? `<div class="badge">${ch.badge}</div>` : ""}
      <h2>${i + 1}. ${ch.title}</h2>
      ${blocks}
    </section>`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${state.title}</title>
<style>
body{font-family:Inter,sans-serif;background:#FAFAF8;color:#1a1a1a;line-height:1.7;margin:0}
.cover{background:linear-gradient(140deg,${cA},${cB});${state.coverUrl ? `background-image:url('${state.coverUrl}');background-size:cover;` : ""}color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 40px}
.cover h1{font-size:clamp(28px,5vw,52px);font-weight:900;margin-bottom:14px}
.chapter{max-width:720px;margin:0 auto 60px;padding:48px 40px;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.06)}
.badge{display:inline-block;background:${cA}18;color:${cA};border:1px solid ${cA}30;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:14px}
.chapter h2{font-size:28px;font-weight:700;margin-bottom:18px;color:#111}
@media print{body{background:#fff}.chapter{box-shadow:none}}
</style></head><body>
<div class="cover">
  <div style="font-size:52px;margin-bottom:20px">${template.emoji}</div>
  <h1>${state.title}</h1>
  <p style="font-size:17px;opacity:.9">${state.subtitle}</p>
  <p style="font-size:13px;opacity:.7;margin-top:14px;letter-spacing:2px;text-transform:uppercase">por ${state.author}</p>
</div>
${chaptersHtml}
</body></html>`;
}
