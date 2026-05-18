import { Card, CardContent } from "@/components/ui/card";

export function ScaleDayCard({
  day,
  blocks,
}: {
  day: number;
  blocks: { label: string; text?: string; items?: string[] }[];
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            Dia {day}
          </span>
        </div>
        {blocks.map((b, i) =>
          (b.text && b.text.trim()) || (b.items && b.items.length) ? (
            <div key={i}>
              <p className="text-xs uppercase text-muted-foreground">{b.label}</p>
              {b.text && <p className="text-sm">{b.text}</p>}
              {b.items && b.items.length > 0 && (
                <ul className="list-disc pl-5 text-sm">
                  {b.items.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              )}
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}
