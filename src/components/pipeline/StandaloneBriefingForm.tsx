import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  emptyBriefing,
  loadStandaloneBriefing,
  saveStandaloneBriefing,
  type StandaloneBriefing,
} from "@/lib/standalone/briefing";

const PRODUCT_TYPES = [
  "Infoproduto",
  "Ebook",
  "Playbook",
  "Curso",
  "Mentoria",
  "Romance digital",
  "PLR",
  "Produto físico",
  "Amazon",
  "Shopee",
  "Dropshipping",
  "Afiliado",
  "SaaS",
  "App",
];

export function StandaloneBriefingForm({
  module,
  onReady,
  submitLabel = "Gerar com IA",
  busy,
}: {
  module: string;
  onReady: (b: StandaloneBriefing) => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const [b, setB] = useState<StandaloneBriefing>(emptyBriefing());

  useEffect(() => {
    const stored = loadStandaloneBriefing(module);
    if (stored) setB(stored);
  }, [module]);

  const set = <K extends keyof StandaloneBriefing>(k: K, v: StandaloneBriefing[K]) =>
    setB((prev) => ({ ...prev, [k]: v }));

  const valid = b.productName.trim().length > 0 && b.productType.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    saveStandaloneBriefing(module, b);
    onReady(b);
  };

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome do produto *">
            <Input
              value={b.productName}
              onChange={(e) => set("productName", e.target.value)}
              placeholder="Ex: Vassoura elétrica portátil"
            />
          </Field>
          <Field label="Tipo do produto *">
            <select
              value={b.productType}
              onChange={(e) => set("productType", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione…</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nicho">
            <Input
              value={b.niche}
              onChange={(e) => set("niche", e.target.value)}
              placeholder="Ex: Casa & Limpeza"
            />
          </Field>
          <Field label="Público / avatar">
            <Input
              value={b.audience}
              onChange={(e) => set("audience", e.target.value)}
              placeholder="Ex: Mulheres 30–55, donas de casa"
            />
          </Field>
          <Field label="Promessa">
            <Input
              value={b.promise}
              onChange={(e) => set("promise", e.target.value)}
              placeholder="Ex: Casa limpa em 5 minutos"
            />
          </Field>
          <Field label="Preço">
            <Input
              value={b.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="Ex: R$ 197"
            />
          </Field>
          <Field label="Plataforma">
            <Input
              value={b.platform}
              onChange={(e) => set("platform", e.target.value)}
              placeholder="Ex: Hotmart, Amazon, Shopee"
            />
          </Field>
          <Field label="Link (opcional)">
            <Input
              value={b.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Tom de voz" className="md:col-span-2">
            <Input
              value={b.tone}
              onChange={(e) => set("tone", e.target.value)}
              placeholder="Ex: próximo, divertido, autoridade técnica"
            />
          </Field>
          <Field label="Descrição" className="md:col-span-2">
            <Textarea
              rows={3}
              value={b.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descreva o que é o produto, como funciona, diferenciais…"
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!valid || busy}>
            {busy ? "Gerando…" : submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}