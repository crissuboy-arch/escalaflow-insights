import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function StandaloneSoon({ module }: { module: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Modo avulso de {module} chegando</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          O gerador completo no modo "Produto Avulso" entra na próxima rodada da esteira. Por
          enquanto, use o modo Projeto para esta etapa.
        </p>
      </CardContent>
    </Card>
  );
}