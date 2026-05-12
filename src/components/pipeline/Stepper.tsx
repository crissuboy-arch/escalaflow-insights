import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type Step = { id: string; label: string };

export function Stepper({
  steps,
  current,
  completed,
  onJump,
}: {
  steps: Step[];
  current: number;
  completed: Set<string>;
  onJump?: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-full items-center gap-2">
        {steps.map((s, i) => {
          const done = completed.has(s.id);
          const active = i === current;
          const clickable = !!onJump && (done || i <= current);
          return (
            <li key={s.id} className="flex flex-1 items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onJump!(i)}
                className={cn(
                  "group flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition",
                  active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : done
                      ? "border-border/60 bg-card text-foreground hover:border-primary/40"
                      : "border-border/40 bg-card/40 text-muted-foreground",
                  !clickable && "cursor-not-allowed opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="truncate font-medium">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="mx-1 hidden h-px w-4 bg-border md:block" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}