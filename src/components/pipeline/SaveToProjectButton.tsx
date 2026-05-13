import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Save, Loader2, FolderPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listProjects, createProject, updateProject } from "@/lib/project.functions";

type Kind = "copy" | "salesPage" | "creative" | "checkout" | "escala" | "ebook" | "playbook";

export function SaveToProjectButton({
  kind,
  payload,
  defaultTitle,
  size = "sm",
  variant = "outline",
}: {
  kind: Kind;
  payload: unknown;
  defaultTitle?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "secondary" | "default";
}) {
  const list = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const update = useServerFn(updateProject);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; title: string }>>([]);
  const [selected, setSelected] = useState<string>("__new__");
  const [newTitle, setNewTitle] = useState(defaultTitle || "Novo projeto");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    list()
      .then((r) =>
        setRows((r as Array<{ id: string; title: string }>).map((p) => ({ id: p.id, title: p.title }))),
      )
      .catch(() => setRows([]));
  }, [open, list]);

  async function onConfirm() {
    setBusy(true);
    try {
      let projectId = selected;
      if (projectId === "__new__") {
        const r = await create({
          data: { source: "scratch", mode: "combo", title: newTitle.trim() || "Novo projeto" },
        });
        projectId = r.id;
      }
      // payload is fanned out into meta[kind]; cross-module seeding will run
      // server-side on next AI generation. Here we just persist the artifact.
      await update({
        data: { id: projectId, patch: { meta: { [kind]: payload as never } } },
      });
      setSavedId(projectId);
      toast.success("Salvo no projeto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSavedId(null); }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Save className="mr-2 h-4 w-4" /> Salvar em Projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar em Projeto</DialogTitle>
        </DialogHeader>
        {savedId ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Conteúdo salvo no projeto.</p>
            <Link to="/projetos/$id" params={{ id: savedId }}>
              <Button className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir projeto
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">
                    <span className="flex items-center"><FolderPlus className="mr-2 h-3.5 w-3.5" /> Criar novo projeto</span>
                  </SelectItem>
                  {rows.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected === "__new__" && (
              <div className="space-y-1.5">
                <Label>Nome do novo projeto</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
            )}
            <DialogFooter>
              <Button onClick={onConfirm} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}