import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PenLine, RefreshCw } from "lucide-react";
import { generateSalesCopy } from "@/lib/copy.functions";
import type { SalesCopy } from "@/lib/copy.server";
import { CopyResult } from "@/components/pipeline/CopyResult";

export function CopyTab({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string;
  initial: SalesCopy | null;
  onSaved?: (copy: SalesCopy) => void;
}) {
  const generate = useServerFn(generateSalesCopy);
  const [copy, setCopy] = useState<SalesCopy | null>(initial);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await generate({ data: { kind: "project", projectId } });
      setCopy(r.copy);
      onSaved?.(r.copy);
      toast.success("Copy gerada e salva no projeto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar copy");
    } finally {
      setBusy(false);
    }
  }

  if (!copy) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Copy de Vendas</p>
              <p className="text-xs text-muted-foreground">
                Gera headline, big idea, mecanismo, oferta, stack, garantia, FAQ e CTA
                a partir do briefing deste projeto.
              </p>
            </div>
          </div>
          <Button onClick={run} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PenLine className="mr-2 h-4 w-4" />
            )}
            Gerar Copy com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={run} disabled={busy} variant="outline" size="sm">
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Regenerar
        </Button>
      </div>
      <CopyResult copy={copy} />
    </div>
  );
}