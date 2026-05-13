import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StandaloneBriefingForm } from "./StandaloneBriefingForm";
import { SalesPageResult } from "./SalesPageResult";
import { generateSalesPage } from "@/lib/sales-page.functions";
import { listProjects } from "@/lib/project.functions";
import type { SalesPage } from "@/lib/sales-page.server";
import type { StandaloneBriefing } from "@/lib/standalone/briefing";
import { SaveToProjectButton } from "./SaveToProjectButton";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Prompts = {
  lovable: string;
  googleAiStudio: string;
  html: string;
  v0: string;
  claude: string;
};

export function StandaloneSalesPage() {
  const generate = useServerFn(generateSalesPage);
  const list = useServerFn(listProjects);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ page: SalesPage; prompts: Prompts } | null>(null);
  const [mode, setMode] = useState<"project" | "standalone">("standalone");
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    list()
      .then((r) =>
        setProjects(
          (r as Array<{ id: string; title: string }>).map((p) => ({
            id: p.id,
            title: p.title,
          })),
        ),
      )
      .catch(() => setProjects([]));
  }, [list]);

  async function onReady(b: StandaloneBriefing) {
    setBusy(true);
    setData(null);
    try {
      const r = await generate({ data: { kind: "standalone", briefing: b } });
      setData({ page: r.page, prompts: r.prompts });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar página");
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateForProject() {
    if (!projectId) {
      toast.error("Selecione um projeto.");
      return;
    }
    setBusy(true);
    setData(null);
    try {
      const r = await generate({ data: { kind: "project", projectId } });
      setData({ page: r.page, prompts: r.prompts });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar página");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modo</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "project" ? "default" : "outline"}
              onClick={() => setMode("project")}
            >
              Projeto existente
            </Button>
            <Button
              size="sm"
              variant={mode === "standalone" ? "default" : "outline"}
              onClick={() => setMode("standalone")}
            >
              Produto avulso
            </Button>
          </div>
        </CardContent>
      </Card>

      {mode === "project" ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <Label>Projeto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={projects.length ? "Selecione um projeto" : "Nenhum projeto encontrado"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={onGenerateForProject} disabled={busy || !projectId}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gerar Página com IA
            </Button>
          </CardContent>
        </Card>
      ) : (
        <StandaloneBriefingForm
          module="pagina-venda"
          onReady={onReady}
          busy={busy}
          submitLabel="Gerar Página com IA"
        />
      )}

      {data && (
        <>
          <div className="flex justify-end">
            <SaveToProjectButton
              kind="salesPage"
              payload={data}
              defaultTitle={data.page.headline?.slice(0, 60) || "Página"}
            />
          </div>
          <SalesPageResult page={data.page} prompts={data.prompts} />
        </>
      )}
    </div>
  );
}