import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookHeart, Sparkles, Loader2, Flame, Skull, Heart } from "lucide-react";
import { createStory, listStories } from "@/lib/storybook.functions";
import {
  STORY_TYPES,
  SUBNICHES,
  HOT_LEVELS,
  TONES,
  ENDINGS,
  CHAPTER_COUNTS,
  PRESETS,
} from "@/lib/storybook/catalog";

const SearchSchema = z.object({ preset: z.string().optional() });

export const Route = createFileRoute("/_authenticated/storybook")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: StorybookHub,
});

type Row = {
  id: string;
  title: string;
  niche: string | null;
  status: string;
  step: number;
  updated_at: string;
};

function StorybookHub() {
  const navigate = useNavigate();
  const { preset } = useSearch({ from: "/_authenticated/storybook" });
  const create = useServerFn(createStory);
  const list = useServerFn(listStories);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const presetCfg = preset ? PRESETS[preset] ?? {} : {};

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    type: presetCfg.story ?? "romance-ceo",
    subniche: presetCfg.subniche ?? "",
    audience: "",
    language: "Português",
    chapters: 30,
    ending: "feliz",
    intensity: "intensa",
    hotLevel: presetCfg.hot ?? "sensual",
    tone: presetCfg.tone ?? "cinematografico",
    author: "",
  });

  useEffect(() => {
    list()
      .then((d) => setRows((d ?? []) as unknown as Row[]))
      .catch(() => {});
  }, [list]);

  async function start() {
    if (!form.title.trim()) {
      toast.error("Dê um título à história.");
      return;
    }
    setBusy(true);
    try {
      const { id } = await create({ data: { planning: form } });
      navigate({ to: "/storybook/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar história");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/10 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
            PREMIUM
          </Badge>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
            <BookHeart className="h-7 w-7 text-primary" />
            StoryBook Engine AI
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Fábrica de histórias virais, romances dark, dramas e ficção seriada para TikTok,
            Wattpad, Kindle e Hotmart. 8 etapas guiadas com IA cinematográfica.
          </p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Nova história
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="text-xs uppercase">Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder='Ex: "Possessivo" '
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase">Subtítulo</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs uppercase">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORY_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Subnicho</Label>
              <Select
                value={form.subniche}
                onValueChange={(v) => setForm({ ...form, subniche: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {SUBNICHES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Capítulos</Label>
              <Select
                value={String(form.chapters)}
                onValueChange={(v) => setForm({ ...form, chapters: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAPTER_COUNTS.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c} capítulos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Idioma</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm({ ...form, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Português">Português</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Español">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Final</Label>
              <Select value={form.ending} onValueChange={(v) => setForm({ ...form, ending: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENDINGS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Nível Hot</Label>
              <Select
                value={form.hotLevel}
                onValueChange={(v) => setForm({ ...form, hotLevel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOT_LEVELS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Tom</Label>
              <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Público-alvo</Label>
              <Input
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="Mulheres 25-40"
              />
            </div>
            <div>
              <Label className="text-xs uppercase">Autor</Label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Button onClick={start} disabled={busy} className="w-full" size="lg">
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Criar história
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link to="/storybook" search={{ preset: "romance" }}>
          <Card className="cursor-pointer transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Heart className="h-5 w-5 text-pink-400" />
              <div>
                <div className="font-semibold">Romance Engine</div>
                <div className="text-xs text-muted-foreground">CEO + íntimo + sensual</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/storybook" search={{ preset: "tiktok" }}>
          <Card className="cursor-pointer transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Flame className="h-5 w-5 text-orange-400" />
              <div>
                <div className="font-semibold">TikTok Story</div>
                <div className="text-xs text-muted-foreground">Bilionário + viral + picante</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/storybook" search={{ preset: "drama" }}>
          <Card className="cursor-pointer transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Skull className="h-5 w-5 text-violet-400" />
              <div>
                <div className="font-semibold">Drama AI</div>
                <div className="text-xs text-muted-foreground">Dark + cinematográfico</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {rows.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Suas histórias</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <Link key={r.id} to="/storybook/$id" params={{ id: r.id }}>
                <Card className="cursor-pointer overflow-hidden transition-colors hover:border-primary/50">
                  <CardContent className="space-y-2 p-4">
                    <div className="line-clamp-1 font-semibold">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.niche ?? "—"}</div>
                    <div className="flex gap-1.5">
                      <Badge variant="outline">Etapa {r.step}/8</Badge>
                      <Badge variant="secondary">{r.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}