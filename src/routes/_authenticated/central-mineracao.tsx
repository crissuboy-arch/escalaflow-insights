import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Radio, Search, Star, Globe, Megaphone, Flame, ExternalLink,
  Sparkles, Trash2, RefreshCw, AlertCircle, CheckCircle2, Wifi, WifiOff, Download, Rocket, Bot,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { miningRepo } from "@/lib/mining/repository";
import { startExtensionBridge, detectExtension, seedDemoAds, insertTestAd } from "@/lib/mining/bridge";
import type { MinedAd, MiningStatus } from "@/lib/mining/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Radar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/central-mineracao")({ component: MiningCenterPage });

function MiningCenterPage() {
  const [ads, setAds] = useState<MinedAd[]>([]);
  const [extensionConnected, setExtensionConnected] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState<MiningStatus | "all">("all");
  const [favOnly, setFavOnly] = useState(false);
  const [mining, setMining] = useState(false);
  const [keyword, setKeyword] = useState("");

  const refresh = async () => {
    const local = await miningRepo.list();
    let remote: MinedAd[] = [];
    try {
      const { data } = await supabase
        .from("collected_ads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      remote = (data ?? []).map((r) => ({
        id: `db_${r.id}`,
        headline: r.headline ?? "",
        copy: r.copy ?? "",
        platform: r.platform ?? "Facebook",
        country: r.country ?? "—",
        niche: r.niche ?? "Geral",
        score: r.score ?? 0,
        adUrl: r.ad_url,
        analysisType: "manual",
        creativeUrl: r.image_url ?? r.video_url ?? null,
        createdAt: r.created_at,
        receivedAt: r.created_at,
        source: "extension",
        status: (r.status ?? "new") as MiningStatus,
        favorite: !!r.favorite,
        advertiser: r.advertiser,
        cta: r.cta ?? undefined,
        adLibraryId: r.ad_library_id ?? undefined,
        creativeType: r.creative_type ?? undefined,
        tags: [],
      }));
    } catch (e) {
      console.warn("[central] supabase fetch failed", e);
    }
    // dedup local + remote by adLibraryId/adUrl
    const seen = new Set<string>();
    const merged = [...remote, ...local].filter((a) => {
      const k = a.adLibraryId || a.adUrl || a.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setAds(merged);
  };

  const onMineNow = async () => {
    const kw = keyword.trim();
    if (!kw) {
      toast.error("Digite uma palavra-chave para minerar.");
      return;
    }
    setMining(true);
    try {
      const res = await fetch("/api/collector/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keyword: kw,
          country: country === "all" ? undefined : country,
          limit: 30,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Falha no Motor de Coleta");
      toast.success(`Mineração concluída — ${data.count} anúncios (${data.saved ?? 0} salvos)`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na mineração");
    } finally {
      setMining(false);
    }
  };

  useEffect(() => {
    refresh();
    const unsub = miningRepo.subscribe(refresh);
    startExtensionBridge((n) => toast.success(`${n} anúncio(s) recebido(s) da extensão`));
    detectExtension().then(setExtensionConnected);
    return unsub;
  }, []);

  const platforms = useMemo(() => Array.from(new Set(ads.map((a) => a.platform))), [ads]);
  const countries = useMemo(() => Array.from(new Set(ads.map((a) => a.country))), [ads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ads.filter((a) => {
      if (platform !== "all" && a.platform !== platform) return false;
      if (country !== "all" && a.country !== country) return false;
      if (status !== "all" && a.status !== status) return false;
      if (favOnly && !a.favorite) return false;
      if (q && !`${a.headline} ${a.copy} ${a.niche}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ads, search, platform, country, status, favOnly]);

  const onReceive = async () => {
    const present = await detectExtension();
    setExtensionConnected(present);
    if (present) {
      toast.success("Extensão detectada — aguardando dados…");
    } else {
      const n = await seedDemoAds(5);
      toast.info(`Extensão não detectada — ${n} anúncios demo inseridos`);
    }
    await refresh();
  };

  const onInsertTest = async () => {
    await insertTestAd();
    await refresh();
    toast.success("Anúncio minerado com sucesso");
  };

  const onToggleFav = async (a: MinedAd) => miningRepo.update(a.id, { favorite: !a.favorite });
  const onMarkReviewed = async (a: MinedAd) =>
    miningRepo.update(a.id, { status: a.status === "reviewed" ? "new" : "reviewed" });
  const onDelete = async (a: MinedAd) => miningRepo.remove(a.id);
  const onScale = async (a: MinedAd) => {
    await miningRepo.update(a.id, { scaled: true, status: "reviewed" });
    toast.success("Enviado para Escalada");
  };
  const onOpenChatGPT = (a: MinedAd) => {
    const prompt = `Faça engenharia reversa do anúncio:\n\nAnunciante: ${a.advertiser || "—"}\nHeadline: ${a.headline}\nCopy: ${a.copy}\nCTA: ${a.cta || "—"}\nNicho: ${a.niche} | País: ${a.country}\nPlataforma: ${a.platform}\nLink: ${a.adUrl || "—"}\n\n1) Big Idea\n2) Avatar\n3) Estrutura\n4) Gatilhos\n5) Como escalar`;
    openChatGPTWithPrompt(prompt);
  };
  const onClearAll = async () => {
    if (!confirm("Limpar toda a central de mineração?")) return;
    await miningRepo.clear();
    toast.success("Central limpa");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
            <Radio className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Mineração</h1>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{ads.length}</span> anúncios recebidos · banco local
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionPill connected={extensionConnected} />
          <Input
            placeholder="palavra-chave"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-9 w-44"
          />
          <Button onClick={onMineNow} disabled={mining} className="text-white" style={{ background: "var(--gradient-primary)" }}>
            {mining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
            Minerar Agora
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetch("/escalaflow-extension.zip")
                .then((res) => {
                  if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
                  return res.blob();
                })
                .then((blob) => {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "escalaflow-extension.zip";
                  a.click();
                  URL.revokeObjectURL(a.href);
                  toast.success("Download iniciado");
                })
                .catch((err) => toast.error(err.message));
            }}
          >
            <Download className="mr-1 h-4 w-4" /> Baixar Extensão
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={onInsertTest}>
            <Sparkles className="mr-1 h-4 w-4" /> Teste de Importação
          </Button>
          <Button onClick={onReceive} className="ai-glow text-white">
            <Sparkles className="mr-2 h-4 w-4" /> Receber da Extensão
          </Button>
        </div>
      </div>

      {/* Demo banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Modo demonstração</p>
            <p className="text-muted-foreground">
              Os anúncios são armazenados localmente neste navegador. A persistência em nuvem (Supabase / Convex / API)
              será habilitada na integração final. O endpoint <code className="rounded bg-muted px-1">/api/ingest</code> e o canal
              <code className="ml-1 rounded bg-muted px-1">window.postMessage</code> já aceitam dados reais da extensão.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar headline, copy ou nicho…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas plataformas</SelectItem>
              {platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos países</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as MiningStatus | "all")}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="reviewed">Revisado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between gap-2 md:col-span-5">
            <Button variant={favOnly ? "default" : "outline"} size="sm" onClick={() => setFavOnly((v) => !v)}>
              <Star className={`mr-1 h-4 w-4 ${favOnly ? "fill-yellow-300 text-yellow-300" : ""}`} /> Apenas favoritos
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearAll} disabled={ads.length === 0}>
              <Trash2 className="mr-1 h-4 w-4" /> Limpar tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Radio className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {ads.length === 0
                  ? "Nenhum anúncio recebido ainda. Clique em \"Receber da Extensão\" para começar."
                  : "Nenhum anúncio corresponde aos filtros."}
              </p>
              {ads.length === 0 && (
                <Button onClick={onInsertTest} className="mt-2">
                  <Sparkles className="mr-2 h-4 w-4" /> Inserir anúncio teste
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Headline</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={200}>
                    {filtered.map((a) => (
                      <TableRow key={a.id} className="group">
                        <TableCell>
                          <button onClick={() => onToggleFav(a)} aria-label="Favoritar">
                            <Star className={`h-4 w-4 transition ${a.favorite ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" : "text-muted-foreground hover:text-foreground"}`} />
                          </button>
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <div className="flex items-start gap-2">
                            {a.creativeUrl && (
                              <img src={a.creativeUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium leading-snug line-clamp-1">{a.headline}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{a.copy || "—"}</p>
                              {a.tags && a.tags.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {a.tags.map((t) => (
                                    <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="rounded-full"><Megaphone className="mr-1 h-3 w-3" />{a.platform}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="rounded-full"><Globe className="mr-1 h-3 w-3" />{a.country}</Badge></TableCell>
                        <TableCell><span className="text-sm">{a.niche}</span></TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            <Flame className="h-3 w-3" /> {a.score}
                          </span>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="rounded-full">{a.analysisType}</Badge></TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={a.source === "extension" ? "default" : a.source === "demo" ? "outline" : "secondary"} className="rounded-full">
                                {a.source}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {a.source === "demo" ? "Inserido em modo demonstração" : a.source === "extension" ? "Capturado pela extensão" : "Inserido manualmente"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                            <Button size="icon" variant="ghost" onClick={() => openExternal(a.adUrl, a.adLibraryId ? `https://www.facebook.com/ads/library/?id=${a.adLibraryId}` : null)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => onOpenChatGPT(a)} aria-label="Abrir no ChatGPT">
                                  <Bot className="h-4 w-4 text-violet-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir no ChatGPT</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => onScale(a)} aria-label="Enviar para Escalada">
                                  <Rocket className={`h-4 w-4 ${a.scaled ? "text-emerald-500" : "text-amber-500"}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{a.scaled ? "Já escalado" : "Enviar para Escalada"}</TooltipContent>
                            </Tooltip>
                            <Button size="icon" variant="ghost" onClick={() => onMarkReviewed(a)} aria-label="Marcar como revisado">
                              <CheckCircle2 className={`h-4 w-4 ${a.status === "reviewed" ? "text-emerald-500" : ""}`} />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => onDelete(a)} aria-label="Remover">
                              <Trash2 className="h-4 w-4 text-red-500/80" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ConnectionPill({ connected }: { connected: boolean | null }) {
  if (connected === null) {
    return <Badge variant="outline" className="rounded-full"><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Detectando…</Badge>;
  }
  if (connected) {
    return <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20"><Wifi className="mr-1 h-3 w-3" /> Extensão conectada</Badge>;
  }
  return <Badge variant="outline" className="rounded-full text-muted-foreground"><WifiOff className="mr-1 h-3 w-3" /> Extensão não detectada</Badge>;
}
