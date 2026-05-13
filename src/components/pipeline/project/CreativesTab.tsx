import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, Wand2 } from "lucide-react";
import {
  ADS_FORMATS,
  DIMENSIONS,
  OBJECTIVES,
  PLATFORMS,
  type AdsFormatId,
  type Dimension,
  type ObjectiveId,
  type PlatformId,
} from "@/lib/ads/catalog";
import {
  generateCreative,
  generateCreativeVariations,
} from "@/lib/ads-creative.functions";
import type { Creative } from "@/lib/ads.server";
import { CreativeCard } from "@/components/pipeline/CreativeCard";
import { cn } from "@/lib/utils";

type Saved = Creative & {
  platform?: string;
  objective?: string;
  formatId?: string;
  dimension?: string;
  createdAt?: string;
};

export function CreativesTab({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string;
  initial: Saved[];
  onSaved?: (creatives: Saved[]) => void;
}) {
  const gen = useServerFn(generateCreative);
  const genVar = useServerFn(generateCreativeVariations);

  const [list, setList] = useState<Saved[]>(initial);
  const [platform, setPlatform] = useState<PlatformId>(PLATFORMS[0].id);
  const [objective, setObjective] = useState<ObjectiveId>(OBJECTIVES[0].id);
  const [formatId, setFormatId] = useState<AdsFormatId>(ADS_FORMATS[0].id);
  const [dimension, setDimension] = useState<Dimension>("9:16");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      ADS_FORMATS.filter((f) =>
        !search ? true : (f.name + f.description).toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  async function runOne() {
    setBusy(true);
    try {
      const r = await gen({
        data: {
          source: { kind: "project", projectId },
          platform,
          objective,
          formatId,
          dimension,
        },
      });
      const entry: Saved = {
        ...r.creative,
        platform,
        objective,
        formatId,
        dimension,
        createdAt: new Date().toISOString(),
      };
      const next = [...list, entry];
      setList(next);
      onSaved?.(next);
      toast.success("Criativo gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar criativo");
    } finally {
      setBusy(false);
    }
  }

  async function runVariations() {
    setBusy(true);
    try {
      const r = await genVar({
        data: {
          source: { kind: "project", projectId },
          platform,
          objective,
          formatId,
          dimension,
          count: 3,
        },
      });
      const stamped: Saved[] = r.creatives.map((c) => ({
        ...c,
        platform,
        objective,
        formatId,
        dimension,
        createdAt: new Date().toISOString(),
      }));
      const next = [...list, ...stamped];
      setList(next);
      onSaved?.(next);
      toast.success("Variações geradas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar variações");
    } finally {
      setBusy(false);
    }
  }

  const platformName = PLATFORMS.find((p) => p.id === platform)?.name ?? "";
  const objectiveName = OBJECTIVES.find((o) => o.id === objective)?.name ?? "";
  const formatName = ADS_FORMATS.find((f) => f.id === formatId)?.name ?? "";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Criativos & Anúncios</p>
              <p className="text-xs text-muted-foreground">
                Briefing vem deste projeto. Cada criativo gerado é salvo em{" "}
                <code>meta.creatives</code>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <PickRow label="Plataforma">
              {PLATFORMS.map((p) => (
                <Chip key={p.id} active={platform === p.id} onClick={() => setPlatform(p.id)}>
                  {p.name}
                </Chip>
              ))}
            </PickRow>
            <PickRow label="Objetivo">
              {OBJECTIVES.map((o) => (
                <Chip
                  key={o.id}
                  active={objective === o.id}
                  onClick={() => setObjective(o.id)}
                >
                  {o.name}
                </Chip>
              ))}
            </PickRow>
            <PickRow label="Dimensão">
              {DIMENSIONS.map((d) => (
                <Chip key={d} active={dimension === d} onClick={() => setDimension(d)}>
                  {d}
                </Chip>
              ))}
            </PickRow>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Formato
                </p>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar formato…"
                  className="h-8 max-w-xs"
                />
              </div>
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormatId(f.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-xs transition",
                      formatId === f.id
                        ? "border-primary/60 bg-card shadow-[0_0_18px_-10px_hsl(var(--primary)/0.6)]"
                        : "border-border/60 bg-card/40 hover:border-border",
                    )}
                  >
                    <p className="font-semibold">{f.name}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">
                      {f.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
            <Button onClick={runOne} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="mr-2 h-4 w-4" />
              )}
              Gerar 1 criativo
            </Button>
            <Button onClick={runVariations} disabled={busy} variant="secondary">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Gerar 3 variações
            </Button>
          </div>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum criativo gerado ainda neste projeto.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {list.length} criativo{list.length === 1 ? "" : "s"} salvo
            {list.length === 1 ? "" : "s"}
          </p>
          {[...list].reverse().map((c, i) => (
            <CreativeCard
              key={(c.createdAt ?? "") + i}
              id={`${c.formatId ?? formatId}-${i}`}
              creative={c}
              meta={{
                platform: PLATFORMS.find((p) => p.id === c.platform)?.name ?? platformName,
                objective:
                  OBJECTIVES.find((o) => o.id === c.objective)?.name ?? objectiveName,
                format: ADS_FORMATS.find((f) => f.id === c.formatId)?.name ?? formatName,
                dimension: (c.dimension as Dimension) ?? dimension,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PickRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className="cursor-pointer"
    >
      {children}
    </Badge>
  );
}