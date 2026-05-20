import { useEffect, useState } from "react";
import logoMark from "@/assets/brand/logo-mark.png";

const MESSAGES = [
  "Inicializando Inteligência…",
  "Conectando Agentes…",
  "Sincronizando Mission Control…",
];

export function BrandSplash({ label }: { label?: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (label) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, [label]);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-mission)" }} />
      <div className="relative flex flex-col items-center gap-7">
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-full border border-primary/30 animate-spin-slow" />
          <div className="absolute -inset-3 rounded-full border border-primary/10 animate-spin-slow [animation-duration:8s] [animation-direction:reverse]" />
          <div className="absolute inset-0 rounded-full animate-neon-pulse" style={{ background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 65%)", opacity: 0.4 }} />
          <img
            src={logoMark}
            alt="Flow"
            className="absolute inset-3 h-[88px] w-[88px] object-contain logo-drop-glow"
          />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-px w-40 overflow-hidden rounded-full bg-border/50">
            <div className="absolute inset-y-0 left-0 w-1/2 animate-[shimmer_1.6s_ease_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {label ?? MESSAGES[idx]}
          </p>
        </div>
      </div>
    </div>
  );
}