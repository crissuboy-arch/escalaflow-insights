import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Loader2,
  Pencil,
  Sparkles,
  Download,
  FileText,
  Images,
  Film,
  Copy,
  FileType2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadPlaybook,
  generatePlaybookScript,
  generatePlaybookStrategy,
} from "@/lib/playbook.functions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/produtos/playbook/$id")({
  component: PlaybookReaderPage,
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
  scenes: Scene[];
  briefing: Record<string, unknown>;
  cover_url: string | null;
  status: string;
};

function PlaybookReaderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(loadPlaybook);
  const scriptFn = useServerFn(generatePlaybookScript);
  const strategyFn = useServerFn(generatePlaybookStrategy);
  const [pb, setPb] = useState<Playbook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const row = (await load({ data: { id } })) as unknown as Playbook;
        setPb(row);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao carregar";
        setLoadError(msg);
        toast.error(msg);
      }
    })();
  }, [id, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pb) return;
      if (e.key === "ArrowRight") setIdx((i) => Math.min(pb.scenes.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pb]);

  if (loadError) {
    return (
      <div className="playbook-surface -m-4 flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button onClick={() => navigate({ to: "/produtos/playbook" })}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar à biblioteca
        </Button>
      </div>
    );
  }

  if (!pb) {
    return (
      <div className="playbook-surface -m-4 flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--playbook-neon)]" />
      </div>
    );
  }

  const scenes = (Array.isArray(pb.scenes) ? pb.scenes : [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const scene = scenes[idx];

  const exportPdf = async () => {
    const { exportPlaybookPdf } = await import("@/lib/playbook/pdf");
    await exportPlaybookPdf(pb.title, scenes);
  };
  const exportCarousel = async () => {
    const { exportPlaybookCarousel } = await import("@/lib/playbook/carousel");
    await exportPlaybookCarousel(pb.title, scenes);
  };
  const exportScript = async () => {
    try {
      toast.loading("Gerando roteiro…", { id: "script" });
      const briefing = pb.briefing as never;
      const { markdown } = await scriptFn({
        data: {
          briefing,
          scenes: scenes.map((s) => ({ title: s.title, text: s.text })),
        },
      });
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pb.title}-roteiro.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Roteiro exportado", { id: "script" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou", { id: "script" });
    }
  };

  return (
    <div className="playbook-surface -m-4 min-h-[calc(100vh-3rem)] text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-background/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/produtos/playbook" })}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Biblioteca
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="playbook-title-display truncate text-sm font-bold md:text-base">{pb.title}</p>
            {pb.niche && <Badge variant="outline" className="text-[10px]">{pb.niche}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/produtos/playbook/$id/editar" params={{ id }}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" style={{ background: "var(--gradient-playbook)" }} className="text-white">
                  <Download className="mr-1 h-3.5 w-3.5" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPdf}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportCarousel}><Images className="mr-2 h-4 w-4" /> Carrossel (PNG)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportScript}><Film className="mr-2 h-4 w-4" /> Roteiro de vídeo</DropdownMenuItem>
                <DropdownMenuItem disabled>Apresentação (em breve)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {scenes.length === 0 ? (
        <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">
          Sem cenas. Edite este playbook para adicionar conteúdo.
        </div>
      ) : (
        <main className="mx-auto max-w-4xl px-4 pb-32 pt-6 md:pt-10">
          <AnimatePresence mode="wait">
            <motion.article
              key={scene.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <div className="playbook-card-neon overflow-hidden rounded-3xl">
                {scene.image_url ? (
                  <img src={scene.image_url} alt={scene.title} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.12_290)] to-[oklch(0.18_0.10_220)]">
                    <Sparkles className="h-12 w-12 text-[var(--playbook-neon)]" />
                  </div>
                )}
              </div>
              <header>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--playbook-neon)]">
                  Cena {idx + 1} · {pb.title}
                </p>
                <h1 className="playbook-title-display mt-2 text-3xl font-bold md:text-5xl">{scene.title}</h1>
              </header>
              <div className="prose prose-invert max-w-none text-base leading-relaxed text-foreground/90">
                {scene.text.split("\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {scene.balloons.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {scene.balloons.map((b, i) => (
                    <div key={i} className="playbook-card-gold rounded-2xl bg-card/40 p-4 text-sm">
                      <span className="mr-2 font-bold text-[var(--playbook-gold)]">★</span>
                      {b}
                    </div>
                  ))}
                </div>
              )}
              {(scene.exercise || scene.practical_action) && (
                <section className="rounded-2xl border border-white/10 bg-card/30 p-5 backdrop-blur">
                  <p className="playbook-title-display mb-3 text-sm font-bold uppercase tracking-wider text-[var(--playbook-neon-2)]">
                    Sobre esta etapa
                  </p>
                  {scene.exercise && (
                    <p className="mb-2 text-sm"><strong>Exercício:</strong> {scene.exercise}</p>
                  )}
                  {scene.practical_action && (
                    <p className="text-sm"><strong>Ação prática:</strong> {scene.practical_action}</p>
                  )}
                </section>
              )}
            </motion.article>
          </AnimatePresence>
        </main>
      )}

      {scenes.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <div className="flex items-center gap-1">
              {scenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === idx ? "w-6 bg-[var(--playbook-neon)]" : "w-2 bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <p className="hidden text-xs text-muted-foreground md:block">
              Cena {idx + 1}/{scenes.length}
            </p>
            <Button
              size="sm"
              disabled={idx === scenes.length - 1}
              onClick={() => setIdx((i) => i + 1)}
              style={{ background: "var(--gradient-playbook)" }}
              className="text-white"
            >
              Próximo <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}