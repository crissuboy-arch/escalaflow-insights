import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Draft = {
  price: string;
  anchorPrice: string;
  bonuses: string;
  orderBump: string;
  upsell: string;
  downsell: string;
  guarantee: string;
  platform: string;
  link: string;
};

const empty: Draft = {
  price: "",
  anchorPrice: "",
  bonuses: "",
  orderBump: "",
  upsell: "",
  downsell: "",
  guarantee: "",
  platform: "",
  link: "",
};

const KEY = "escalaflow:standalone:checkout";

export function StandaloneCheckout() {
  const [data, setData] = useState<Draft>(() => {
    if (typeof window === "undefined") return empty;
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? { ...empty, ...JSON.parse(raw) } : empty;
    } catch {
      return empty;
    }
  });
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    const next = { ...data, [k]: v };
    setData(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  async function copyAll() {
    const text = [
      `Preço: ${data.price}`,
      `Preço âncora: ${data.anchorPrice}`,
      `Plataforma: ${data.platform}`,
      `Link: ${data.link}`,
      `Bônus: ${data.bonuses}`,
      `Order bump: ${data.orderBump}`,
      `Upsell: ${data.upsell}`,
      `Downsell: ${data.downsell}`,
      `Garantia: ${data.guarantee}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Resumo copiado.");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Checkout & Oferta — uso avulso</p>
            <p className="text-xs text-muted-foreground">
              Configure preço, bônus, order bump, upsell, downsell, garantia e link.
              Salvo localmente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Preço">
            <Input value={data.price} onChange={(e) => set("price", e.target.value)} placeholder="R$ 197" />
          </Field>
          <Field label="Preço âncora">
            <Input value={data.anchorPrice} onChange={(e) => set("anchorPrice", e.target.value)} placeholder="R$ 497" />
          </Field>
          <Field label="Plataforma">
            <Input value={data.platform} onChange={(e) => set("platform", e.target.value)} placeholder="Kiwify, Hotmart…" />
          </Field>
          <Field label="Link do checkout">
            <Input value={data.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Bônus" className="md:col-span-2">
            <Textarea rows={3} value={data.bonuses} onChange={(e) => set("bonuses", e.target.value)} />
          </Field>
          <Field label="Order bump">
            <Textarea rows={2} value={data.orderBump} onChange={(e) => set("orderBump", e.target.value)} />
          </Field>
          <Field label="Upsell">
            <Textarea rows={2} value={data.upsell} onChange={(e) => set("upsell", e.target.value)} />
          </Field>
          <Field label="Downsell">
            <Textarea rows={2} value={data.downsell} onChange={(e) => set("downsell", e.target.value)} />
          </Field>
          <Field label="Garantia">
            <Textarea rows={2} value={data.guarantee} onChange={(e) => set("guarantee", e.target.value)} placeholder="Ex: 7 dias incondicional" />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
          <Badge variant="outline">Autosave local</Badge>
          <Button onClick={copyAll} variant="outline" size="sm">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            Copiar resumo
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
      <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}