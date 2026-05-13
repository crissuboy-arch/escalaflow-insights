import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Rocket } from "lucide-react";

type Item = {
  key: string;
  label: string;
  done: boolean;
  hint: string;
  onAction?: () => void;
  actionLabel?: string;
};

export function EscalaTab({
  hasEbook,
  hasPlaybook,
  hasCopy,
  hasCreatives,
  creativesCount,
  hasSalesPage,
  hasCheckout,
  onJump,
}: {
  hasEbook: boolean;
  hasPlaybook: boolean;
  hasCopy: boolean;
  hasCreatives: boolean;
  creativesCount: number;
  hasSalesPage: boolean;
  hasCheckout: boolean;
  onJump: (tab: string) => void;
}) {
  const items: Item[] = [
    {
      key: "ebook",
      label: "Ebook gerado",
      done: hasEbook,
      hint: "PDF/DOCX/EPUB pronto para entrega.",
      onAction: () => onJump("ebook"),
      actionLabel: hasEbook ? "Abrir" : "Gerar",
    },
    {
      key: "playbook",
      label: "Playbook interativo",
      done: hasPlaybook,
      hint: "Versão visual em cenas, link público mobile.",
      onAction: () => onJump("playbook"),
      actionLabel: hasPlaybook ? "Abrir" : "Gerar",
    },
    {
      key: "copy",
      label: "Copy de vendas",
      done: hasCopy,
      hint: "Headline, oferta, garantia, FAQ, CTA.",
      onAction: () => onJump("copy"),
      actionLabel: hasCopy ? "Revisar" : "Gerar",
    },
    {
      key: "pagina",
      label: "Página de venda",
      done: hasSalesPage,
      hint: "Estrutura em blocos + prompts para IA externa.",
      onAction: () => onJump("pagina"),
      actionLabel: hasSalesPage ? "Revisar" : "Gerar",
    },
    {
      key: "criativos",
      label: `Criativos (${creativesCount})`,
      done: hasCreatives,
      hint: "Headline, corpo, CTA e prompt visual nos formatos virais.",
      onAction: () => onJump("criativos"),
      actionLabel: hasCreatives ? "Adicionar mais" : "Gerar",
    },
    {
      key: "checkout",
      label: "Checkout configurado",
      done: hasCheckout,
      hint: "Preço, bônus, order bump, garantia e link.",
      onAction: () => onJump("checkout"),
      actionLabel: hasCheckout ? "Editar" : "Configurar",
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">Checklist de escala</p>
                <Badge variant={pct === 100 ? "default" : "secondary"}>
                  {completed}/{total} · {pct}%
                </Badge>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {items.map((it) => (
          <Card key={it.key} className="border-border/60">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    it.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {it.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="text-xs text-muted-foreground">{it.hint}</p>
                </div>
              </div>
              {it.onAction ? (
                <Button
                  size="sm"
                  variant={it.done ? "outline" : "default"}
                  onClick={it.onAction}
                >
                  {it.actionLabel}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}