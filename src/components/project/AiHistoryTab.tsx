import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, History, Trash2, Copy as CopyIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAiHistory, deleteAiHistory } from "@/lib/ai/history.functions";

type Row = {
  id: string;
  module: string;
  prompt: unknown;
  response: unknown;
  model: string | null;
  version: number;
  created_at: string;
};

const MODULES = ["all", "copy", "salesPage", "creative", "checkout", "escala", "ebook", "playbook"];

export function AiHistoryTab({ projectId }: { projectId: string }) {
  const list = useServerFn(listAiHistory);
  const remove = useServerFn(deleteAiHistory);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  async function refresh() {
    setRows(null);
    try {
      const r = await list({
        data: { projectId, module: filter === "all" ? undefined : filter, limit: 100 },
      });
      setRows(r as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar histórico");
      setRows([]);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filter]);

  function exportJson(row: Row) {
    const blob = new Blob([JSON.stringify(row, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-${row.module}-${row.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m}>{m === "all" ? "Todos os módulos" : m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={refresh}>Atualizar</Button>
      </div>
      {rows === null ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma geração registrada ainda. Use os módulos para criar conteúdo com IA.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{r.module}</Badge>
                    {r.model && <Badge variant="outline" className="text-xs">{r.model}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await navigator.clipboard.writeText(JSON.stringify(r.response, null, 2));
                        toast.success("Resposta copiada");
                      }}
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportJson(r)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Excluir registro?")) return;
                        try {
                          await remove({ data: { id: r.id } });
                          await refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Falha");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ver prompt/resposta</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">
{JSON.stringify({ prompt: r.prompt, response: r.response }, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}