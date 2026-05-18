import { cn } from "@/lib/utils";

export function ScoreChip({
  label,
  value,
  color,
  reason,
}: {
  label: string;
  value: number;
  color?: string;
  reason?: string;
}) {
  const c =
    color === "green" || (color == null && value >= 75)
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : color === "red" || (color == null && value < 50)
        ? "bg-red-500/10 text-red-500 border-red-500/30"
        : "bg-amber-500/10 text-amber-500 border-amber-500/30";
  return (
    <div className={cn("rounded-lg border p-3", c)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </div>
      {reason && <p className="mt-1 text-xs opacity-80 line-clamp-2">{reason}</p>}
    </div>
  );
}
