import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { savePlaybook, uploadPlaybookImage } from "@/lib/playbook.functions";
import { FlipBook } from "./FlipBook";
import { useNavigate } from "@tanstack/react-router";

export type EditorScene = {
  id: string;
  title: string;
  text: string;
  image_url: string | null;
};

export type EditorPlaybook = {
  id: string | null;
  title: string;
  status: "draft" | "published";
  scenes: EditorScene[];
};

function newScene(i: number): EditorScene {
  return {
    id: crypto.randomUUID(),
    title: `Página ${i + 1}`,
    text: "",
    image_url: null,
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

export function PlaybookEditor({ initial }: { initial: EditorPlaybook }) {
  const navigate = useNavigate();
  const save = useServerFn(savePlaybook);
  const upload = useServerFn(uploadPlaybookImage);

  const [pb, setPb] = useState<EditorPlaybook>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"editor" | "preview">("editor");

  const publicUrl =
    pb.id && typeof window !== "undefined" ? `${window.location.origin}/playbook/${pb.id}` : "";

  const updScene = (i: number, patch: Partial<EditorScene>) =>
    setPb((p) => {
      const scenes = p.scenes.slice();
      scenes[i] = { ...scenes[i], ...patch };
      return { ...p, scenes };
    });

  const move = (i: number, dir: -1 | 1) =>
    setPb((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.scenes.length) return p;
      const scenes = p.scenes.slice();
      [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
      return { ...p, scenes };
    });

  const remove = (i: number) =>
    setPb((p) => ({ ...p, scenes: p.scenes.filter((_, k) => k !== i) }));

  const duplicate = (i: number) =>
    setPb((p) => {
      const scenes = p.scenes.slice();
      scenes.splice(i + 1, 0, { ...scenes[i], id: crypto.randomUUID() });
      return { ...p, scenes };
    });

  const addPage = () =>
    setPb((p) => ({ ...p, scenes: [...p.scenes, newScene(p.scenes.length)] }));

  const onUpload = async (i: number, file: File) => {
    setBusy("Enviando imagem…");
    try {
      const dataUrl = await fileToDataUrl(file);
      const { url } = await upload({ data: { dataUrl } });
      updScene(i, { image_url: url ?? dataUrl });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(null);
    }
  };

  const persist = async (status: "draft" | "published") => {
    setBusy(status === "published" ? "Publicando…" : "Salvando…");
    try {
      const payload = {
        title: pb.title.trim() || "Novo Playbook",
        scenes: pb.scenes.map((s, order) => ({
          id: s.id,
          order,
          title: s.title,
          text: s.text,
          image_url: s.image_url,
          summary: "",
          balloons: [],
          exercise: "",
          practical_action: "",
        })),
        theme: "neon-roxo" as const,
        status,
        step: 5,
        briefing: {},
        cover_url: pb.scenes.find((s) => s.image_url)?.image_url ?? null,
      };
      const { id } = await save({ data: { id: pb.id ?? undefined, payload } });
      setPb((p) => ({ ...p, id, status }));
      if (status === "published") {
        const url = `${window.location.origin}/playbook/${id}`;
        toast.success("Publicado!", {
          description: url,
          action: {
            label: "Copiar",
            onClick: () => {
              void navigator.clipboard.writeText(url);
              toast.success("Link copiado");
            },
          },
        });
      } else {
        toast.success("Rascunho salvo");
      }
      // Ensure URL reflects the id
      if (!pb.id) {
        navigate({
          to: "/produtos/playbook/editor/$id",
          params: { id },
          replace: true,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/produtos/playbook" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Biblioteca
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {pb.status === "published" && publicUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl);
                toast.success("Link copiado");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copiar link
            </Button>
          )}
          <Button variant="outline" disabled={!!busy} onClick={() => persist("draft")}>
            <Save className="mr-1 h-4 w-4" /> Salvar rascunho
          </Button>
          {pb.status === "published" ? (
            <Button variant="secondary" disabled={!!busy} onClick={() => persist("draft")}>
              <EyeOff className="mr-1 h-4 w-4" /> Despublicar
            </Button>
          ) : (
            <Button
              disabled={!!busy}
              onClick={() => persist("published")}
              className="text-white"
              style={{ background: "var(--gradient-playbook, linear-gradient(135deg,#7c3aed,#06b6d4))" }}
            >
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Publicar
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título do playbook</Label>
        <Input
          value={pb.title}
          onChange={(e) => setPb({ ...pb, title: e.target.value })}
          placeholder="Ex: Como prospectar no LinkedIn"
          className="mt-1 h-12 text-lg font-semibold"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "editor" | "preview")}>
        <TabsList>
          <TabsTrigger value="editor">Editor ({pb.scenes.length})</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-1 h-4 w-4" /> Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {pb.scenes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma página ainda. Adicione a primeira.
            </div>
          )}
          {pb.scenes.map((s, i) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Página {i + 1}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === pb.scenes.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => duplicate(i)} title="Duplicar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(i)} title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <Input
                    value={s.title}
                    onChange={(e) => updScene(i, { title: e.target.value })}
                    placeholder="Título da página"
                  />
                  <Textarea
                    rows={6}
                    value={s.text}
                    onChange={(e) => updScene(i, { text: e.target.value })}
                    placeholder="Conteúdo da página…"
                  />
                </div>
                <div>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
                    {s.image_url ? (
                      <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-8 w-8 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onUpload(i, f);
                          e.target.value = "";
                        }}
                      />
                      <span className="flex h-9 items-center justify-center rounded-md border border-border text-xs hover:bg-muted">
                        <ImagePlus className="mr-1 h-3.5 w-3.5" />
                        {s.image_url ? "Trocar" : "Enviar imagem"}
                      </span>
                    </label>
                    {s.image_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updScene(i, { image_url: null })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={addPage}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar página
          </Button>
        </TabsContent>

        <TabsContent value="preview">
          <div className="rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 md:p-8">
            <FlipBook title={pb.title || "Playbook"} pages={pb.scenes} />
          </div>
        </TabsContent>
      </Tabs>

      {busy && (
        <p className="text-center text-xs text-muted-foreground">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          {busy}
        </p>
      )}
    </div>
  );
}