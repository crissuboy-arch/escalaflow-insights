import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { fetchOffers, toggleSaveOffer, subscribeChange } from "@/lib/queries";
import { OfferCard } from "@/components/OfferCard";
import { useAuth } from "@/providers/AuthProvider";
import { fetchSavedIds } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/minerar")({ component: MinePage });

function MinePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [niche, setNiche] = useState("all");
  const [country, setCountry] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [quantity, setQuantity] = useState(12);
  const [offers, setOffers] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setOffers(await fetchOffers({ keyword, niche, country, platform, limit: quantity })); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!user) return;
    fetchSavedIds(user.id).then(setSavedIds);
    const unsub = subscribeChange((s) => { if (s === "saved") fetchSavedIds(user.id).then(setSavedIds); });
    return unsub;
  }, [user]);

  const onSave = async (id: string) => {
    if (!user) return;
    const isSaved = await toggleSaveOffer(user.id, id);
    setSavedIds((s) => { const n = new Set(s); isSaved ? n.add(id) : n.delete(id); return n; });
    toast.success(isSaved ? t("mine.saved") : "OK");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("mine.title")}</h1>
        <p className="text-muted-foreground">{t("mine.subtitle")}</p>
      </div>
      <Card className="border-border/60">
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><Label>{t("mine.keyword")}</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ex: emagrecer" /></div>
          <div><Label>{t("mine.niche")}</Label>
            <Select value={niche} onValueChange={setNiche}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("common.all")}</SelectItem>
                {["Saúde","Finanças","Marketing","Educação","Beleza","Tecnologia","Produtividade","E-commerce","Carreira"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent></Select></div>
          <div><Label>{t("mine.country")}</Label>
            <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("common.all")}</SelectItem>
                {["BR","US","ES","PT","FR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent></Select></div>
          <div><Label>{t("mine.platform")}</Label>
            <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("common.all")}</SelectItem>
                {["Facebook","Instagram","TikTok","YouTube","LinkedIn","Pinterest"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent></Select></div>
          <div><Label>{t("mine.quantity")}: {quantity}</Label>
            <Slider value={[quantity]} min={4} max={20} step={1} onValueChange={(v) => setQuantity(v[0])} className="mt-3" /></div>
          <div className="md:col-span-2 lg:col-span-6">
            <Button onClick={load} disabled={loading} className="w-full md:w-auto text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Search className="mr-2 h-4 w-4" /> {t("mine.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {offers.length === 0 && !loading ? (
        <p className="py-12 text-center text-muted-foreground">{t("mine.noResults")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {offers.map((o) => <OfferCard key={o.id} offer={o} saved={savedIds.has(o.id)} onToggleSave={() => onSave(o.id)} />)}
        </div>
      )}
    </div>
  );
}