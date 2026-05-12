import { createFileRoute, redirect } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DualModeHub } from "@/components/pipeline/DualModeHub";
import { StandaloneBriefingForm } from "@/components/pipeline/StandaloneBriefingForm";
import { CopyResult } from "@/components/pipeline/CopyResult";
import { generateSalesCopy } from "@/lib/copy.functions";
import type { SalesCopy } from "@/lib/copy.server";
import type { StandaloneBriefing } from "@/lib/standalone/briefing";

export const Route = createFileRoute("/_authenticated/copy")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: CopyHubPage,
});

function CopyHubPage() {
  return (
    <DualModeHub
      title="Copy de Vendas"
      description="Headline, big idea, mecanismo único, oferta, stack, garantia, FAQ, CTA — copy completa pronta para sua página."
      icon={PenLine}
      tab="copy"
      metaKey="copy"
      accent="linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))"
      standalone={<StandaloneCopy />}
    />
  );
}

function StandaloneCopy() {
  const generate = useServerFn(generateSalesCopy);
  const [busy, setBusy] = useState(false);
  const [copy, setCopy] = useState<SalesCopy | null>(null);

  const onReady = async (b: StandaloneBriefing) => {
    setBusy(true);
    setCopy(null);
    try {
      const r = await generate({ data: { kind: "standalone", briefing: b } });
      setCopy(r.copy);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar copy");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <StandaloneBriefingForm module="copy" onReady={onReady} busy={busy} submitLabel="Gerar Copy com IA" />
      {copy && <CopyResult copy={copy} />}
    </div>
  );
}