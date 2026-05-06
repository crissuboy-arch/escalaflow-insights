import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/AuthProvider";
import { fetchSaved, toggleSaveOffer } from "@/lib/queries";
import { OfferCard } from "@/components/OfferCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ofertas-salvas")({ component: SavedPage });

function SavedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => { if (user) setRows(await fetchSaved(user.id)); };
  useEffect(() => { load(); }, [user]);

  const onRemove = async (offerId: string) => {
    if (!user) return;
    await toggleSaveOffer(user.id, offerId);
    toast.success("OK");
    load();
  };

  const offers = rows.map((r) => r.mined_offers).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("saved_page.title")}</h1>
        <p className="text-muted-foreground">{t("saved_page.subtitle")}</p>
      </div>
      {offers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("saved_page.empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} saved onToggleSave={() => onRemove(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}