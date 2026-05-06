import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { miningRepo } from "@/lib/mining/repository";
import type { MiningIngestPayload } from "@/lib/mining/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/importar-anuncio")({
  component: ImportAdPage,
  validateSearch: (search: Record<string, unknown>) => ({
    headline: typeof search.headline === "string" ? search.headline : "",
    copy: typeof search.copy === "string" ? search.copy : undefined,
    link: typeof search.link === "string" ? search.link : undefined,
    platform: typeof search.platform === "string" ? search.platform : undefined,
    country: typeof search.country === "string" ? search.country : undefined,
    niche: typeof search.niche === "string" ? search.niche : undefined,
    score: search.score != null ? Number(search.score) : undefined,
    analysisType: typeof search.analysisType === "string" ? search.analysisType : undefined,
    createdAt: typeof search.createdAt === "string" ? search.createdAt : undefined,
    creativeUrl: typeof search.creativeUrl === "string" ? search.creativeUrl : undefined,
  }),
});

function ImportAdPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      console.log("[importar-anuncio] search params:", search);
      if (!search.headline) {
        toast.error("Parâmetros inválidos: headline é obrigatório");
        navigate({ to: "/central-mineracao", replace: true });
        return;
      }
      const payload: MiningIngestPayload = {
        headline: search.headline,
        copy: search.copy,
        adUrl: search.link,
        platform: search.platform,
        country: search.country,
        niche: search.niche,
        score: Number.isFinite(search.score) ? search.score : 0,
        analysisType: search.analysisType,
        createdAt: search.createdAt,
        creativeUrl: search.creativeUrl,
        raw: { via: "url-import" },
      };
      console.log("[importar-anuncio] ingest payload:", payload);
      try {
        const ad = await miningRepo.ingest(payload, "extension");
        console.log("[importar-anuncio] saved ad:", ad);
        const all = await miningRepo.list();
        console.log("[importar-anuncio] repo size after ingest:", all.length);
        toast.success("Oferta importada com sucesso");
      } catch (e) {
        console.error("[importar-anuncio] ingest failed:", e);
        toast.error("Falha ao importar oferta");
      }
      // Pequeno delay para o localStorage event propagar antes de navegar
      setTimeout(() => navigate({ to: "/central-mineracao", replace: true }), 60);
    })();
  }, [search, navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Importando oferta para a Central de Mineração…</p>
    </div>
  );
}
