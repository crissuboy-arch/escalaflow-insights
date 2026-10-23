import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Database as DatabaseIcon, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/auth/is-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listTables, fetchTableRows, ALLOWED_TABLES } from "@/lib/db-browser.functions";

export const Route = createFileRoute("/_authenticated/database")({
  // Esta checagem é só UX (redirecionamento imediato, sem flash de
  // conteúdo) — a proteção real está em listTables/fetchTableRows
  // (db-browser.functions.ts), que roda server-side e não pode ser
  // contornada pelo cliente.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    if (!(await isAdmin(supabase, data.user.id))) throw redirect({ to: "/dashboard" });
  },
  component: DatabasePage,
});

function DatabasePage() {
  const fetchTables = useServerFn(listTables);
  const fetchRows = useServerFn(fetchTableRows);
  const [selected, setSelected] = useState<string>(ALLOWED_TABLES[2]); // "projects"
  const [limit, setLimit] = useState<number>(50);
  const [filter, setFilter] = useState("");

  const tablesQ = useQuery({
    queryKey: ["db-browser", "tables"],
    queryFn: () => fetchTables(),
  });

  const rowsQ = useQuery({
    queryKey: ["db-browser", "rows", selected, limit],
    queryFn: () => fetchRows({ data: { table: selected, limit } }),
    enabled: !!selected,
  });

  const tables = tablesQ.data?.tables ?? ALLOWED_TABLES;
  const rows = (rowsQ.data?.rows ?? []) as Array<Record<string, unknown>>;
  const count = rowsQ.data?.count ?? 0;

  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, filter]);

  useEffect(() => {
    document.title = "Database Browser · Flow";
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center shadow-[0_0_18px_-4px_var(--primary)]">
          <DatabaseIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database</h1>
          <p className="text-sm text-muted-foreground">
            Visualize as tabelas conectadas ao seu projeto. Os dados respeitam suas permissões (RLS).
          </p>
        </div>
      </div>

      <Card className="card-premium p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground">Tabela</label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione uma tabela" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-muted-foreground">Limite</label>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar nas linhas..."
                className="pl-8"
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => rowsQ.refetch()}
            disabled={rowsQ.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${rowsQ.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Badge variant="outline">{count} linhas no total</Badge>
          <Badge variant="outline">{rows.length} carregadas</Badge>
          <Badge variant="outline">{filtered.length} visíveis</Badge>
        </div>
      </Card>

      <Card className="card-premium p-0 overflow-hidden">
        {rowsQ.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rowsQ.isError ? (
          <div className="p-6 text-sm text-destructive">
            Erro ao carregar: {(rowsQ.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma linha visível. Você pode não ter permissão de leitura para esta tabela
            ou ela está vazia.
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card/95 backdrop-blur z-10">
                <tr className="border-b border-border/60">
                  {columns.map((c) => (
                    <th key={c} className="text-left px-3 py-2 font-semibold text-foreground/80 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-primary/5">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 align-top max-w-[280px]">
                        <CellValue value={row[c]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/60 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "outline"}>{String(value)}</Badge>;
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value);
    return (
      <span className="font-mono text-[11px] text-muted-foreground line-clamp-2" title={json}>
        {json.length > 120 ? json.slice(0, 120) + "…" : json}
      </span>
    );
  }
  const s = String(value);
  return (
    <span className="line-clamp-2 break-words" title={s}>
      {s}
    </span>
  );
}