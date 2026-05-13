import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StandaloneBriefingForm } from "./StandaloneBriefingForm";
import { SalesPageResult } from "./SalesPageResult";
import { generateSalesPage } from "@/lib/sales-page.functions";
import type { SalesPage } from "@/lib/sales-page.server";
import type { StandaloneBriefing } from "@/lib/standalone/briefing";
import { SaveToProjectButton } from "./SaveToProjectButton";

type Prompts = {
  lovable: string;
  googleAiStudio: string;
  html: string;
  v0: string;
  claude: string;
};

export function StandaloneSalesPage() {
  const generate = useServerFn(generateSalesPage);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ page: SalesPage; prompts: Prompts } | null>(null);

  async function onReady(b: StandaloneBriefing) {
    setBusy(true);
    setData(null);
    try {
      const r = await generate({ data: { kind: "standalone", briefing: b } });
      setData({ page: r.page, prompts: r.prompts });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar página");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <StandaloneBriefingForm
        module="pagina-venda"
        onReady={onReady}
        busy={busy}
        submitLabel="Gerar Página com IA"
      />
      {data && (
        <>
          <div className="flex justify-end">
            <SaveToProjectButton
              kind="salesPage"
              payload={data}
              defaultTitle={data.page.headline?.slice(0, 60) || "Página"}
            />
          </div>
          <SalesPageResult page={data.page} prompts={data.prompts} />
        </>
      )}
    </div>
  );
}