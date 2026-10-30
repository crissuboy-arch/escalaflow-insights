import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/auth/authed-fetch";
import { SkillExecuteModal, type ModuleSkill } from "./SkillExecuteModal";

type Props = {
  moduleKey: string;
  className?: string;
};

export function SkillButton({ moduleKey, className }: Props) {
  const [skill, setSkill] = useState<ModuleSkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    authedFetch(`/api/execute-skill?module_key=${encodeURIComponent(moduleKey)}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; skill?: ModuleSkill }) => {
        if (d.ok && d.skill) setSkill(d.skill);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleKey]);

  if (loading || !skill) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className={`gap-1.5 border border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 backdrop-blur hover:border-blue-400/60 hover:from-blue-600/30 hover:to-purple-600/30 hover:text-white transition-all shadow-[0_0_16px_rgba(99,102,241,0.2)] hover:shadow-[0_0_24px_rgba(99,102,241,0.35)] ${className ?? ""}`}
        variant="outline"
      >
        <Zap className="h-3.5 w-3.5" />
        {skill.skill_name}
      </Button>

      <SkillExecuteModal open={open} onClose={() => setOpen(false)} skill={skill} />
    </>
  );
}
