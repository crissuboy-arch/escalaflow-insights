// Facebook Viral — Biblioteca (Fase 2). Importar páginas/reels por URL,
// organizar por nicho/pasta, preencher métricas manuais, e gerir produtos
// de afiliado. Sem API externa nesta fase — tudo é entrada manual +
// validação/deteção de link local.
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Facebook, Film, Plus, Trash2, ExternalLink, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { checkFacebookUrl } from "@/lib/facebook-viral/link-detector";
import {
  findOrCreateViralPage,
  saveViralReel,
  listViralPages,
  listViralReels,
  updateViralPage,
  updateViralReel,
  deleteViralPage,
  deleteViralReel,
  saveAffiliateProduct,
  listAffiliateProducts,
  deleteAffiliateProduct,
  type ViralPageRow,
  type ViralReelRow,
  type AffiliateProductRow,
} from "@/lib/facebook-viral.functions";

export const Route = createFileRoute("/_authenticated/facebook-viral")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: FacebookViralPage,
});

function FacebookViralPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Facebook className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Facebook Viral</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Importa páginas e Reels por link, organiza por nicho, e prepara material para o Viral Remix
        Studio. Visualizações/seguidores que o Facebook não expõe a visitantes anónimos entram
        manualmente — nunca são inventados.
      </p>

      <Tabs defaultValue="importar">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="paginas">Páginas</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
          <TabsTrigger value="afiliados">Produtos de Afiliado</TabsTrigger>
        </TabsList>

        <TabsContent value="importar">
          <ImportForm />
        </TabsContent>
        <TabsContent value="paginas">
          <PagesList />
        </TabsContent>
        <TabsContent value="reels">
          <ReelsList />
        </TabsContent>
        <TabsContent value="afiliados">
          <AffiliateProductsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Importar Página ou Reel ──────────────────────────────────────────────

