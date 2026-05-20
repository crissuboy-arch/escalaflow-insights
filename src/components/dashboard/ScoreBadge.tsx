import { cn } from "@/lib/utils";

const scoreConfig = {
  viral: { label: "Viral", gradient: "from-rose-500 to-pink-600" },
  emotional: { label: "Emocional", gradient: "from-violet-500 to-purple-600" },
  scale: { label: "Escala", gradient: "from-blue-500 to-cyan-600" },
  conversion: { label: "Conversão", gradient: "from-emerald-500 to-green-600" },
};

export function ScoreBadge({
  type,
  value,
  size = "sm",
}: {
  type: keyof typeof scoreConfig;
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = scoreConfig[type];
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("rounded-full bg-gradient-to-br p-[1px]", cfg.gradient)}>
        <div className={cn(
          "rounded-full bg-background font-semibold tabular-nums text-white",
          size === "sm" && "px-1.5 text-[10px] leading-4",
          size === "md" && "px-2 text-xs leading-5",
          size === "lg" && "px-3 text-sm leading-6",
        )}>
          {value}
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
    </div>
  );
}
