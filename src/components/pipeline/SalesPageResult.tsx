import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Sparkles, FileDown } from "lucide-react";
import type { SalesPage } from "@/lib/sales-page.server";
import { exportSalesPageDocx } from "@/lib/sales-page/docx";
import { toast } from "sonner";

type Prompts = {
  lovable: string;
  googleAiStudio: string;
  html: string;
  v0: string;
  claude: string;
};

function CopyBtn({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
      {done ? "Copiado" : label}
    </Button>
  );
}

function Block({
  title,
  text,
  multiline,
}: {
  title: string;
  text: string;
  multiline?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{title}</Badge>
          <CopyBtn text={text} />
        </div>
        {multiline ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        ) : (
          <p className="text-sm">{text}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{title}</Badge>
          <CopyBtn text={items.map((i) => `• ${i}`).join("\n")} />
        </div>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          {items.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function QABlock({ title, items }: { title: string; items: Array<{ q: string; a: string }> }) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <Badge variant="outline">{title}</Badge>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="border-l-2 border-border/60 pl-3">
              <p className="text-sm font-medium">{it.q}</p>
              <p className="text-sm text-muted-foreground">{it.a}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesPageResult({
  page,
  prompts,
  title,
}: {
  page: SalesPage;
  prompts: Prompts;
  title?: string;
}) {
  const [exporting, setExporting] = useState(false);
  async function downloadDocx() {
    setExporting(true);
    try {
      await exportSalesPageDocx(title || page.headline.slice(0, 60) || "pagina-de-vendas", page);
      toast.success("DOCX exportado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={downloadDocx} disabled={exporting} variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? "Exportando…" : "Exportar DOCX"}
        </Button>
      </div>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="secondary" className="mb-2">
                Hero
              </Badge>
              <p className="text-lg font-semibold">{page.hero}</p>
              <h2 className="mt-3 text-2xl font-bold leading-tight">{page.headline}</h2>
              <p className="mt-1 text-muted-foreground">{page.subheadline}</p>
            </div>
            <CopyBtn text={`${page.hero}\n${page.headline}\n${page.subheadline}`} />
          </div>
        </CardContent>
      </Card>

      <Block title="Lead" text={page.lead} multiline />
      <Block title="Seção Dor" text={page.dor} multiline />
      <Block title="Seção Mecanismo" text={page.mecanismo} multiline />
      <ListBlock title="Benefícios" items={page.beneficios} />
      <QABlock title="Quebra de Objeções" items={page.objecoes} />

      {page.depoimentos.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <Badge variant="outline">Depoimentos</Badge>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {page.depoimentos.map((d, i) => (
                <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
                  <p className="italic">“{d.texto}”</p>
                  <p className="mt-2 text-xs text-muted-foreground">— {d.nome}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Block title="Oferta" text={page.oferta} multiline />
      <ListBlock title="Bônus" items={page.bonus} />
      <Block title="Garantia" text={page.garantia} />
      <QABlock title="FAQ" items={page.faq} />
      <Block title="CTA" text={page.cta} />
      <Block title="Estrutura Visual" text={page.estruturaVisual} multiline />

      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Prompts para IA externa</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole em Lovable, Google AI Studio ou use o prompt HTML autocontido para gerar a página visual completa. V0 e Claude como extras.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <CopyBtn text={prompts.lovable} label="Copiar Prompt Lovable" className="justify-start" />
            <CopyBtn
              text={prompts.googleAiStudio}
              label="Copiar Prompt Google AI Studio"
              className="justify-start"
            />
            <CopyBtn text={prompts.html} label="Copiar Prompt HTML" className="justify-start" />
            <CopyBtn text={prompts.v0} label="Copiar Prompt V0" className="justify-start" />
            <CopyBtn text={prompts.claude} label="Copiar Prompt Claude" className="justify-start" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}