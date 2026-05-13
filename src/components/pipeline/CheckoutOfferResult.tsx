import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import type { CheckoutOffer } from "@/lib/checkout.server";

function CopyBtn({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
      {done ? "Copiado" : label}
    </Button>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{title}</Badge>
          <CopyBtn text={text} />
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

export function CheckoutOfferResult({ offer }: { offer: CheckoutOffer }) {
  return (
    <div className="space-y-3">
      <Block title="Oferta principal" text={offer.oferta} />

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Stack de valor</Badge>
            <CopyBtn text={offer.stack.map((s) => `• ${s}`).join("\n")} />
          </div>
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {offer.stack.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <Badge variant="outline">Bônus</Badge>
          <div className="grid gap-2 md:grid-cols-2">
            {offer.bonus.map((b, i) => (
              <div key={i} className="rounded-md border border-border/40 p-3 text-sm">
                <p className="font-semibold">{b.nome}</p>
                <p className="text-xs text-muted-foreground">Valor: {b.valorPercebido}</p>
                <p className="mt-1">{b.descricao}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Block title="Garantia" text={offer.garantia} />
      <Block
        title="Order bump"
        text={`${offer.orderBump.titulo}\n${offer.orderBump.descricao}\nPreço: ${offer.orderBump.preco}`}
      />
      <Block
        title="Upsell"
        text={`${offer.upsell.titulo}\n${offer.upsell.descricao}\nPreço: ${offer.upsell.preco}`}
      />
      <Block
        title="Downsell"
        text={`${offer.downsell.titulo}\n${offer.downsell.descricao}\nPreço: ${offer.downsell.preco}`}
      />
      <Block
        title="Ancoragem"
        text={`De ${offer.ancoragem.de} por ${offer.ancoragem.por}\n${offer.ancoragem.justificativa}`}
      />
      <Block title="Urgência" text={offer.urgencia} />
      <Block title="CTA" text={offer.cta} />

      <Card>
        <CardContent className="p-4">
          <Badge variant="outline" className="mb-3">Plataformas</Badge>
          <Tabs defaultValue="kiwify">
            <TabsList>
              <TabsTrigger value="kiwify">Kiwify</TabsTrigger>
              <TabsTrigger value="hotmart">Hotmart</TabsTrigger>
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
            </TabsList>
            <TabsContent value="kiwify" className="mt-3">
              <div className="flex justify-end pb-2">
                <CopyBtn text={offer.kiwify} />
              </div>
              <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{offer.kiwify}</p>
            </TabsContent>
            <TabsContent value="hotmart" className="mt-3">
              <div className="flex justify-end pb-2">
                <CopyBtn text={offer.hotmart} />
              </div>
              <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{offer.hotmart}</p>
            </TabsContent>
            <TabsContent value="stripe" className="mt-3">
              <div className="flex justify-end pb-2">
                <CopyBtn text={offer.stripe} />
              </div>
              <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{offer.stripe}</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}