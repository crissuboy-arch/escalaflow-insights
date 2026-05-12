import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Library, User as UserIcon, ArrowLeft, Hash } from "lucide-react";
import { toast } from "sonner";
import {
  copyToClipboard,
  openInNewTab,
  buildAdsLibraryUrl,
  META_ADS_LIBRARY_BASE,
} from "@/lib/external";

type Search = {
  url?: string;
  id?: string;
  profile?: string;
  advertiser?: string;
  headline?: string;
};

export const Route = createFileRoute("/_authenticated/link-externo")({
  component: ExternalLinkPage,
  validateSearch: (s: Record<string, unknown>): Search => ({
    url: typeof s.url === "string" ? s.url : undefined,
    id: typeof s.id === "string" ? s.id : undefined,
    profile: typeof s.profile === "string" ? s.profile : undefined,
    advertiser: typeof s.advertiser === "string" ? s.advertiser : undefined,
    headline: typeof s.headline === "string" ? s.headline : undefined,
  }),
});

function ExternalLinkPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const adUrl = search.url;
  const adLibraryId = search.id;
  const profileUrl = search.profile;
  const isMeta = useMemo(
    () => !!adUrl && /facebook\.com|fb\.com|instagram\.com/i.test(adUrl),
    [adUrl],
  );
  const libraryUrl = buildAdsLibraryUrl(adLibraryId);

  const onCopy = async (value: string, label: string) => {
    const ok = await copyToClipboard(value);
    toast[ok ? "success" : "error"](ok ? `${label} copiado` : "Não foi possível copiar");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => history.length > 1 ? history.back() : navigate({ to: "/minerar" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Link externo</h1>
        <p className="text-muted-foreground">
          {search.advertiser ? <>Anunciante: <span className="font-medium text-foreground">{search.advertiser}</span></> : "Abra o link com segurança em uma nova aba."}
        </p>
        {search.headline && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{search.headline}</p>
        )}
      </div>

      {isMeta && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-200/90">
            Se o Facebook bloquear o link direto, copie o ID do anúncio e cole na Biblioteca de Anúncios.
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardContent className="space-y-4 p-6">
          {adUrl ? (
            <>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  URL do anúncio
                </p>
                <code className="block break-all rounded-md bg-muted p-2 text-xs">{adUrl}</code>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  className="flex-1 text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                  onClick={() => openInNewTab(adUrl)}
                >
                  <ExternalLink className="mr-2 h-5 w-5" /> Abrir anúncio em nova aba
                </Button>
                <Button size="lg" variant="outline" onClick={() => onCopy(adUrl, "Link")}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar link
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">URL direta não disponível para este anúncio.</p>
          )}

          {adLibraryId && (
            <div className="rounded-md border border-border/60 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                ID do anúncio (Meta Ad Library)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all rounded-md bg-muted p-2 text-xs">{adLibraryId}</code>
                <Button variant="outline" size="sm" onClick={() => onCopy(adLibraryId, "ID")}>
                  <Hash className="mr-1 h-4 w-4" /> Copiar ID
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" onClick={() => openInNewTab(libraryUrl)}>
              <Library className="mr-2 h-4 w-4" /> Abrir Biblioteca de Anúncios
            </Button>
            <Button
              variant="outline"
              onClick={() => onCopy(META_ADS_LIBRARY_BASE, "Link da Biblioteca")}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar link da Biblioteca
            </Button>
          </div>

          {profileUrl && (
            <div className="border-t border-border/60 pt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Perfil do anunciante
              </p>
              <code className="mb-2 block break-all rounded-md bg-muted p-2 text-xs">{profileUrl}</code>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openInNewTab(profileUrl)}>
                  <UserIcon className="mr-2 h-4 w-4" /> Abrir perfil do anunciante
                </Button>
                <Button variant="outline" onClick={() => onCopy(profileUrl, "Link do perfil")}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar link do perfil
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
