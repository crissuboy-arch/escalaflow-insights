import { motion } from "framer-motion";
import { FolderKanban, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineMode = "project" | "standalone";

export function ModePicker({
  value,
  onChange,
  accent,
}: {
  value: PipelineMode;
  onChange: (m: PipelineMode) => void;
  accent: string;
}) {
  const items: Array<{ id: PipelineMode; title: string; desc: string; icon: typeof FolderKanban }> =
    [
      {
        id: "project",
        title: "Selecionar Projeto Existente",
        desc: "Puxa briefing, promessa, avatar, mecanismo e oferta automaticamente.",
        icon: FolderKanban,
      },
      {
        id: "standalone",
        title: "Criar Novo Produto",
        desc: "Funciona com qualquer produto — infoproduto, físico, Amazon, Shopee, app, SaaS.",
        icon: Sparkles,
      },
    ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((it) => {
        const active = value === it.id;
        const Icon = it.icon;
        return (
          <motion.button
            key={it.id}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onChange(it.id)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-5 text-left transition-all",
              active
                ? "border-primary/60 bg-card shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)]"
                : "border-border/60 bg-card/40 hover:border-border",
            )}
          >
            {active && (
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl"
                style={{ background: accent }}
              />
            )}
            <div className="relative flex items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  active ? "text-primary-foreground" : "text-foreground/70",
                )}
                style={active ? { background: accent } : { background: "hsl(var(--muted))" }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{it.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}