function ImportForm() {
  const findPage = useServerFn(findOrCreateViralPage);
  const saveReel = useServerFn(saveViralReel);
  const queryClient = useQueryClient();

  const [pageUrl, setPageUrl] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [pageName, setPageName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [niche, setNiche] = useState("");
  const [folder, setFolder] = useState("");
  const [followers, setFollowers] = useState("");
  const [views, setViews] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [productPromoted, setProductPromoted] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const reelCheck = reelUrl.trim() ? checkFacebookUrl(reelUrl) : null;
  const pageCheck = pageUrl.trim() ? checkFacebookUrl(pageUrl) : null;

  async function handleSubmit() {
    setFeedback(null);
    if (!pageUrl.trim() && !reelUrl.trim()) {
      setFeedback({ ok: false, message: "Preenche a URL da página, do Reel, ou ambas." });
      return;
    }
    setSubmitting(true);
    try {
      let viralPageId: string | undefined;

      if (pageUrl.trim()) {
        const pageResult = await findPage({
          data: {
            pageUrl,
            pageName: pageName || undefined,
            country: country || undefined,
            language: language || undefined,
            niche: niche || undefined,
            folder: folder || undefined,
            followers: followers ? Number(followers) : undefined,
            notes: notes || undefined,
          },
        });
        if (!pageResult.ok) {
          setFeedback({ ok: false, message: pageResult.error });
          setSubmitting(false);
          return;
        }
        viralPageId = pageResult.page.id;
      }

      if (reelUrl.trim()) {
        const reelResult = await saveReel({
          data: {
            reelUrl,
            viralPageId,
            views: views ? Number(views) : undefined,
            publishedAt: publishedAt || undefined,
            productPromoted: productPromoted || undefined,
            affiliateLink: affiliateLink || undefined,
            notes: notes || undefined,
          },
        });
        if (!reelResult.ok) {
          setFeedback({ ok: false, message: reelResult.error });
          setSubmitting(false);
          return;
        }
      }

      setFeedback({ ok: true, message: "Guardado com sucesso." });
      setPageUrl("");
      setReelUrl("");
      setPageName("");
      setFollowers("");
      setViews("");
      setPublishedAt("");
      setProductPromoted("");
      setAffiliateLink("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["facebook-viral"] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Importar Página ou Reel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              URL da página Facebook
            </label>
            <Input
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="facebook.com/tysonreed"
            />
            {pageCheck && !pageCheck.valid ? (
              <p className="text-xs text-destructive">{pageCheck.error}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL do Reel</label>
            <Input
              value={reelUrl}
              onChange={(e) => setReelUrl(e.target.value)}
              placeholder="facebook.com/.../reels/..."
            />
            {reelCheck ? (
              reelCheck.valid ? (
                <p className="text-xs text-muted-foreground">Detetado: {reelCheck.linkType}</p>
              ) : (
                <p className="text-xs text-destructive">{reelCheck.error}</p>
              )
            ) : null}
          </div>
          <Field label="Nome da página" value={pageName} onChange={setPageName} />
          <Field label="País" value={country} onChange={setCountry} />
          <Field label="Idioma" value={language} onChange={setLanguage} />
          <Field label="Nicho" value={niche} onChange={setNiche} />
          <Field label="Pasta" value={folder} onChange={setFolder} />
          <Field
            label="Seguidores (manual)"
            value={followers}
            onChange={setFollowers}
            type="number"
          />
          <Field
            label="Visualizações do Reel (manual)"
            value={views}
            onChange={setViews}
            type="number"
          />
          <Field
            label="Data da publicação (manual)"
            value={publishedAt}
            onChange={setPublishedAt}
            type="date"
          />
          <Field label="Produto promovido" value={productPromoted} onChange={setProductPromoted} />
          <Field label="Link de afiliado" value={affiliateLink} onChange={setAffiliateLink} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Observações</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        {feedback ? (
          <p className={`text-sm ${feedback.ok ? "text-emerald-600" : "text-destructive"}`}>
            {feedback.message}
          </p>
        ) : null}
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── Páginas ──────────────────────────────────────────────────────────────

function PagesList() {
  const listPages = useServerFn(listViralPages);
  const removePage = useServerFn(deleteViralPage);
  const listProducts = useServerFn(listAffiliateProducts);
  const queryClient = useQueryClient();
  const [niche, setNiche] = useState("");
  const [editing, setEditing] = useState<ViralPageRow | null>(null);
  const [deleting, setDeleting] = useState<ViralPageRow | null>(null);

  const pagesQ = useQuery({
    queryKey: ["facebook-viral", "pages", niche],
    queryFn: () => listPages({ data: { niche: niche || undefined, orderBy: "created_at" } }),
  });
  const productsQ = useQuery({
    queryKey: ["facebook-viral", "affiliate-products"],
    queryFn: () => listProducts(),
  });

  const pages = (pagesQ.data ?? []) as ViralPageRow[];
  const products = (productsQ.data ?? []) as AffiliateProductRow[];

  async function handleDelete(id: string) {
    const result = await removePage({ data: { id } });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível apagar a página.");
      return;
    }
    toast.success("Página apagada.");
    setDeleting(null);
    queryClient.invalidateQueries({ queryKey: ["facebook-viral"] });
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Filtrar por nicho…"
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        className="max-w-xs"
      />
      {pagesQ.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma página guardada ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((p) => {
            const linkedProduct = products.find((prod) => prod.id === p.affiliate_product_id);
            return (
              <Card key={p.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.page_name || p.page_url}</p>
                      <a
                        href={p.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        Abrir página <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.niche ? <Badge variant="secondary">{p.niche}</Badge> : null}
                    {p.country ? <Badge variant="secondary">{p.country}</Badge> : null}
                    {p.folder ? <Badge variant="outline">{p.folder}</Badge> : null}
                    {typeof p.followers === "number" ? (
                      <Badge variant="secondary">{p.followers.toLocaleString()} seguidores</Badge>
                    ) : null}
                    {linkedProduct ? (
                      <Badge variant="outline">Produto: {linkedProduct.product_name}</Badge>
                    ) : null}
                  </div>
                  {p.notes ? <p className="text-xs text-muted-foreground">{p.notes}</p> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing ? (
        <EditPageDialog
          page={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["facebook-viral"] });
          }}
        />
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar página guardada?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.page_name || deleting?.page_url} será removida. Reels já associados a ela
              não são apagados, só perdem a ligação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && handleDelete(deleting.id)}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditPageDialog({
  page,
  products,
  onClose,
  onSaved,
}: {
  page: ViralPageRow;
  products: AffiliateProductRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const update = useServerFn(updateViralPage);
  const [pageUrl, setPageUrl] = useState(page.page_url);
  const [pageName, setPageName] = useState(page.page_name ?? "");
  const [country, setCountry] = useState(page.country ?? "");
  const [language, setLanguage] = useState(page.language ?? "");
  const [niche, setNiche] = useState(page.niche ?? "");
  const [folder, setFolder] = useState(page.folder ?? "");
  const [followers, setFollowers] = useState(
    typeof page.followers === "number" ? String(page.followers) : "",
  );
  const [notes, setNotes] = useState(page.notes ?? "");
  const [affiliateProductId, setAffiliateProductId] = useState(page.affiliate_product_id ?? "");
  const [saving, setSaving] = useState(false);

  const urlCheck = pageUrl.trim() ? checkFacebookUrl(pageUrl) : null;

  async function handleSave() {
    setSaving(true);
    try {
      const result = await update({
        data: {
          id: page.id,
          pageUrl,
          pageName: pageName || undefined,
          country: country || undefined,
          language: language || undefined,
          niche: niche || undefined,
          folder: folder || undefined,
          followers: followers ? Number(followers) : undefined,
          notes: notes || undefined,
          affiliateProductId: affiliateProductId || null,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Página atualizada.");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar página</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL da página</label>
            <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
            {urlCheck && !urlCheck.valid ? (
              <p className="text-xs text-destructive">{urlCheck.error}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da página" value={pageName} onChange={setPageName} />
            <Field label="País" value={country} onChange={setCountry} />
            <Field label="Idioma" value={language} onChange={setLanguage} />
            <Field label="Nicho" value={niche} onChange={setNiche} />
            <Field label="Pasta" value={folder} onChange={setFolder} />
            <Field
              label="Seguidores (manual)"
              value={followers}
              onChange={setFollowers}
              type="number"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Produto de afiliado</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={affiliateProductId}
              onChange={(e) => setAffiliateProductId(e.target.value)}
            >
              <option value="">Nenhum</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.product_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reels ────────────────────────────────────────────────────────────────

function ReelsList() {
  const listReels = useServerFn(listViralReels);
  const removeReel = useServerFn(deleteViralReel);
  const listProducts = useServerFn(listAffiliateProducts);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ViralReelRow | null>(null);
  const [deleting, setDeleting] = useState<ViralReelRow | null>(null);

  const reelsQ = useQuery({
    queryKey: ["facebook-viral", "reels"],
    queryFn: () => listReels({ data: { orderBy: "views" } }),
  });
  const productsQ = useQuery({
    queryKey: ["facebook-viral", "affiliate-products"],
    queryFn: () => listProducts(),
  });

  const reels = (reelsQ.data ?? []) as ViralReelRow[];
  const products = (productsQ.data ?? []) as AffiliateProductRow[];

  async function handleDelete(id: string) {
    const result = await removeReel({ data: { id } });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível apagar o Reel.");
      return;
    }
    toast.success("Reel apagado.");
    setDeleting(null);
    queryClient.invalidateQueries({ queryKey: ["facebook-viral"] });
  }

  return (
    <div className="space-y-3">
      {reelsQ.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : reels.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum Reel guardado ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reels.map((r) => {
            const linkedProduct = products.find((prod) => prod.id === r.affiliate_product_id);
            return (
              <Card key={r.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={r.reel_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {r.product_promoted || r.reel_url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to="/facebook-viral/$reelId/remix" params={{ reelId: r.id }}>
                        <Button variant="outline" size="sm">
                          Remix
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{r.link_type}</Badge>
                    {typeof r.views === "number" ? (
                      <Badge variant="secondary">{r.views.toLocaleString()} visualizações</Badge>
                    ) : null}
                    {r.published_at ? (
                      <Badge variant="secondary">
                        {new Date(r.published_at).toLocaleDateString("pt-BR")}
                      </Badge>
                    ) : null}
                    {linkedProduct ? (
                      <Badge variant="outline">Produto: {linkedProduct.product_name}</Badge>
                    ) : null}
                  </div>
                  {r.notes ? <p className="text-xs text-muted-foreground">{r.notes}</p> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing ? (
        <EditReelDialog
          reel={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["facebook-viral"] });
          }}
        />
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Reel guardado?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.product_promoted || deleting?.reel_url} será removido, incluindo a ligação
              a vídeos/roteiros do Viral Remix Studio associados a este Reel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && handleDelete(deleting.id)}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditReelDialog({
  reel,
  products,
  onClose,
  onSaved,
}: {
  reel: ViralReelRow;
  products: AffiliateProductRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const update = useServerFn(updateViralReel);
  const [views, setViews] = useState(typeof reel.views === "number" ? String(reel.views) : "");
  const [publishedAt, setPublishedAt] = useState(
    reel.published_at ? reel.published_at.slice(0, 10) : "",
  );
  const [productPromoted, setProductPromoted] = useState(reel.product_promoted ?? "");
  const [affiliateLink, setAffiliateLink] = useState(reel.affiliate_link ?? "");
  const [affiliateProductId, setAffiliateProductId] = useState(reel.affiliate_product_id ?? "");
  const [notes, setNotes] = useState(reel.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await update({
        data: {
          id: reel.id,
          views: views ? Number(views) : undefined,
          publishedAt: publishedAt || undefined,
          productPromoted: productPromoted || undefined,
          affiliateLink: affiliateLink || undefined,
          affiliateProductId: affiliateProductId || null,
          notes: notes || undefined,
        },
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível guardar as alterações.");
        return;
      }
      toast.success("Reel atualizado.");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Reel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Visualizações (manual)" value={views} onChange={setViews} type="number" />
            <Field
              label="Data da publicação"
              value={publishedAt}
              onChange={setPublishedAt}
              type="date"
            />
            <Field
              label="Produto promovido"
              value={productPromoted}
              onChange={setProductPromoted}
            />
            <Field label="Link de afiliado" value={affiliateLink} onChange={setAffiliateLink} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Produto de afiliado cadastrado
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={affiliateProductId}
              onChange={(e) => setAffiliateProductId(e.target.value)}
            >
              <option value="">Nenhum</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.product_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Produtos de afiliado ─────────────────────────────────────────────────

function AffiliateProductsPanel() {
  const save = useServerFn(saveAffiliateProduct);
  const list = useServerFn(listAffiliateProducts);
  const remove = useServerFn(deleteAffiliateProduct);
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<AffiliateProductRow | null>(null);

  const [network, setNetwork] = useState<"clickbank" | "digistore24" | "other">("other");
  const [productName, setProductName] = useState("");
  const [commission, setCommission] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [productNiche, setProductNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const productsQ = useQuery({
    queryKey: ["facebook-viral", "affiliate-products"],
    queryFn: () => list(),
  });
  const products = (productsQ.data ?? []) as AffiliateProductRow[];

  async function handleSubmit() {
    if (!productName.trim() || !affiliateLink.trim()) return;
    setSubmitting(true);
    try {
      const result = await save({
        data: {
          network,
          productName,
          commission: commission || undefined,
          affiliateLink,
          salesPageUrl: salesPageUrl || undefined,
          niche: productNiche || undefined,
          targetAudience: targetAudience || undefined,
        },
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível guardar o produto.");
        return;
      }
      toast.success("Produto de afiliado guardado.");
      setProductName("");
      setCommission("");
      setAffiliateLink("");
      setSalesPageUrl("");
      setProductNiche("");
      setTargetAudience("");
      queryClient.invalidateQueries({ queryKey: ["facebook-viral", "affiliate-products"] });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const result = await remove({ data: { id } });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível apagar o produto.");
      return;
    }
    toast.success("Produto apagado.");
    setDeleting(null);
    queryClient.invalidateQueries({ queryKey: ["facebook-viral", "affiliate-products"] });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo produto de afiliado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Rede</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={network}
              onChange={(e) => setNetwork(e.target.value as typeof network)}
            >
              <option value="clickbank">ClickBank</option>
              <option value="digistore24">Digistore24</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <Field label="Nome do produto" value={productName} onChange={setProductName} />
          <Field label="Comissão" value={commission} onChange={setCommission} />
          <Field label="Link de afiliado" value={affiliateLink} onChange={setAffiliateLink} />
          <Field label="Página de vendas" value={salesPageUrl} onChange={setSalesPageUrl} />
          <Field label="Nicho" value={productNiche} onChange={setProductNiche} />
          <Field label="Público-alvo" value={targetAudience} onChange={setTargetAudience} />
          <Button onClick={handleSubmit} disabled={submitting} className="sm:col-span-2 w-fit">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Guardar produto
          </Button>
        </CardContent>
      </Card>

      {products.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-1 p-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{p.product_name}</p>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{p.network}</Badge>
                  {p.commission ? <Badge variant="secondary">{p.commission}</Badge> : null}
                  {p.niche ? <Badge variant="secondary">{p.niche}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar produto de afiliado?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.product_name} será removido. Páginas/Reels já ligados a ele perdem a
              ligação, mas não são apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && handleDelete(deleting.id)}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
