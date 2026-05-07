import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, RefreshCw, Save, X } from "lucide-react";
import { renderMarkdownSafe } from "@/lib/ebook/preview";
import { PREVIEW_STYLES } from "@/lib/ebook/preview-styles";
import type { EbookLayout } from "@/lib/ebook/layouts";

export type Chapter = { title: string; markdown: string };

interface Props {
  title: string;
  subtitle?: string;
  layout: EbookLayout;
  coverUrl: string | null;
  chapters: Chapter[];
  onChange: (next: Chapter[]) => void;
  onRegenerate?: (index: number) => Promise<void> | void;
  regeneratingIndex?: number | null;
}

export function EbookPreview({
  title,
  subtitle,
  layout,
  coverUrl,
  chapters,
  onChange,
  onRegenerate,
  regeneratingIndex,
}: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const style = PREVIEW_STYLES[layout];

  const startEdit = (i: number) => {
    setEditing(i);
    setDraft(chapters[i].markdown);
  };
  const saveEdit = () => {
    if (editing === null) return;
    const next = chapters.map((c, i) => (i === editing ? { ...c, markdown: draft } : c));
    onChange(next);
    setEditing(null);
  };

  return (
    <Tabs defaultValue="pages" className="w-full">
      <TabsList>
        <TabsTrigger value="pages">Páginas</TabsTrigger>
        <TabsTrigger value="markdown">Markdown</TabsTrigger>
      </TabsList>

      <TabsContent value="pages" className="mt-4">
        <div className="max-h-[70vh] overflow-auto rounded-lg bg-muted/40 p-6">
          <div className="mx-auto flex max-w-[640px] flex-col gap-6">
            {/* Cover */}
            <Page style={style}>
              <div
                className="flex h-full flex-col items-center justify-center text-center"
                style={{ background: style.coverBg, color: style.coverText, margin: `-${style.margin.split(" ")[0]} -${style.margin.split(" ")[1]}`, padding: style.margin, minHeight: "100%" }}
              >
                {coverUrl && (
                  <img src={coverUrl} alt="capa" className="mb-6 max-h-[55%] w-auto object-contain" />
                )}
                <h1 style={{ fontFamily: style.fontFamily, fontSize: style.titleSize, lineHeight: 1.1, margin: 0 }}>
                  {title}
                </h1>
                {subtitle && (
                  <p style={{ fontFamily: style.fontFamily, fontSize: style.headingSize, opacity: 0.8, marginTop: 16 }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </Page>

            {/* TOC */}
            <Page style={style}>
              <h2 style={{ fontFamily: style.fontFamily, fontSize: style.headingSize, color: style.accent, borderBottom: `2px solid ${style.accent}`, paddingBottom: 8 }}>
                Sumário
              </h2>
              <ol style={{ fontFamily: style.fontFamily, fontSize: style.bodySize, lineHeight: style.lineHeight, paddingLeft: 24, marginTop: 16 }}>
                {chapters.map((c, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{c.title}</li>
                ))}
              </ol>
            </Page>

            {/* Chapters */}
            {chapters.map((c, i) => (
              <Page key={i} style={style}>
                <h2 style={{ fontFamily: style.fontFamily, fontSize: style.headingSize, color: style.accent, marginBottom: 16 }}>
                  {i + 1}. {c.title}
                </h2>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: style.bodySize,
                    lineHeight: style.lineHeight,
                    textAlign: style.textAlign,
                    color: "#1a1a1a",
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(c.markdown) }}
                />
              </Page>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="markdown" className="mt-4">
        <div className="space-y-3">
          {chapters.map((c, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{i + 1}. {c.title}</p>
                <div className="flex gap-2">
                  {editing === i ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        <X className="mr-1 h-3 w-3" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="mr-1 h-3 w-3" /> Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(i)}>
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      {onRegenerate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRegenerate(i)}
                          disabled={regeneratingIndex === i}
                        >
                          {regeneratingIndex === i ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Regerar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {editing === i ? (
                <Textarea
                  rows={14}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="font-mono text-xs"
                />
              ) : (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs text-muted-foreground">
                  {c.markdown}
                </pre>
              )}
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Page({
  children,
  style,
}: {
  children: React.ReactNode;
  style: typeof PREVIEW_STYLES[EbookLayout];
}) {
  return (
    <div
      className="overflow-hidden rounded-sm bg-white text-black shadow-md"
      style={{
        aspectRatio: "1 / 1.414",
        padding: style.margin,
        boxSizing: "border-box",
      }}
    >
      <div className="h-full overflow-hidden">{children}</div>
    </div>
  );
}