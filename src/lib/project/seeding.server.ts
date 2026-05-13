import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cross-module seeding: when one module generates content, populate
 * meta.*_seed for the others so they can use the data as default input
 * (no auto-cascade generation — only inputs).
 */
export type SeedModule =
  | "ebook"
  | "copy"
  | "salesPage"
  | "creative"
  | "checkout"
  | "playbook";

type AnyRecord = Record<string, unknown>;

function buildSeeds(module: SeedModule, payload: AnyRecord): AnyRecord {
  const seeds: AnyRecord = {};
  switch (module) {
    case "ebook": {
      const briefing = (payload.briefing ?? {}) as AnyRecord;
      const outline = Array.isArray(payload.outline) ? payload.outline : [];
      const baseSeed = {
        title: briefing.title,
        promise: briefing.promise,
        avatar: briefing.avatar,
        niche: briefing.niche,
        pains: briefing.pains,
        desires: briefing.desires,
        uniqueMechanism: briefing.uniqueMechanism,
        chapters: outline,
      };
      seeds.copy_seed = baseSeed;
      seeds.salesPage_seed = baseSeed;
      seeds.creative_seed = {
        ...baseSeed,
        angles: (briefing.angles as unknown) ?? [],
      };
      seeds.checkout_seed = {
        title: briefing.title,
        promise: briefing.promise,
        guarantee: "7 dias incondicional",
      };
      seeds.scale_seed = baseSeed;
      break;
    }
    case "copy": {
      const copy = (payload.copy ?? {}) as AnyRecord;
      seeds.creative_seed = {
        headlines: [copy.headline].filter(Boolean),
        hooks: copy.bigIdea ? [copy.bigIdea] : [],
        angles: copy.angles ?? [],
      };
      seeds.salesPage_seed = {
        headline: copy.headline,
        subheadline: copy.subheadline,
        bigIdea: copy.bigIdea,
        cta: copy.cta,
        bullets: copy.bullets,
        objections: copy.objections,
      };
      break;
    }
    case "creative": {
      const c = (payload.creative ?? {}) as AnyRecord;
      seeds.creative_seed = {
        bestHeadlines: c.headline ? [c.headline] : [],
        ctas: c.cta ? [c.cta] : [],
        platform: c.platform,
      };
      break;
    }
    case "salesPage": {
      const page = (payload.page ?? {}) as AnyRecord;
      seeds.checkout_seed = {
        price: page.price,
        anchorPrice: page.anchorPrice,
        bonuses: page.bonuses,
        guarantee: page.guarantee,
        cta: page.cta,
      };
      break;
    }
    case "playbook": {
      const briefing = (payload.briefing ?? {}) as AnyRecord;
      seeds.copy_seed = {
        strategy: briefing.uniqueMechanism,
        promise: briefing.promise,
      };
      seeds.creative_seed = {
        angles: briefing.pains ?? [],
      };
      break;
    }
    case "checkout":
      // no fan-out needed
      break;
  }
  return seeds;
}

export async function seedFromModule(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  module: SeedModule,
  payload: AnyRecord,
): Promise<void> {
  try {
    const seeds = buildSeeds(module, payload);
    if (Object.keys(seeds).length === 0) return;
    const { data: row } = await supabase
      .from("projects")
      .select("meta")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();
    const existing = ((row as { meta?: AnyRecord } | null)?.meta ?? {}) as AnyRecord;
    const nextMeta = { ...existing, ...seeds };
    await supabase
      .from("projects")
      .update({ meta: nextMeta as never, updated_at: new Date().toISOString() } as never)
      .eq("id", projectId)
      .eq("user_id", userId);
  } catch (e) {
    // seeding is best-effort; never break the main flow
    console.error("[seedFromModule] failed", { module, projectId, error: e });
  }
}