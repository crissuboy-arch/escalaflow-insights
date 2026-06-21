import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Network, ArrowRight, Rocket } from "lucide-react";
import { createProjetoSeoFn, listSitesFn } from "@/lib/afiliadosSeo.functions";

export const Route = createFileRoute("/_authenticated/motor-afiliados-seo")({
  component: MotorAfiliadosSeoPage,
});

type SiteRow = {
  id: string;
  title: string;
  briefing: { nicho?: string; idioma?: string; tipoProjeto?: string } | null;
  language: string | null;
  status: string;
  updated_at: string;
};

type TipoProjeto = "afiliado" | "produto-proprio" | "servico" | "ecommerce" | "infoproduto";

const TIPOS_PROJETO: { value: TipoProjeto; label: string }[] = [
  { value: "afiliado", label: "Afiliado" },
  { value: "produto-proprio", label: "Produto Próprio" },
  { value: "servico", label: "Serviço" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "infoproduto", label: "Infoproduto" },
];

const IDIOMAS = [
  { value: "pt", label: "Português" },
  { value: "es", label: "Espanhol" },
  { value: "en", label: "Inglês" },
];

const PAISES = [
  { value: "BR", label: "Brasil" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Espanha" },
  { value: "US", label: "Estados Unidos" },
  { value: "GLOBAL", label: "Global" },
];

const QUANTIDADES = [10, 30, 50, 100] as const;

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_PROJETO.map((t) => [t.value, t.label]),
);

function MotorAfiliadosSeoPage() {
  const navigate = useNavigate();
  const create = useServerFn(createProjetoSeoFn);
  const listFn = useServerFn(listSitesFn);

  const [rows, setRows] = useState<SiteRow[]>([]);

  // Form V2.0
  const [tipoProjeto, setTipoProjeto] = useState<TipoProjeto>("afiliado");
  const [entrada, setEntrada] = useState("");
  const [idioma, setIdioma] = useState("pt");
  const [paisAlvo, setPaisAlvo] = useState("BR");
  const [quantidade, setQuantidade] = useState<(typeof QUANTIDADES)[number]>(10);
  const [publicacaoAutomatica, setPublicacaoAutomatica] = useState(true);
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const d = await listFn();
    setRows((d ?? []) as unknown as SiteRow[]);
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const clean = entrada.trim();
    if (clean.length < 2) {
      toast.error("Informe uma URL, produto ou nicho.");
      return;
    }
    setBusy(true);
    try {
      const { projectId, totalArtigos, paginasPublicadas } = await create({
        data: {
          tipoProjeto,
          entrada: clean,
          idioma: idioma as "pt" | "es" | "en",
          paisAlvo: paisAlvo as "BR" | "PT" | "ES" | "US" | "GLOBAL",
          quantidadeArtigos: quantidade,
          publicacaoAutomatica,
          ...(wpUrl.trim() ? { wpUrl: wpUrl.trim() } : {}),
          ...(wpUser.trim() ? { wpUser: wpUser.trim() } : {}),
          ...(wpAppPassword.trim() ? { wpAppPassword: wpAppPassword.trim() } : {}),
        },
      });
      toast.success(
        `Projeto SEO criado com ${totalArtigos} artigos no calendário` +
          (paginasPublicadas ? ` e ${paginasPublicadas} páginas no WordPress` : "") +
          "!",
      );
      navigate({ to: "/motor-afiliados-seo/$id", params: { id: projectId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar projeto SEO.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Network className="h-6 w-6 text-primary" /> Motor Afiliados SEO
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Crie sites SEO completos para afiliados, produtos próprios, serviços e e-commerce. Cole
          uma URL, produto ou nicho e a IA cria, escreve e publica automaticamente no WordPress.
        </p>
      </div>

      {/* Criar projeto SEO */}
      <Card>
        <CardContent className="space-y-5 p-5">
          {/* Tipo de projeto */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tipo de projeto
            </Label>
            <ToggleGroup
              type="single"
              value={tipoProjeto}
              onValueChange={(v) => v && setTipoProjeto(v as TipoProjeto)}
              className="flex flex-wrap justify-start gap-2"
            >
              {TIPOS_PROJETO.map((t) => (
                <ToggleGroupItem
                  key={t.value}
                  value={t.value}
                  variant="outline"
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  {t.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Campo principal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              URL, Produto ou Nicho
            </Label>
            <Input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && handleCreate()}
              placeholder="https://hotmart.com/produto · Creatina · Curso de Soldadura"
              disabled={busy}
              className="h-11 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Exemplos: link de Kiwify/Hotmart/ClickBank, um produto (“Creatina”) ou um nicho
              (“Marketing Digital”).
            </p>
          </div>

          {/* Idioma + País + Quantidade */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Idioma
              </Label>
              <Select value={idioma} onValueChange={setIdioma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDIOMAS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                País-alvo
              </Label>
              <Select value={paisAlvo} onValueChange={setPaisAlvo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quantidade de artigos
              </Label>
              <ToggleGroup
                type="single"
                value={String(quantidade)}
                onValueChange={(v) => v && setQuantidade(Number(v) as (typeof QUANTIDADES)[number])}
                className="justify-start gap-2"
              >
                {QUANTIDADES.map((q) => (
                  <ToggleGroupItem
                    key={q}
                    value={String(q)}
                    variant="outline"
                    className="flex-1 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {q}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          {/* Configurar WordPress (opcional) */}
          <Accordion type="single" collapsible>
            <AccordionItem value="wp" className="rounded-lg border border-border px-4">
              <AccordionTrigger className="text-sm">
                Configurar WordPress (opcional)
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 pt-1 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs uppercase text-muted-foreground">URL do site</Label>
                    <Input
                      value={wpUrl}
                      onChange={(e) => setWpUrl(e.target.value)}
                      placeholder="https://meusite.com"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">Usuário</Label>
                    <Input
                      value={wpUser}
                      onChange={(e) => setWpUser(e.target.value)}
                      placeholder="admin"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Application Password
                    </Label>
                    <Input
                      type="password"
                      value={wpAppPassword}
                      onChange={(e) => setWpAppPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Funciona com WordPress e Hostinger WordPress. Deixe em branco para usar a
                  configuração global do servidor. Gere a Application Password no painel do WP em
                  Usuários → Perfil → Senhas de aplicativo.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Publicação automática + botão */}
          <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3">
              <Switch checked={publicacaoAutomatica} onCheckedChange={setPublicacaoAutomatica} />
              <span className="text-sm">
                <span className="font-medium">Publicação automática</span>
                <span className="block text-xs text-muted-foreground">
                  {publicacaoAutomatica
                    ? "Os artigos são agendados e publicados no WordPress dia após dia."
                    : "Os artigos ficam na fila como rascunho — você gera quando quiser."}
                </span>
              </span>
            </label>
            <Button onClick={handleCreate} disabled={busy} size="lg" className="shrink-0">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Criar Projeto SEO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de projetos */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Projetos
        </h2>
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate({ to: "/motor-afiliados-seo/$id", params: { id: r.id } })}
                className="group text-left"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Network className="h-5 w-5 text-primary" />
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.briefing?.tipoProjeto && (
                          <Badge variant="secondary">
                            {TIPO_LABEL[r.briefing.tipoProjeto] ?? r.briefing.tipoProjeto}
                          </Badge>
                        )}
                        {(r.language || r.briefing?.idioma) && (
                          <Badge variant="outline" className="uppercase">
                            {r.language || r.briefing?.idioma}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="line-clamp-2 flex-1 font-medium">{r.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(r.updated_at).toLocaleDateString()}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
