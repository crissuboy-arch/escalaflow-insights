import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trash2, Play } from "lucide-react";

export interface DraftRow {
  id: string;
  title: string;
  niche: string | null;
  status: string;
  step: number;
  chapter_count: number;
  cover_url: string | null;
  updated_at: string;
}

interface Props {
  drafts: DraftRow[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  busy?: boolean;
}

const STEP_LABELS = ["Anúncio", "Briefing", "Estrutura", "Layout", "Capítulos"];

export function DraftList({ drafts, onResume, onDelete, busy }: Props) {
  if (drafts.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Continuar rascunho</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {drafts.slice(0, 5).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {d.cover_url ? (
                  <img src={d.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {STEP_LABELS[d.step] ?? "—"}
                  </Badge>
                  {d.status === "ready" && <Badge className="text-[10px]">Pronto</Badge>}
                  {d.niche && <span className="truncate">{d.niche}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onResume(d.id)} disabled={busy}>
                  <Play className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(d.id)} disabled={busy}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}