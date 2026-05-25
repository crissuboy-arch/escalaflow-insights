import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PremiumTemplates } from "@/components/ebook/PremiumTemplates";

export const Route = createFileRoute("/_authenticated/produtos/ebook")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: EbookPage,
});

function EbookPage() {
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
      </div>

      <PremiumTemplates />
    </motion.div>
  );
}
