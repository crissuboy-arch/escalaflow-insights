import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadPlaybook } from "@/lib/playbook.functions";
import { PlaybookEditor, type EditorPlaybook } from "@/components/playbook/PlaybookEditor";

export const Route = createFileRoute("/_authenticated/produtos/playbook/editor/$id")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  const load = useServerFn(loadPlaybook);
  const [data, setData] = useState<EditorPlaybook | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const row = (await load({ data: { id } })) as {
          id: string;
          title: string;
          status: "draft" | "published";
          scenes: Array<{ id: string; title: string; text: string; image_url: string | null }>;
        };
        setData({
          id: row.id,
          title: row.title,
          status: row.status,
          scenes: (row.scenes ?? []).map((s) => ({
            id: s.id,
            title: s.title || "",
            text: s.text || "",
            image_url: s.image_url ?? null,
          })),
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar");
      }
    })();
  }, [id, load]);

  if (!data) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }
  return <PlaybookEditor initial={data} />;
}