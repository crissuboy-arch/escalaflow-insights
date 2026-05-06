import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/AuthProvider";
import { OfferCard } from "@/components/OfferCard";
import { toggleFavorite, fetchFavorites } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/favoritos")({ component: FavoritesPage });

function FavoritesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setRows(await fetchFavorites(user.id));
  };
  useEffect(() => { load(); }, [user]);

  const onUnfav = async (offerId: string) => {
    if (!user) return;
    await toggleFavorite(user.id, offerId, false);
    toast.success("OK");
    load();
  };

  const offers = rows.map((r) => r.mined_offers).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("favorites.title")}</h1>
        <p className="text-muted-foreground">{t("favorites.subtitle")}</p>
      </div>
      {offers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("favorites.empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} saved onToggleSave={() => onUnfav(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}