import { createFileRoute, redirect } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PipelineHub } from "@/components/PipelineHub";

export const Route = createFileRoute("/_authenticated/criativos")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: CriativosHubPage,
});

function CriativosHubPage() {
  return (
    <PipelineHub
      title="Criativos & Anúncios"
      description="Biblioteca de 18 formatos virais (Native Notes, Portal, POV Ebook, Before/After…). Headline, corpo, CTA e prompt visual em 1:1, 4:5 e 9:16."
      icon={Megaphone}
      tab="criativos"
      metaKey="creatives"
      accent="linear-gradient(135deg, #ff5f8f, #ff8a3d)"
    />
  );
}