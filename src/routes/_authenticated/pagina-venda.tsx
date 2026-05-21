import { createFileRoute, redirect } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DualModeHub } from "@/components/pipeline/DualModeHub";
import { StandaloneSalesPage } from "@/components/pipeline/StandaloneSalesPage";

export const Route = createFileRoute("/_authenticated/pagina-venda")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: PaginaVendaHubPage,
});

function PaginaVendaHubPage() {
  return (
    <DualModeHub
      title="Página de Venda"
      description="Estrutura completa em blocos: Hero · Dor · Promessa · Mecanismo · Benefícios · Prova · Oferta · Bônus · Garantia · FAQ · CTA."
      icon={LayoutTemplate}
      tab="pagina"
      metaKey="salesPage"
      accent="linear-gradient(135deg, #0A6CFF, #3BA3FF)"
      standalone={<StandaloneSalesPage />}
    />
  );
}