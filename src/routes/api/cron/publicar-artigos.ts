import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { executeArtigoTask } from "@/lib/afiliadosSeo.server";

export const Route = createFileRoute("/api/cron/publicar-artigos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Protegido por header Authorization: Bearer {CRON_SECRET}
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Sites do Motor Afiliados SEO
        const { data: projects } = await supabaseAdmin
          .from("projects")
          .select("id")
          .eq("mode", "afiliados_seo");
        const ids = ((projects ?? []) as Array<{ id: string }>).map((p) => p.id);
        if (!ids.length) return Response.json({ ok: true, processed: null });

        // Próxima task pronta: status='todo' e due_at <= agora, a mais antiga primeiro (1 por vez)
        const { data: tasks } = await supabaseAdmin
          .from("project_tasks")
          .select("id")
          .in("project_id", ids)
          .eq("status", "todo")
          .lte("due_at", new Date().toISOString())
          .order("due_at", { ascending: true })
          .limit(1);
        const task = (tasks ?? [])[0] as { id: string } | undefined;
        if (!task) return Response.json({ ok: true, processed: null });

        try {
          await executeArtigoTask(supabaseAdmin, task.id);
          return Response.json({ ok: true, processed: task.id });
        } catch (e) {
          // executeArtigoTask já marcou a task como 'failed' e gravou o erro em project_outputs
          return Response.json(
            { ok: false, processed: task.id, error: e instanceof Error ? e.message : "erro" },
            { status: 500 },
          );
        }
      },
    },
  },
});
