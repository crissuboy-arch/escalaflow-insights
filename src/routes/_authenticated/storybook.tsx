import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import StorybookHome from "@/components/StorybookHome";
import { createStory, listStories } from "@/lib/storybook.functions";

// ─── Route ────────────────────────────────────────────────────────────────────

const SearchSchema = z.object({ preset: z.string().optional() });

export const Route = createFileRoute("/_authenticated/storybook")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: StorybookPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryRow = {
  id: string;
  title: string;
  niche: string | null;
  status: string;
  step: number;
  updated_at: string;
};

// ─── Page Component ───────────────────────────────────────────────────────────

function StorybookPage() {
  const navigate = useNavigate();
  const { preset } = useSearch({ from: "/_authenticated/storybook" });
  const create = useServerFn(createStory);
  const listFn = useServerFn(listStories);
  const [rows, setRows] = useState<StoryRow[]>([]);

  useEffect(() => {
    listFn().then((d) => {
      const all = (d ?? []) as unknown as StoryRow[];
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();
      setRows(all.filter((r) => {
        if (seenIds.has(r.id) || seenTitles.has(r.title)) return false;
        seenIds.add(r.id);
        seenTitles.add(r.title);
        return true;
      }));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(planning: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { id } = await create({ data: { planning: planning as any } });
    navigate({ to: "/storybook/$id", params: { id } });
  }

  return <StorybookHome rows={rows} onCreateStory={handleCreate} preset={preset} />;
}
