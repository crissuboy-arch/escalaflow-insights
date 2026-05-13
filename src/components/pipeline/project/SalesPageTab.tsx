import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LayoutTemplate, RefreshCw } from "lucide-react";
import { generateSalesPage } from "@/lib/sales-page.functions";
import type { SalesPage } from "@/lib/sales-page.server";
import { SalesPageResult } from "@/components/pipeline/SalesPageResult";

type Prompts = { lovable: string; googleAiStudio: string; v0: string; claude: string };

export function SalesPageTab({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string;
  initial: { page: SalesPage; prompts: Prompts } | null;
  onSaved?: (data: { page: SalesPage; prompts: Prompts }) => void;
}) {
  const generate = useServerFn(generateSalesPage);
  const [state, setState] = useState<{ page: SalesPage; prompts: Prompts } | null>(initial);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await generate({ data: { kind: "project", projectId } });
      const next = { page: r.page, prompts: r.prompts };
      setState(next);
      onSaved?.(next);
      toast.success("Página de venda gerada e salva no projeto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar página");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Página de Venda</p>
              <p className="text-xs text-muted-foreground">
                Estrutura em blocos: Hero · Dor · Promessa · Mecanismo · Benefícios ·
                Prova · Oferta · Bônus · Garantia · FAQ · CTA + prompts para IA externa.
              </p>
            </div>
          </div>
          <Button onClick={run} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LayoutTemplate className="mr-2 h-4 w-4" />
            )}
            Gerar Página com IA
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
      <SalesPageResult page={state.page} prompts={state.prompts} />
    </div>
  );
}