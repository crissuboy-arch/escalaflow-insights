import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { SalesCopy } from "@/lib/copy.server";

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

export function CopyResult({ copy }: { copy: SalesCopy }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="secondary" className="mb-2">
                Headline
              </Badge>
              <h2 className="text-2xl font-bold leading-tight">{copy.headline}</h2>
              <p className="mt-1 text-muted-foreground">{copy.subheadline}</p>
            </div>
            <CopyBtn text={`${copy.headline}\n${copy.subheadline}`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-5">
            <Badge variant="outline">Big Idea</Badge>
            <p>{copy.bigIdea}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-5">
            <Badge variant="outline">Mecanismo Único</Badge>
            <p>{copy.uniqueMechanism}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-5">
            <Badge variant="outline">Promessa</Badge>
            <p>{copy.promise}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-5">
            <Badge variant="outline">CTA</Badge>
            <p className="font-semibold">{copy.cta}</p>
          </CardContent>
        </Card>
      </div>

      <BulletList title="Bullets" items={copy.bullets} />
      <BulletList title="Benefícios" items={copy.benefits} />
      <BulletList title="Dores" items={copy.pains} />
      <BulletList title="Desejos" items={copy.desires} />
      <BulletList title="Ângulos de campanha" items={copy.angles} />

      {copy.objections.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <Badge variant="outline">Objeções</Badge>
            <div className="space-y-3">
              {copy.objections.map((o, i) => (
                <div key={i} className="border-l-2 border-border/60 pl-3">
                  <p className="text-sm font-medium">{o.q}</p>
                  <p className="text-sm text-muted-foreground">{o.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Oferta</Badge>
            <CopyBtn text={copy.offer} />
          </div>
          <p className="whitespace-pre-wrap text-sm">{copy.offer}</p>
          <div className="pt-2">
            <Badge variant="outline" className="mb-1">
              Garantia
            </Badge>
            <p className="text-sm">{copy.guarantee}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Badge>Copy Completa</Badge>
            <CopyBtn text={copy.fullCopy} label="Copiar tudo" />
          </div>
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
            {copy.fullCopy}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{title}</Badge>
          <CopyBtn text={items.map((i) => `• ${i}`).join("\n")} />
        </div>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          {items.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}