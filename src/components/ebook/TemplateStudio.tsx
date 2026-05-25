import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlignLeft, ArrowLeft, BookOpen, Check, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, Copy, Download, Eye, EyeOff, FileText,
  Image as ImageIcon, Info, Loader2, Minus, Palette, Plus, Quote,
  Save, Settings, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { generateEbookCoverFn } from "@/lib/storybook.functions";
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
  language: "pt-BR" | "en-US" | "es";
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

function loadState(template: TemplateMaster): StudioState {
  try {
    const raw = localStorage.getItem(`ebook-studio-${template.id}`);
    if (raw) {
      const p = JSON.parse(raw) as Partial<StudioState>;
      return {
        title: p.title ?? template.meta.title,
        subtitle: p.subtitle ?? template.meta.subtitle,
        author: p.author ?? template.meta.authorPlaceholder,
        coverUrl: p.coverUrl ?? "",
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
      };
    }
  } catch { /* ignore */ }
  return {
    title: template.meta.title,
    subtitle: template.meta.subtitle,
    author: template.meta.authorPlaceholder,
    coverUrl: "",
    chapters: template.chapters.map(migrateChapter),
    bonus: template.bonus ? { ...template.bonus } : undefined,
    cta: { ...template.cta },
    finalPage: template.finalPage,
    design: { colorA: template.colorA, colorB: template.colorB, font: "sans" },
    config: defaultConfig(template),
  };
}

