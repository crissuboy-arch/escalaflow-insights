import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ShoppingCart } from "lucide-react";
import { updateProject } from "@/lib/project.functions";

export type CheckoutDraft = {
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

const empty: CheckoutDraft = {
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

export function CheckoutTab({
  projectId,
  initial,
  onSaved,
  onNext,
}: {
  projectId: string;
  initial: Partial<CheckoutDraft> | null;
  onSaved?: (data: CheckoutDraft) => void;
  onNext?: () => void;
}) {
  const update = useServerFn(updateProject);
  const [data, setData] = useState<CheckoutDraft>({ ...empty, ...(initial ?? {}) });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(initial !== null);
  const set = <K extends keyof CheckoutDraft>(k: K, v: CheckoutDraft[K]) =>
    setData((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      // Preserve sibling fields persisted by other flows (e.g. AI-generated
      // `offer`) by merging on top of the original meta.checkout blob.
      const merged = { ...(initial ?? {}), ...data };
      await update({ data: { id: projectId, patch: { meta: { checkout: merged } } } });
      onSaved?.(data);
      setSaved(true);
      toast.success("Checkout salvo no projeto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Checkout & Oferta</p>
            <p className="text-xs text-muted-foreground">
              Preço, âncora, bônus, order bump, upsell, downsell, garantia e link da
              plataforma. Salvo em <code>meta.checkout</code>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Preço">
            <Input
              value={data.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="R$ 197"
            />
          </Field>
          <Field label="Preço âncora">
            <Input
              value={data.anchorPrice}
              onChange={(e) => set("anchorPrice", e.target.value)}
              placeholder="R$ 497"
            />
          </Field>
          <Field label="Plataforma">
            <Input
              value={data.platform}
              onChange={(e) => set("platform", e.target.value)}
              placeholder="Kiwify, Hotmart, Stripe…"
            />
          </Field>
          <Field label="Link do checkout">
            <Input
              value={data.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Bônus" className="md:col-span-2">
            <Textarea
              rows={3}
              value={data.bonuses}
              onChange={(e) => set("bonuses", e.target.value)}
              placeholder="Lista de bônus inclusos"
            />
          </Field>
          <Field label="Order bump">
            <Textarea
              rows={2}
              value={data.orderBump}
              onChange={(e) => set("orderBump", e.target.value)}
            />
          </Field>
          <Field label="Upsell">
            <Textarea
              rows={2}
              value={data.upsell}
              onChange={(e) => set("upsell", e.target.value)}
            />
          </Field>
          <Field label="Downsell">
            <Textarea
              rows={2}
              value={data.downsell}
              onChange={(e) => set("downsell", e.target.value)}
            />
          </Field>
          <Field label="Garantia">
            <Textarea
              rows={2}
              value={data.guarantee}
              onChange={(e) => set("guarantee", e.target.value)}
              placeholder="Ex: 7 dias incondicional"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
          <Badge variant="outline">Rascunho salvo automaticamente ao clicar Salvar</Badge>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
            {onNext && (
              <Button onClick={onNext} variant="default">
                Continuar → Escala
              </Button>
            )}
          </div>
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