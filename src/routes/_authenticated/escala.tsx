import { createFileRoute, redirect } from "@tanstack/react-router";
import { Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PipelineHub } from "@/components/PipelineHub";

export const Route = createFileRoute("/_authenticated/escala")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: EscalaHubPage,
});

function EscalaHubPage() {
  return (
    <PipelineHub
      title="Escala do Produto"
      description="Checklist final de publicação: ebook, playbook, copy, criativos, página, checkout. Ideias de anúncios e próximos passos de tráfego."
      icon={Rocket}
      tab="escala"
      metaKey="scale"
      accent="linear-gradient(135deg, #a855f7, #ec4899)"
    />
  );
}