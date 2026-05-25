import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BookOpen } from "lucide-react";
import { TemplateStudio } from "@/components/ebook/TemplateStudio";
import { getTemplate } from "@/lib/ebook/template-master";

const SearchSchema = z.object({ t: z.string().optional() });

export const Route = createFileRoute("/_authenticated/ebook-studio")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: EbookStudioPage,
});

function EbookStudioPage() {
  const { t } = Route.useSearch();
  const template = t ? getTemplate(t) : null;

  if (!template) {
    return (
      <div style={{ minHeight: "100vh", background: "#080D1A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#F0F4FF", fontFamily: "Inter, sans-serif" }}>
        <BookOpen size={40} color="#6B7FA8" />
        <p style={{ fontSize: 16, color: "#6B7FA8" }}>Template não encontrado.</p>
        <a href="/produtos/ebook" style={{ fontSize: 14, color: "#0A6CFF" }}>← Voltar para Templates</a>
      </div>
    );
  }

  return <TemplateStudio template={template} />;
}
