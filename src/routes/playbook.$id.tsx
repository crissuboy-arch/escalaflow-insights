import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { loadPublicPlaybook } from "@/lib/playbook.functions";
import { FlipBook, type FlipPage } from "@/components/playbook/FlipBook";

export const Route = createFileRoute("/playbook/$id")({
  component: PublicPlaybookPage,
});

type PublicData = {
  id: string;
  title: string;
  scenes: FlipPage[];
} | null;

function PublicPlaybookPage() {
  const { id } = Route.useParams();
  const load = useServerFn(loadPublicPlaybook);
  const [state, setState] = useState<{ loading: boolean; data: PublicData }>({
    loading: true,
    data: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const row = (await load({ data: { id } })) as PublicData;
        setState({ loading: false, data: row });
      } catch {
        setState({ loading: false, data: null });
      }
    })();
  }, [id, load]);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!state.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-neutral-300">
        <h1 className="text-4xl font-bold text-white">404</h1>
        <p>Este playbook não está disponível ou foi despublicado.</p>
        <Link to="/" className="text-sm text-blue-400 underline">
          Voltar
        </Link>
      </div>
    );
  }

  const { data } = state;
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-[#0b0b1a] to-neutral-900 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-white md:text-3xl">
          {data.title}
        </h1>
        <FlipBook pages={data.scenes} />
      </div>
    </div>
  );
}