import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { createCampaignPlan } from "@/lib/scale.functions";
import type { CampaignPlan } from "@/lib/scale.server";

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

const PLATFORMS = ["Meta", "Google", "Instagram"] as const;

export function CampaignPlanForm({
  projectId,
  onPlan,
}: {
  projectId?: string;
  onPlan: (p: CampaignPlan) => void;
}) {
  const run = useServerFn(createCampaignPlan);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    productName: "",
    pageUrl: "",
    price: "",
    currency: "BRL",
    countries: "Brasil",
    dailyBudget: "",
    offerText: "",
  });
  const [platforms, setPlatforms] = useState<string[]>([...PLATFORMS]);

  function togglePlatform(p: string) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const remaining = 6 - images.length;
    const accepted = files.slice(0, remaining);
    const next: string[] = [];
    for (const f of accepted) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} > 5 MB. Ignorada.`);
        continue;
      }
      next.push(await fileToDataUrl(f));
    }
    setImages((cur) => [...cur, ...next]);
  }

  async function go() {
    setBusy(true);
    try {
      const r = await run({
        data: {
          projectId,
          productName: form.productName || undefined,
          pageUrl: form.pageUrl || undefined,
          price: form.price || undefined,
          currency: form.currency || undefined,
          countries: form.countries ? form.countries.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          platforms: platforms.length ? platforms : undefined,
          dailyBudget: form.dailyBudget || undefined,
          offerText: form.offerText || undefined,
          imageDataUrls: images.length ? images : undefined,
        },
      });
      onPlan(r.plan);
      toast.success("Plano de campanha gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar plano");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">Briefing da campanha</p>
          <p className="text-xs text-muted-foreground">
            Suba prints do produto, da página, do anúncio e/ou criativos. A IA monta o plano completo dos 3 primeiros dias.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome do produto / oferta">
            <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Link da página de vendas">
            <Input placeholder="https://..." value={form.pageUrl} onChange={(e) => setForm({ ...form, pageUrl: e.target.value })} />
          </Field>
          <Field label="Preço">
            <Input placeholder="97" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </Field>
          <Field label="Moeda">
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </Field>
          <Field label="Países (separe por vírgula)">
            <Input value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} />
          </Field>
          <Field label="Orçamento diário">
            <Input placeholder="R$ 100/dia" value={form.dailyBudget} onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })} />
          </Field>
        </div>

        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Plataformas</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`rounded-full border px-3 py-1 text-xs ${platforms.includes(p) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Field label="Texto da oferta / promessa">
          <Textarea rows={3} value={form.offerText} onChange={(e) => setForm({ ...form, offerText: e.target.value })} />
        </Field>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Imagens (até 6 · 5 MB cada)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={images.length >= 6}>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
            {images.map((u, i) => (
              <div key={i} className="relative">
                <img src={u} alt="" className="h-14 w-20 rounded border border-border/60 object-cover" />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={go} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Criar Plano de Campanha
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}