import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Creative } from "@/lib/ads.server";

interface CreativeCardProps {
  id: string;
  creative: Creative;
  meta: {
    platform: string;
    objective: string;
    format: string;
    dimension: string;
    gatilho?: string;
    uso?: string;
  };
  onVariations?: () => void;
  variationsBusy?: boolean;
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(`${label} copiado`);
        } catch {
          toast.error("Falha ao copiar");
        }
      }}
    >
      <Copy className="mr-1 h-3 w-3" /> Copiar
    </Button>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <CopyBtn text={value} label={label} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}

function buildExportText(c: Creative, meta: CreativeCardProps["meta"]) {
  const body = c.body || c.copy;
  const imagePrompt = c.imagePrompt || c.visualPrompt;
  return [
    `# ${meta.format} (${meta.dimension}) — ${meta.platform} / ${meta.objective}`,
    meta.gatilho && `Gatilho: ${meta.gatilho}`,
    meta.uso && `Uso: ${meta.uso}`,
    "",
    c.hook && `## Hook\n${c.hook}`,
    c.headline && `## Headline\n${c.headline}`,
    body && `## Corpo\n${body}`,
    c.cta && `## CTA\n${c.cta}`,
    c.caption && `## Legenda\n${c.caption}`,
    c.shortScript && `## Roteiro curto\n${c.shortScript}`,
    imagePrompt && `## Prompt de imagem\n${imagePrompt}`,
    c.videoPrompt && `## Prompt de vídeo\n${c.videoPrompt}`,
    c.estrutura && `## Estrutura\n${c.estrutura}`,
    c.angulo && `Ângulo: ${c.angulo}`,
    c.emocao && `Emoção: ${c.emocao}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CreativeCard({ creative, meta, onVariations, variationsBusy }: CreativeCardProps) {
  const all = buildExportText(creative, meta);
  const body = creative.body || creative.copy;
  const imagePrompt = creative.imagePrompt || creative.visualPrompt;

  const onExport = () => {
    const safeName = meta.format.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadText(`criativo-${safeName}-${Date.now()}.md`, all);
    toast.success("Arquivo .md baixado");
  };

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{meta.platform}</Badge>
            <Badge variant="outline" className="text-[10px]">{meta.objective}</Badge>
            <Badge variant="outline" className="text-[10px]">{meta.format}</Badge>
            <Badge variant="outline" className="text-[10px]">{meta.dimension}</Badge>
            {meta.gatilho && (
              <Badge variant="outline" className="text-[10px]">⚡ {meta.gatilho}</Badge>
            )}
          </div>
          <div className="flex gap-1">
            {onVariations && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onVariations}
                disabled={variationsBusy}
              >
                {variationsBusy ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="mr-1 h-3 w-3" />
                )}
                Variações
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onExport}
            >
              <Download className="mr-1 h-3 w-3" /> Exportar
            </Button>
            <CopyBtn text={all} label="Tudo" />
          </div>
        </div>
        <Field label="Hook" value={creative.hook} />
        <Field label="Headline" value={creative.headline} />
        <Field label="Corpo" value={body} />
        <Field label="CTA" value={creative.cta} />
        <Field label="Legenda" value={creative.caption} />
        <Field label="Roteiro curto" value={creative.shortScript} />
        <Field label="Prompt de imagem" value={imagePrompt} />
        <Field label="Prompt de vídeo" value={creative.videoPrompt} />
        <Field label="Estrutura" value={creative.estrutura} />
        {(creative.angulo || creative.emocao) && (
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
            {creative.angulo && <Badge variant="outline">Ângulo: {creative.angulo}</Badge>}
            {creative.emocao && <Badge variant="outline">Emoção: {creative.emocao}</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
