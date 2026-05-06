import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchOffers } from "@/lib/queries";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ofertas-escaladas")({ component: ScaledPage });

function ScaledPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { fetchOffers().then(setRows); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.advertiser_name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("scaled.title")}</h1>
        <p className="text-muted-foreground">{t("scaled.subtitle")}</p>
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="border-b border-border/60 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("scaled.search")} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("scaled.advertiser")}</TableHead>
                <TableHead className="text-right">{t("scaled.score")}</TableHead>
                <TableHead className="text-right">{t("scaled.ads")}</TableHead>
                <TableHead>{t("scaled.niche")}</TableHead>
                <TableHead>{t("scaled.country")}</TableHead>
                <TableHead>{t("scaled.status")}</TableHead>
                <TableHead>{t("scaled.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate({ to: "/oferta/$id", params: { id: r.id } })}>
                  <TableCell className="font-medium">{r.advertiser_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.scale_score}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.ads_count ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.niche}</TableCell>
                  <TableCell className="text-muted-foreground">{r.country}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}