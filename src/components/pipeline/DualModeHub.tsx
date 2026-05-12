import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ModePicker, type PipelineMode } from "./ModePicker";
import { PipelineHub, type PipelineTab } from "@/components/PipelineHub";

export function DualModeHub({
  title,
  description,
  icon: Icon,
  tab,
  metaKey,
  accent,
  standalone,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tab: PipelineTab;
  metaKey: string;
  accent: string;
  standalone: ReactNode;
}) {
  const [mode, setMode] = useState<PipelineMode>("project");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-6"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: accent }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground shadow-lg"
            style={{ background: accent }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </motion.div>

      <ModePicker value={mode} onChange={setMode} accent={accent} />

      {mode === "project" ? (
        <ProjectModeView tab={tab} metaKey={metaKey} accent={accent} title={title} icon={Icon} description={description} />
      ) : (
        <div>{standalone}</div>
      )}
    </div>
  );
}

// Reuses PipelineHub list but without the duplicate header banner.
function ProjectModeView({
  tab,
  metaKey,
  accent,
  title,
  description,
  icon,
}: {
  tab: PipelineTab;
  metaKey: string;
  accent: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  // PipelineHub already renders header + list; we hide the inner header via wrapper margin.
  return (
    <div className="[&>div>div:first-child]:hidden">
      <PipelineHub
        title={title}
        description={description}
        icon={icon}
        tab={tab}
        metaKey={metaKey}
        accent={accent}
      />
    </div>
  );
}