import { createFileRoute } from "@tanstack/react-router";
import { Rocket } from "lucide-react";
import { DualModeHub } from "@/components/pipeline/DualModeHub";
import { StandaloneEscala } from "@/components/pipeline/StandaloneEscala";

export const Route = createFileRoute("/_authenticated/escala")({
  component: EscalaHubPage,
});

function EscalaHubPage() {
  return (
    <DualModeHub
      title="Escala do Produto"
      description="Checklist final de publicação: ebook, playbook, copy, criativos, página, checkout. Ideias de anúncios e próximos passos de tráfego."
      icon={Rocket}
      tab="escala"
      metaKey="scale"
      accent="linear-gradient(135deg, #a855f7, #ec4899)"
      standalone={<StandaloneEscala />}
    />
  );
}