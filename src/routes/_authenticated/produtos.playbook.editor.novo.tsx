import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PlaybookEditor } from "@/components/playbook/PlaybookEditor";

export const Route = createFileRoute("/_authenticated/produtos/playbook/editor/novo")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: NewEditorPage,
});

function NewEditorPage() {
  return (
    <PlaybookEditor
      initial={{
        id: null,
        title: "Novo Playbook",
        status: "draft",
        scenes: [
          {
            id: crypto.randomUUID(),
            title: "Página 1",
            text: "",
            image_url: null,
          },
        ],
      }}
    />
  );
}