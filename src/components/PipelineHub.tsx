import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, FolderKanban, type LucideIcon } from "lucide-react";
import { listProjects } from "@/lib/project.functions";

type Row = {
  id: string;
  title: string;
  niche: string | null;
  mode: string;
  status: string;
  cover_url: string | null;
  ebook_id: string | null;
  playbook_id: string | null;
  updated_at: string;
  meta?: Record<string, unknown>;
};

export type PipelineTab = "copy" | "criativos" | "pagina" | "checkout" | "escala";

export function PipelineHub({
  title,
  description,
  icon: Icon,
  tab,
  accent,
  metaKey,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tab: PipelineTab;
  accent: string;
  metaKey: string;
}) {
  const navigate = useNavigate();
  const list = useServerFn(listProjects);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    list({ data: undefined as never })
      .then((r) => alive && setRows(r as Row[]))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [list]);

  const open = (id: string) =>
    navigate({ to: "/projetos/$id", params: { id }, search: { tab } as never });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-6"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: accent }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground shadow-lg"
            style={{ background: accent }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Selecione um projeto
        </h2>
        <Link to="/projetos">
          <Button variant="ghost" size="sm">
            <FolderKanban className="mr-2 h-4 w-4" /> Ver todos os projetos
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem projetos. Crie um em{" "}
              <Link to="/projetos" className="text-primary underline">
                Projetos
              </Link>{" "}
              para começar a esteira.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const meta = (r.meta ?? {}) as Record<string, unknown>;
            const has = !!meta[metaKey];
            return (
              <motion.div
                key={r.id}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <Card
                  className="group cursor-pointer overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]"
                  onClick={() => open(r.id)}
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{r.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.niche ?? "Sem nicho"}
                        </p>
                      </div>
                      {has ? (
                        <Badge variant="default" className="shrink-0">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className="capitalize">
                        {r.mode}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}