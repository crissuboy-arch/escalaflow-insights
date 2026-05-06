import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Target, Heart, Lightbulb, Users, Brain, Layers, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/analise-ia")({ component: AIPage });

function AIPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ai_analyses")
        .select("*, mined_offers(advertiser_name, niche, image_url)")
        .order("created_at", { ascending: false });
      const list = data ?? [];
      setItems(list);
      setSelected(list[0] ?? null);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("ai.title")}</h1>
        <p className="text-muted-foreground">{t("ai.subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("ai.noAnalyses")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => setSelected(it)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selected?.id === it.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                }`}
              >
                <p className="text-sm font-medium truncate">{it.mined_offers?.advertiser_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{it.promise}</p>
              </button>
            ))}
          </div>

          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border-border/60 overflow-hidden">
                <div className="p-6" style={{ background: "var(--gradient-primary)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
                    {selected.mined_offers?.niche}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-primary-foreground">
                    {selected.mined_offers?.advertiser_name}
                  </h2>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard icon={Target} title={t("ai.promise")}><p>{selected.promise}</p></InfoCard>
                <InfoCard icon={Sparkles} title={t("ai.mechanism")}><p>{selected.mechanism}</p></InfoCard>
                <InfoCard icon={Heart} title={t("ai.pains")}>
                  <ListBadges items={selected.pains} variant="destructive" />
                </InfoCard>
                <InfoCard icon={Lightbulb} title={t("ai.desires")}>
                  <ListBadges items={selected.desires} variant="secondary" />
                </InfoCard>
                <InfoCard icon={Users} title={t("ai.audience")}><p>{selected.target_audience}</p></InfoCard>
                <InfoCard icon={Brain} title={t("ai.triggers")}>
                  <ListBadges items={selected.mental_triggers} variant="default" />
                </InfoCard>
                <InfoCard icon={Layers} title={t("ai.structure")} className="md:col-span-2">
                  <p className="whitespace-pre-line">{selected.offer_structure}</p>
                </InfoCard>
                <InfoCard icon={ImageIcon} title={t("ai.creatives")} className="md:col-span-2">
                  <ul className="space-y-2 text-sm">
                    {(selected.creative_suggestions ?? []).map((c: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span>{c}</li>
                    ))}
                  </ul>
                </InfoCard>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, title, children, className }: any) {
  return (
    <Card className={`border-border/60 ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function ListBadges({ items, variant }: { items: any; variant: "default" | "secondary" | "destructive" }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div className="flex flex-wrap gap-1.5">
      {arr.map((x, i) => <Badge key={i} variant={variant} className="text-xs">{x}</Badge>)}
    </div>
  );
}