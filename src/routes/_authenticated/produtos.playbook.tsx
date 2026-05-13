import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, BookOpen, Pencil, Trash2, Eye, Sparkles, Loader2, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPlaybooks, deletePlaybook, setPlaybookStatus } from "@/lib/playbook.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/produtos/playbook")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: PlaybookLibraryPage,
});

type Row = Awaited<ReturnType<typeof listPlaybooks>>[number];

function PlaybookLibraryPage() {
  const list = useServerFn(listPlaybooks);
  const remove = useServerFn(deletePlaybook);
  const setStatus = useServerFn(setPlaybookStatus);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  const refresh = async () => {
    try {
      setRows(await list());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao listar");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="playbook-surface min-h-[calc(100vh-3rem)] -m-4 p-6 md:p-10 text-foreground">
      <header className="mx-auto mb-8 flex max-w-6xl items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[oklch(0.78_0.18_220)]">Biblioteca</p>
          <h1 className="playbook-title-display mt-1 text-4xl font-bold md:text-5xl">
            Seus Playbooks
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Experiências interativas em cenas, criadas a partir dos seus anúncios minerados.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-[var(--gradient-playbook)] text-white shadow-[var(--shadow-neon)] hover:opacity-90"
          style={{ background: "var(--gradient-playbook)" }}
          onClick={() => navigate({ to: "/produtos/playbook/novo" })}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Playbook
        </Button>
      </header>

      <div className="mx-auto max-w-6xl">
        {rows === null ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState onCreate={() => navigate({ to: "/produtos/playbook/novo" })} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="playbook-card-neon group rounded-2xl bg-card/60 p-3 backdrop-blur transition-transform hover:-translate-y-1"
              >
                <Link
                  to="/produtos/playbook/$id"
                  params={{ id: r.id }}
                  className="block aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.22_0.12_290)] to-[oklch(0.18_0.10_220)]"
                >
                  {r.cover_url ? (
                    <img src={r.cover_url} alt={r.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[oklch(0.78_0.18_220)]">
                      <Sparkles className="h-12 w-12 opacity-60" />
                    </div>
                  )}
                </Link>
                <div className="mt-3 space-y-2 px-1 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="playbook-title-display line-clamp-2 text-lg font-bold">{r.title}</h3>
                    <Badge
                      variant={r.status === "published" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {r.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {r.niche && <Badge variant="outline" className="text-xs">{r.niche}</Badge>}
                    <span>{r.scene_count} cena{r.scene_count === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button asChild size="sm" className="flex-1" variant="default">
                      <Link to="/produtos/playbook/$id" params={{ id: r.id }}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Abrir
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/produtos/playbook/$id/editar" params={{ id: r.id }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title={r.status === "published" ? "Despublicar" : "Publicar"}
                      onClick={async () => {
                        try {
                          await setStatus({
                            data: {
                              id: r.id,
                              status: r.status === "published" ? "draft" : "published",
                            },
                          });
                          toast.success(r.status === "published" ? "Despublicado" : "Publicado");
                          await refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Falhou");
                        }
                      }}
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!confirm("Excluir este playbook?")) return;
                        try {
                          await remove({ data: { id: r.id } });
                          toast.success("Excluído");
                          await refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Falhou");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="playbook-card-neon mx-auto max-w-xl rounded-3xl bg-card/40 p-10 text-center backdrop-blur">
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-playbook)" }}
      >
        <BookOpen className="h-8 w-8 text-white" />
      </div>
      <h2 className="playbook-title-display text-2xl font-bold">Nenhum playbook ainda</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Transforme um anúncio minerado em uma experiência interativa em cenas.
      </p>
      <Button
        size="lg"
        className="mt-6 text-white shadow-[var(--shadow-neon)]"
        style={{ background: "var(--gradient-playbook)" }}
        onClick={onCreate}
      >
        <Plus className="mr-2 h-4 w-4" /> Criar primeiro playbook
      </Button>
    </div>
  );
}