import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Plus, Check } from "lucide-react";

const STEPS = [
  "Definir oferta principal e preço",
  "Gerar copy de vendas",
  "Estruturar página de venda",
  "Produzir 5 criativos iniciais",
  "Configurar checkout e bônus",
  "Subir campanha de validação (R$50–100/dia)",
  "Coletar dados de CTR, CPC e conversão",
  "Otimizar criativos vencedores",
  "Escalar campanha 2x a cada 48h positivos",
];

export function StandaloneEscala() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Checklist genérico de escala</p>
              <p className="text-xs text-muted-foreground">
                Para checklist conectado ao seu produto (com botões "Abrir / Gerar"), crie um projeto.
              </p>
            </div>
          </div>
          <Link to="/projetos" search={{ novo: 1, tab: "escala" } as never}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Criar projeto e abrir Escala
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-md border border-border/40 p-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Check className="h-3.5 w-3.5" />
              </div>
              <p className="text-sm">{s}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}