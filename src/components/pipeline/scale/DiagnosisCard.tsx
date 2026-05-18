import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreChip } from "./ScoreChip";

type Bullet = { label: string; value?: string };

export function DiagnosisCard({
  title,
  score,
  scoreColor,
  verdict,
  bullets,
  lists,
}: {
  title: string;
  score?: number;
  scoreColor?: string;
  verdict?: string;
  bullets?: Bullet[];
  lists?: { label: string; items: string[]; tone?: "good" | "bad" }[];
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          {verdict && <Badge variant="outline" className="uppercase">{verdict}</Badge>}
        </div>
        {typeof score === "number" && (
          <ScoreChip label="Nota" value={score} color={scoreColor} />
        )}
        {bullets && bullets.length > 0 && (
          <div className="grid gap-1.5 text-xs sm:grid-cols-2">
            {bullets.filter((b) => b.value).map((b, i) => (
              <div key={i} className="rounded border border-border/60 p-2">
                <p className="uppercase text-muted-foreground">{b.label}</p>
                <p className="text-foreground">{b.value}</p>
              </div>
            ))}
          </div>
        )}
        {lists?.map((l, i) =>
          l.items.length ? (
            <div key={i}>
              <p className="text-xs uppercase text-muted-foreground">{l.label}</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {l.items.map((it, j) => (
                  <li key={j} className={l.tone === "bad" ? "text-red-500" : l.tone === "good" ? "text-emerald-500" : ""}>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}
