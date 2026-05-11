import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  loadPlaybook,
  savePlaybook,
  generatePlaybookSceneContent,
  generatePlaybookSceneImage,
} from "@/lib/playbook.functions";

export const Route = createFileRoute("/_authenticated/produtos/playbook/$id/editar")({
  component: PlaybookEditPage,
});

type Scene = {
  id: string;
  order: number;
  title: string;
  summary: string;
  text: string;
  image_url: string | null;
  balloons: string[];
  exercise: string;
  practical_action: string;
};
type Playbook = {
  id: string;
  title: string;
  niche: string | null;
  source_ad_key: string | null;
  avatar: string | null;
  promise: string | null;
  unique_mechanism: string | null;
  briefing: Record<string, unknown>;
  scenes: Scene[];
  theme: "neon-roxo" | "dourado-editorial" | "minimal-dark";
  cover_url: string | null;
  status: "draft" | "published";
  step: number;
};

function PlaybookEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(loadPlaybook);
  const save = useServerFn(savePlaybook);
  const sceneFn = useServerFn(generatePlaybookSceneContent);
  const imageFn = useServerFn(generatePlaybookSceneImage);

  const [pb, setPb] = useState<Playbook | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const row = (await load({ data: { id } })) as unknown as Playbook;
        row.scenes = (row.scenes ?? []).slice().sort((a, b) => a.order - b.order);
        setPb(row);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha");
      }
    })();
  }, [id, load]);

  if (!pb) {
    return (
      <div className="playbook-surface -m-4 flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--playbook-neon)]" />
      </div>
    );
  }

  const scene = pb.scenes[sel];

  const updScene = (patch: Partial<Scene>) => {
    const next = pb.scenes.slice();
    next[sel] = { ...next[sel], ...patch };
    setPb({ ...pb, scenes: next });
  };
  const reorder = (dir: -1 | 1) => {
    const j = sel + dir;
    if (j < 0 || j >= pb.scenes.length) return;
    const arr = pb.scenes.slice();
    [arr[sel], arr[j]] = [arr[j], arr[sel]];
    const next = arr.map((s, i) => ({ ...s, order: i }));
    setPb({ ...pb, scenes: next });
    setSel(j);
  };
  const addScene = () => {
    const next: Scene = {
      id: crypto.randomUUID(),
      order: pb.scenes.length,
      title: "Nova cena",
      summary: "",
      text: "",
      image_url: null,
      balloons: [],
      exercise: "",
      practical_action: "",
    };
    const all = [...pb.scenes, next];
    setPb({ ...pb, scenes: all });
    setSel(all.length - 1);
  };
  const removeScene = () => {
    if (!confirm("Excluir esta cena?")) return;
    const next = pb.scenes
      .filter((_, i) => i !== sel)
      .map((s, i) => ({ ...s, order: i }));
    setPb({ ...pb, scenes: next });
    setSel(Math.max(0, sel - 1));
  };
  const onSave = async () => {
    setBusy("Salvando…");
    try {
      await save({
        data: {
          id: pb.id,
          payload: {
            title: pb.title,
            niche: pb.niche,
            source_ad_key: pb.source_ad_key,
            avatar: pb.avatar,
            promise: pb.promise,
            unique_mechanism: pb.unique_mechanism,
            briefing: pb.briefing,
            scenes: pb.scenes,
            theme: pb.theme,
            cover_url: pb.scenes[0]?.image_url ?? pb.cover_url ?? null,
            status: pb.status,
            step: pb.step,
          },
        },
      });
      toast.success("Salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  const regenScene = async () => {
    setBusy("Regenerando texto…");
    try {
      const briefing = pb.briefing as never;
      const r = await sceneFn({
        data: {
          briefing,
          scene: {
            title: scene.title,
            summary: scene.summary,
            exercise: scene.exercise,
            practicalAction: scene.practical_action,
          },
          index: sel,
          total: pb.scenes.length,
        },
      });
      updScene({ text: r.text, balloons: r.balloons });
      toast.success("Cena regenerada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  const regenImage = async () => {
    setBusy("Gerando imagem…");
    try {
      const briefing = pb.briefing as never;
      const r = await imageFn({
        data: { briefing, scene: { title: scene.title, summary: scene.summary }, theme: pb.theme },
      });
      updScene({ image_url: r.dataUrl });
      toast.success("Imagem gerada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="playbook-surface -m-4 min-h-[calc(100vh-3rem)] text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-background/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/produtos/playbook/$id", params: { id } })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Leitor
          </Button>
          <Input
            value={pb.title}
            onChange={(e) => setPb({ ...pb, title: e.target.value })}
            className="max-w-md border-0 bg-transparent text-center text-base font-bold focus-visible:ring-0"
          />
          <Button onClick={onSave} disabled={!!busy} size="sm" style={{ background: "var(--gradient-playbook)" }} className="text-white">
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {busy ?? "Salvar"}
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-[280px_1fr]">
        <aside className="playbook-card-neon space-y-2 rounded-2xl bg-card/40 p-3 backdrop-blur">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cenas</p>
            <Button size="sm" variant="outline" onClick={addScene}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto">
            {pb.scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSel(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                  i === sel ? "bg-[var(--playbook-neon)]/20 text-foreground" : "hover:bg-muted/50"
                }`}
              >
                <Badge variant="secondary" className="shrink-0 text-[10px]">{i + 1}</Badge>
                <span className="line-clamp-1 flex-1">{s.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {scene && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => reorder(-1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => reorder(1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={regenScene} disabled={!!busy}>
                <Wand2 className="mr-1 h-3.5 w-3.5" /> Regenerar texto
              </Button>
              <Button size="sm" variant="outline" onClick={regenImage} disabled={!!busy}>
                <Sparkles className="mr-1 h-3.5 w-3.5" /> Gerar imagem
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={removeScene}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="playbook-card-neon overflow-hidden rounded-2xl bg-card/40 p-4 backdrop-blur">
              {scene.image_url ? (
                <img src={scene.image_url} alt={scene.title} className="aspect-video w-full rounded-xl object-cover" />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.22_0.12_290)] to-[oklch(0.18_0.10_220)] text-muted-foreground">
                  Sem imagem — clique em "Gerar imagem"
                </div>
              )}
              <div className="mt-3">
                <Label>URL da imagem</Label>
                <Input
                  placeholder="https://… ou data:image/…"
                  value={scene.image_url ?? ""}
                  onChange={(e) => updScene({ image_url: e.target.value || null })}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Título da cena</Label><Input value={scene.title} onChange={(e) => updScene({ title: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Resumo</Label><Textarea rows={2} value={scene.summary} onChange={(e) => updScene({ summary: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Texto explicativo</Label><Textarea rows={10} value={scene.text} onChange={(e) => updScene({ text: e.target.value })} /></div>
              <div><Label>Exercício</Label><Textarea rows={3} value={scene.exercise} onChange={(e) => updScene({ exercise: e.target.value })} /></div>
              <div><Label>Ação prática</Label><Textarea rows={3} value={scene.practical_action} onChange={(e) => updScene({ practical_action: e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Balões de destaque (uma frase por linha)</Label>
                <Textarea
                  rows={4}
                  value={scene.balloons.join("\n")}
                  onChange={(e) => updScene({ balloons: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}