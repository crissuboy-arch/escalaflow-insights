import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Creative } from "@/lib/ads.server";

interface CreativeCardProps {
  id: string;
  creative: Creative;
  meta: { platform: string; objective: string; format: string; dimension: string };
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
  if (!value) return null;
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

export function CreativeCard({ creative, meta }: CreativeCardProps) {
  const all = [
    `# ${meta.format} (${meta.dimension}) — ${meta.platform} / ${meta.objective}`,
    creative.hook && `Hook: ${creative.hook}`,
    creative.headline && `Headline: ${creative.headline}`,
    creative.copy && `Copy:\n${creative.copy}`,
    creative.cta && `CTA: ${creative.cta}`,
    creative.visualPrompt && `Prompt visual:\n${creative.visualPrompt}`,
    creative.estrutura && `Estrutura:\n${creative.estrutura}`,
    creative.angulo && `Ângulo: ${creative.angulo}`,
    creative.emocao && `Emoção: ${creative.emocao}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{meta.platform}</Badge>
            <Badge variant="outline" className="text-[10px]">{meta.objective}</Badge>
            <Badge variant="outline" className="text-[10px]">{meta.format}</Badge>
            <Badge variant="outline" className="text-[10px]">{meta.dimension}</Badge>
          </div>
          <CopyBtn text={all} label="Tudo" />
        </div>
        <Field label="Hook" value={creative.hook} />
        <Field label="Headline" value={creative.headline} />
        <Field label="Copy" value={creative.copy} />
        <Field label="CTA" value={creative.cta} />
        <Field label="Prompt visual" value={creative.visualPrompt} />
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