function toPdfChapters(chapters: StudioChapter[]): PdfChapter[] {
  return chapters.map((ch) => {
    const blocks: Block[] = Array.isArray(ch.blocks) ? ch.blocks : [];
    const textContent = blocks
      .filter((b) => b.type === "text" || b.type === "cta")
      .map((b) => b.content)
      .join("\n\n");
    const quoteBlock = blocks.find((b) => b.type === "quote");
    const checkBlock = blocks.find((b) => b.type === "checklist");
    const calloutBlock = blocks.find((b) => b.type === "callout");
    return {
      id: ch.id,
      title: ch.title,
      badge: ch.badge,
      body: textContent,
      pullQuote: quoteBlock?.content,
      checklist: checkBlock?.content.split("\n").filter(Boolean),
      exercise: calloutBlock?.content,
    };
  });
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

const BLOCK_TYPES_MENU: BlockType[] = ["text", "quote", "callout", "checklist", "divider", "cta"];

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

// ─── Add Block Menu ───────────────────────────────────────────────────────────

function AddBlockMenu({ colorA, onAdd }: { colorA: string; onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", marginTop: 18, textAlign: "center" }}>
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
              <button key={type} onClick={() => { onAdd(type); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${def.color}25`,
                borderRadius: 6, color: def.color, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                minWidth: 110,
              }}>
                {type === "text" && <AlignLeft size={11} />}
                {type === "quote" && <Quote size={11} />}
                {type === "callout" && <Info size={11} />}
                {type === "checklist" && <Check size={11} />}
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

type SideTab = "estrutura" | "config" | "design" | "capa" | "exportar";

function SideLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{children}</p>;
}

function SideGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginBottom: 18, ...style }}>{children}</div>;
}

function ConfigToggle({ label, value, onChange, color }: { label: string; value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 0", cursor: "pointer", userSelect: "none",
      }}
    >
      <span style={{ fontSize: 12, color: "#9BAAC8" }}>{label}</span>
      <div style={{
        width: 32, height: 18, borderRadius: 9, background: value ? color : "rgba(255,255,255,0.08)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 2, left: value ? 16 : 2, width: 14, height: 14,
          borderRadius: "50%", background: "#fff", transition: "left 0.2s",
        }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateStudio({ template }: { template: TemplateMaster }) {
  const navigate = useNavigate();
  const [state, setState] = useState<StudioState>(() => loadState(template));
  const [sideTab, setSideTab] = useState<SideTab>("estrutura");
  const [chapterIdx, setChapterIdx] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(template.coverPrompt ?? "");
  const [coverTab, setCoverTab] = useState<"preview" | "ai" | "upload">("preview");
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const genCover = useServerFn(generateEbookCoverFn);

  const cA = state.design.colorA;
  const cB = state.design.colorB;
  const BD = "rgba(255,255,255,0.07)";

  // Auto-save with debounce
  useEffect(() => {
    if (!dirty) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      localStorage.setItem(`ebook-studio-${template.id}`, JSON.stringify(state));
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

  // Cover generation
  async function handleAiCover() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await genCover({ data: { prompt: aiPrompt } });
      update({ coverUrl: result.url });
      setCoverTab("preview");
      toast.success("Capa gerada com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar capa com IA");
    } finally {
      setAiLoading(false);
    }
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { update({ coverUrl: reader.result as string }); setCoverTab("preview"); };
    reader.readAsDataURL(file);
  }

  // Export PDF
  async function handleExportPdf() {
    setPdfLoading(true);
    try {
      await generateEbookPDF(
        {
          title: state.title,
          subtitle: state.subtitle,
          author: state.author,
          coverUrl: state.coverUrl,
          chapters: toPdfChapters(state.chapters),
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
    { key: "estrutura", label: "Conteúdo", icon: <BookOpen size={13} /> },
    { key: "config",    label: "Config",   icon: <Settings size={13} /> },
    { key: "design",    label: "Design",   icon: <Palette size={13} /> },
    { key: "capa",      label: "Capa",     icon: <ImageIcon size={13} /> },
    { key: "exportar",  label: "Exportar", icon: <Download size={13} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080D1A", color: "#F0F4FF", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 50, borderBottom: `1px solid ${BD}`, flexShrink: 0, background: "#080D1A" }}>
        <button onClick={() => navigate({ to: "/produtos/ebook" })} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#6B7FA8", cursor: "pointer", fontSize: 12, padding: "4px 6px", borderRadius: 5, fontFamily: "inherit" }}>
          <ArrowLeft size={13} /> Voltar
        </button>
        <div style={{ width: 1, height: 18, background: BD }} />
        <span style={{ fontSize: 16 }}>{template.emoji}</span>
        <input
          value={state.title}
          onChange={(e) => update({ title: e.target.value })}
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", color: "#F0F4FF", fontSize: 14, fontWeight: 700, outline: "none", fontFamily: "inherit" }}
        />
        <span style={{ fontSize: 10, color: saving ? "#10B981" : dirty ? "#F59E0B" : "#4B5563", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
          {saving ? <><Check size={10} /> Salvo</> : dirty ? "● Não salvo" : `${totalWords.toLocaleString("pt-BR")} palavras`}
        </span>
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{ display: "flex", alignItems: "center", gap: 4, background: showPreview ? `${cA}20` : "rgba(255,255,255,0.04)", border: `1px solid ${showPreview ? cA : "rgba(255,255,255,0.10)"}`, color: showPreview ? cA : "#6B7FA8", cursor: "pointer", fontSize: 11, padding: "4px 10px", borderRadius: 6, fontFamily: "inherit" }}
        >
          {showPreview ? <Eye size={12} /> : <EyeOff size={12} />} Preview
        </button>
        <Button size="sm" disabled={pdfLoading} onClick={handleExportPdf}
          style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 11, height: 30, gap: 5, flexShrink: 0 }}>
          {pdfLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          Exportar PDF
        </Button>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 242, flexShrink: 0, borderRight: `1px solid ${BD}`, display: "flex", flexDirection: "column", background: "#090E1C", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", borderBottom: `1px solid ${BD}` }}>
            {SIDE_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setSideTab(tab.key)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "8px 2px", background: sideTab === tab.key ? "#111827" : "none",
                border: "none", borderBottom: `2px solid ${sideTab === tab.key ? cA : "transparent"}`,
                color: sideTab === tab.key ? "#F0F4FF" : "#4B5563", fontSize: 9, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>

            {/* ── ESTRUTURA ── */}
            {sideTab === "estrutura" && (
              <>
                {/* Meta */}
                <button onClick={() => { setChapterIdx(-1); }} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "6px 13px",
                  background: chapterIdx === -1 ? `${cA}12` : "none",
                  borderLeft: `3px solid ${chapterIdx === -1 ? cA : "transparent"}`,
                  border: "none", color: chapterIdx === -1 ? "#F0F4FF" : "#6B7FA8", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>
                  📋 Informações do Ebook
                </button>

                {/* Chapter list */}
                {state.chapters.map((ch, i) => (
                  <div key={ch.id} style={{ position: "relative" }} onMouseEnter={(e) => { (e.currentTarget.querySelector(".ch-actions") as HTMLElement | null)?.style && ((e.currentTarget.querySelector(".ch-actions") as HTMLElement).style.opacity = "1"); }}
                    onMouseLeave={(e) => { const el = e.currentTarget.querySelector(".ch-actions") as HTMLElement | null; if (el) el.style.opacity = "0"; }}>
                    <button
                      onClick={() => setChapterIdx(i)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", padding: "6px 13px 6px 40px",
                        background: chapterIdx === i ? `${cA}12` : "none",
                        borderLeft: `3px solid ${chapterIdx === i ? cA : "transparent"}`,
                        border: "none", color: chapterIdx === i ? "#F0F4FF" : "#6B7FA8",
                        fontSize: 11, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.3,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ fontSize: 9, color: "#4B5563", marginRight: 4 }}>{i + 1}.</span>
                      {ch.title}
                    </button>
                    {/* Chapter actions */}
                    <div className="ch-actions" style={{
                      position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                      display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s",
                    }}>
                      {i > 0 && <ToolBtn title="Mover cima" onClick={() => moveChapter(i, -1)}><ChevronUp size={9} /></ToolBtn>}
                      {i < state.chapters.length - 1 && <ToolBtn title="Mover baixo" onClick={() => moveChapter(i, 1)}><ChevronDown size={9} /></ToolBtn>}
                      <ToolBtn title="Duplicar" onClick={() => duplicateChapter(i)}><Copy size={9} /></ToolBtn>
                      <ToolBtn title="Excluir" onClick={() => deleteChapter(i)} danger><Trash2 size={9} /></ToolBtn>
                    </div>
                  </div>
                ))}

                {/* Add chapter */}
                <button onClick={addChapter} style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 13px",
                  background: "none", border: "none", borderTop: `1px solid ${BD}`,
                  color: "#4B5563", fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
                }}>
                  <Plus size={12} /> Adicionar Capítulo
                </button>

                {/* Bonus */}
                {state.bonus && (
                  <button onClick={() => setChapterIdx(-2)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "6px 13px",
                    background: chapterIdx === -2 ? `${cA}12` : "none",
                    borderLeft: `3px solid ${chapterIdx === -2 ? cA : "transparent"}`,
                    border: "none", borderTop: `1px solid ${BD}`,
                    color: chapterIdx === -2 ? "#F0F4FF" : "#6B7FA8", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    🎁 Bônus
                  </button>
                )}
                {/* CTA */}
                <button onClick={() => setChapterIdx(-3)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "6px 13px",
                  background: chapterIdx === -3 ? `${cA}12` : "none",
                  borderLeft: `3px solid ${chapterIdx === -3 ? cA : "transparent"}`,
                  border: "none", color: chapterIdx === -3 ? "#F0F4FF" : "#6B7FA8",
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>
                  🎯 CTA Final
                </button>
              </>
            )}

            {/* ── CONFIG ── */}
            {sideTab === "config" && (
              <div style={{ padding: "10px 13px" }}>
                <SideGroup>
                  <SideLabel>Título do Ebook</SideLabel>
                  <Input value={state.title} onChange={(e) => update({ title: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", fontSize: 12, height: 30 }} />
                </SideGroup>
                <SideGroup>
                  <SideLabel>Subtítulo</SideLabel>
                  <Textarea value={state.subtitle} onChange={(e) => update({ subtitle: e.target.value })} rows={2} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", fontSize: 12, resize: "none" }} />
                </SideGroup>
                <SideGroup>
                  <SideLabel>Autor</SideLabel>
                  <Input value={state.author} onChange={(e) => update({ author: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", fontSize: 12, height: 30 }} />
                </SideGroup>
                <SideGroup>
                  <SideLabel>Páginas estimadas</SideLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[30, 45, 60, 75, 100].map((p) => (
                      <button key={p} onClick={() => update({ config: { ...state.config, pages: p } })} style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11,
                        background: state.config.pages === p ? `${cA}30` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${state.config.pages === p ? cA : "rgba(255,255,255,0.08)"}`,
                        color: state.config.pages === p ? cA : "#9BAAC8", cursor: "pointer", fontFamily: "inherit",
                      }}>{p}p</button>
                    ))}
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Idioma</SideLabel>
                  <select value={state.config.language} onChange={(e) => update({ config: { ...state.config, language: e.target.value as EbookConfig["language"] } })}
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", fontSize: 12, height: 30, borderRadius: 6, padding: "0 8px" }}>
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Tom de escrita</SideLabel>
                  <select value={state.config.tone} onChange={(e) => update({ config: { ...state.config, tone: e.target.value as EbookConfig["tone"] } })}
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", fontSize: 12, height: 30, borderRadius: 6, padding: "0 8px" }}>
                    <option value="informal">Informal / Conversacional</option>
                    <option value="formal">Formal / Acadêmico</option>
                    <option value="inspiracional">Inspiracional</option>
                    <option value="técnico">Técnico</option>
                    <option value="storytelling">Storytelling</option>
                  </select>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Nível do público</SideLabel>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["iniciante", "intermediário", "avançado"] as const).map((l) => (
                      <button key={l} onClick={() => update({ config: { ...state.config, publicLevel: l } })} style={{
                        flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 10,
                        background: state.config.publicLevel === l ? `${cA}25` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${state.config.publicLevel === l ? cA : "rgba(255,255,255,0.08)"}`,
                        color: state.config.publicLevel === l ? cA : "#6B7FA8", cursor: "pointer", fontFamily: "inherit",
                      }}>{l.slice(0, 6)}</button>
                    ))}
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Elementos</SideLabel>
                  <ConfigToggle label="Exercícios práticos" value={state.config.includeExercises} onChange={(v) => update({ config: { ...state.config, includeExercises: v } })} color={cA} />
                  <ConfigToggle label="Checklists" value={state.config.includeChecklist} onChange={(v) => update({ config: { ...state.config, includeChecklist: v } })} color={cA} />
                  <ConfigToggle label="Seção de Bônus" value={state.config.includeBonus} onChange={(v) => update({ config: { ...state.config, includeBonus: v } })} color={cA} />
                  <ConfigToggle label="CTA no final" value={state.config.includeCTA} onChange={(v) => update({ config: { ...state.config, includeCTA: v } })} color={cA} />
                </SideGroup>
              </div>
            )}

            {/* ── DESIGN ── */}
            {sideTab === "design" && (
              <div style={{ padding: "10px 13px" }}>
                <SideGroup>
                  <SideLabel>Cor principal</SideLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={state.design.colorA} onChange={(e) => update({ design: { ...state.design, colorA: e.target.value } })}
                      style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 4, background: "none" }} />
                    <code style={{ fontSize: 11, color: "#9BAAC8" }}>{state.design.colorA}</code>
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Cor secundária</SideLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={state.design.colorB} onChange={(e) => update({ design: { ...state.design, colorB: e.target.value } })}
                      style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 4, background: "none" }} />
                    <code style={{ fontSize: 11, color: "#9BAAC8" }}>{state.design.colorB}</code>
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Fonte</SideLabel>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["sans", "serif"] as const).map((f) => (
                      <button key={f} onClick={() => update({ design: { ...state.design, font: f } })} style={{
                        flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11,
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(["clean", "premium", "luxury", "dark", "feminino", "corporate", "neon"] as const).map((s) => (
                      <button key={s} onClick={() => update({ config: { ...state.config, visualStyle: s } })} style={{
                        padding: "3px 9px", borderRadius: 20, fontSize: 10,
                        background: state.config.visualStyle === s ? `${cA}25` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${state.config.visualStyle === s ? cA : "rgba(255,255,255,0.08)"}`,
                        color: state.config.visualStyle === s ? cA : "#6B7FA8", cursor: "pointer", fontFamily: "inherit",
                      }}>{s}</button>
                    ))}
                  </div>
                </SideGroup>
                <SideGroup>
                  <SideLabel>Preview</SideLabel>
                  <div style={{ height: 56, borderRadius: 8, background: `linear-gradient(135deg,${cA},${cB})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: state.design.font === "serif" ? "Georgia" : "Inter" }}>
                      {state.title.slice(0, 22)}
                    </span>
                  </div>
                </SideGroup>
                <button onClick={() => update({ design: { colorA: template.colorA, colorB: template.colorB, font: "sans" } })}
                  style={{ width: "100%", padding: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#6B7FA8", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  Restaurar cores do template
                </button>
              </div>
            )}

            {/* ── CAPA ── */}
            {sideTab === "capa" && (
              <div style={{ padding: "10px 13px" }}>
                {/* Cover preview */}
                <div style={{
                  aspectRatio: "0.707", borderRadius: 8, overflow: "hidden", marginBottom: 10,
                  background: state.coverUrl ? `url(${state.coverUrl}) center/cover` : `linear-gradient(145deg,${cA},${cB})`,
                  position: "relative",
                }}>
                  {!state.coverUrl && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 10, textAlign: "center" }}>
                      <span style={{ fontSize: 32, marginBottom: 6 }}>{template.emoji}</span>
                      <p style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{state.title.slice(0, 40)}</p>
                      <p style={{ fontSize: 9, opacity: 0.65, marginTop: 4 }}>por {state.author}</p>
                    </div>
                  )}
                </div>

                {/* Sub-tabs */}
                <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                  {(["preview", "ai", "upload"] as const).map((t) => (
                    <button key={t} onClick={() => setCoverTab(t)} style={{
                      flex: 1, padding: "4px 0", fontSize: 10, borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                      background: coverTab === t ? `${cA}25` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${coverTab === t ? cA : "rgba(255,255,255,0.08)"}`,
                      color: coverTab === t ? cA : "#6B7FA8",
                    }}>
                      {t === "preview" ? "Ver" : t === "ai" ? "✨ IA" : "Upload"}
                    </button>
                  ))}
                </div>

                {coverTab === "ai" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <SideLabel>Prompt da capa (inglês)</SideLabel>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={4}
                      placeholder="Professional ebook cover, dark premium gradient..."
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", fontSize: 11, resize: "none" }}
                    />
                    <Button size="sm" disabled={aiLoading || !aiPrompt.trim()} onClick={handleAiCover}
                      style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 11, height: 30, gap: 5 }}>
                      {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      {aiLoading ? "Gerando..." : "Gerar com Gemini IA"}
                    </Button>
                  </div>
                )}

                {coverTab === "upload" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <input ref={coverFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverUpload} />
                    <Button size="sm" variant="outline" className="w-full" onClick={() => coverFileRef.current?.click()}
                      style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 11, height: 30, gap: 4 }}>
                      <Upload size={11} /> Escolher imagem
                    </Button>
                  </div>
                )}

                {state.coverUrl && (
                  <button onClick={() => update({ coverUrl: "" })} style={{ width: "100%", marginTop: 8, padding: "4px", background: "none", border: "none", color: "#4B5563", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    ✕ Remover capa
                  </button>
                )}
              </div>
            )}

            {/* ── EXPORTAR ── */}
            {sideTab === "exportar" && (
              <div style={{ padding: "10px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
                <p style={{ fontSize: 11, color: "#4B5563", lineHeight: 1.5 }}>
                  O PDF inclui: capa, índice, capítulos formatados, checklists, exercícios, bônus e CTA.
                </p>
                <Button size="sm" disabled={pdfLoading} onClick={handleExportPdf}
                  style={{ background: `linear-gradient(135deg,${cA},${cB})`, fontSize: 12, height: 34, gap: 6, justifyContent: "flex-start" }}>
                  {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Exportar PDF Profissional
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportHtml}
                  style={{ borderColor: "rgba(255,255,255,0.12)", fontSize: 12, height: 34, gap: 6, justifyContent: "flex-start" }}>
                  <FileText size={13} /> Exportar HTML
                </Button>

                <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, fontSize: 11, color: "#6B7FA8", lineHeight: 1.7 }}>
                  <strong style={{ color: "#9BAAC8", display: "block", marginBottom: 4 }}>Estatísticas</strong>
                  <span style={{ display: "block" }}>{state.chapters.length} capítulos</span>
                  <span style={{ display: "block" }}>{totalWords.toLocaleString("pt-BR")} palavras</span>
                  <span style={{ display: "block" }}>~{state.config.pages} páginas</span>
                  <span style={{ display: "block" }}>Idioma: {state.config.language}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── EDITOR ── */}
        <main style={{ flex: 1, overflowY: "auto", background: "#0C1220", padding: "0 0 80px" }}>

          {/* Chapter navigation */}
          {chapterIdx >= 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px 0", marginBottom: 0 }}>
              <button onClick={() => setChapterIdx((p) => Math.max(0, p - 1))} disabled={chapterIdx === 0}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: chapterIdx === 0 ? "#2D3748" : "#6B7FA8", cursor: chapterIdx === 0 ? "default" : "pointer", fontSize: 11, fontFamily: "inherit" }}>
                <ChevronLeft size={14} /> Anterior
              </button>
              <span style={{ fontSize: 11, color: "#4B5563" }}>
                Capítulo {chapterIdx + 1} de {state.chapters.length}
              </span>
              <button onClick={() => setChapterIdx((p) => Math.min(state.chapters.length - 1, p + 1))} disabled={chapterIdx === state.chapters.length - 1}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: chapterIdx === state.chapters.length - 1 ? "#2D3748" : "#6B7FA8", cursor: chapterIdx === state.chapters.length - 1 ? "default" : "pointer", fontSize: 11, fontFamily: "inherit" }}>
                Próximo <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div style={{ maxWidth: 740, margin: "0 auto", padding: "24px 32px" }}>

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

                <AddBlockMenu colorA={cA} onAdd={addBlock} />

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
