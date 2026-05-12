import { createFileRoute, redirect } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PipelineHub } from "@/components/PipelineHub";

export const Route = createFileRoute("/_authenticated/copy")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: CopyHubPage,
});

function CopyHubPage() {
  return (
    <PipelineHub
      title="Copy de Vendas"
      description="Headline, big idea, mecanismo único, oferta, stack, garantia, FAQ, CTA — copy completa pronta para sua página."
      icon={PenLine}
      tab="copy"
      metaKey="copy"
      accent="linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))"
    />
  );
}