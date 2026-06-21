import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PremiumTemplates } from "@/components/ebook/PremiumTemplates";
import { SkillButton } from "@/components/module-skills/SkillButton";

export const Route = createFileRoute("/_authenticated/produtos/ebook")({
  validateSearch: (s) => z.object({ t: z.string().optional() }).parse(s),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: EbookPage,
});

function EbookPage() {
  const { t: templateId } = Route.useSearch();

  // Bridge: syncs covers from ebook_covers_v2 (saved by TemplateStudio)
  // into escala:template-covers (read by PremiumTemplates cards).
  useEffect(() => {
    function syncCovers() {
      try {
        const raw = localStorage.getItem("ebook_covers_v2");
        if (!raw) return;
        const v2 = JSON.parse(raw) as Record<string, { imageUrl?: string }>;
        const raw2 = localStorage.getItem("escala:template-covers");
        const tc = raw2 ? (JSON.parse(raw2) as Record<string, string>) : {};
        let changed = false;
        for (const [id, data] of Object.entries(v2)) {
          if (data.imageUrl && tc[id] !== data.imageUrl) {
            tc[id] = data.imageUrl;
            changed = true;
          }
        }
        if (changed) localStorage.setItem("escala:template-covers", JSON.stringify(tc));
      } catch { /* ignore */ }
    }
    syncCovers();
    window.addEventListener("storage", syncCovers);
    return () => window.removeEventListener("storage", syncCovers);
  }, [templateId]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Ebook</h1>
          <p className="text-muted-foreground">Escolha um template e abra o Studio para personalizar e exportar.</p>
        </div>
        <SkillButton moduleKey="criar_ebook" />
      </div>

      <PremiumTemplates initialTemplateId={templateId} />
    </motion.div>
  );
}
