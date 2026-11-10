// Viral Remix Studio (Fases 3-4). Upload de vídeo próprio/licenciado,
// análise manual (gancho/estrutura/ritmo/CTA), editor de roteiro, divisão em
// clipes de 8s e prompts para o Google Flow — tudo manual, sem API de IA
// externa (Fase 6 fica para depois).
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, Copy, CopyCheck, Scissors, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  extractVideoMetadata,
  uploadVideoToStorage,
  getViralMediaSignedUrl,
} from "@/lib/facebook-viral/video-upload";
import { getViralReel } from "@/lib/facebook-viral.functions";
import {
  listViralVideos,
  createViralVideo,
  saveViralAnalysis,
  getViralAnalysis,
  listViralAvatars,
  saveViralAvatar,
  saveViralScript,
  listViralScripts,
  generateClipsForScript,
  listScriptClips,
  updateScriptClip,
  type ViralVideoRow,
  type ViralAvatarRow,
  type ViralScriptClipRow,
} from "@/lib/viral-remix.functions";

export const Route = createFileRoute("/_authenticated/facebook-viral/$reelId/remix")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: RemixStudioPage,
});

function RemixStudioPage() {
  const { reelId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getReel = useServerFn(getViralReel);
  const listVideos = useServerFn(listViralVideos);
  const createVideo = useServerFn(createViralVideo);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reelQ = useQuery({
    queryKey: ["facebook-viral", "reel", reelId],
    queryFn: () => getReel({ data: { id: reelId } }),
  });

  const videosQ = useQuery({
    queryKey: ["facebook-viral", "videos", reelId],
    queryFn: () => listVideos({ data: { viralReelId: reelId } }),
  });
  const videos = useMemo(() => (videosQ.data ?? []) as ViralVideoRow[], [videosQ.data]);

  useEffect(() => {
    if (!selectedVideoId && videos.length > 0) setSelectedVideoId(videos[0].id);
  }, [videos, selectedVideoId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setUploadError("Sessão inválida.");
        return;
      }

      const metadata = await extractVideoMetadata(file);
      if (!metadata.ok) {
        setUploadError(metadata.error);
        return;
      }

      const uploaded = await uploadVideoToStorage(userId, file, metadata.thumbnailBlob);
      if (!uploaded.ok) {
        setUploadError(uploaded.error);
        return;
      }

      const uploadSource = window.confirm(
        "Este vídeo é teu (próprio)? Clica Cancelar se for conteúdo licenciado de terceiro.",
      )
        ? "own"
        : "licensed";
      let licenseNote: string | undefined;
      if (uploadSource === "licensed") {
        licenseNote =
          window.prompt("Nota de licença (obrigatória para conteúdo licenciado):") ?? undefined;
        if (!licenseNote?.trim()) {
          setUploadError("Vídeo licenciado precisa de uma nota de licença.");
          return;
        }
      }

      const result = await createVideo({
        data: {
          storagePath: uploaded.storagePath,
          thumbnailPath: uploaded.thumbnailPath || undefined,
          viralReelId: reelId,
          uploadSource,
          licenseNote,
          durationSeconds: metadata.durationSeconds,
          width: metadata.width,
          height: metadata.height,
        },
      });
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      setSelectedVideoId(result.video.id);
      queryClient.invalidateQueries({ queryKey: ["facebook-viral", "videos", reelId] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const reel = reelQ.data;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/facebook-viral" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Viral Remix Studio</h1>
      </div>

      {reel ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-1.5">
              <Film className="h-4 w-4 text-muted-foreground" />
              <a
                href={reel.reel_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {reel.reel_url}
              </a>
            </div>
            {reel.product_promoted ? (
              <p className="text-xs text-muted-foreground">Produto: {reel.product_promoted}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Vídeo próprio ou licenciado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Nunca o Reel de terceiro em si — isso seria download não autorizado. Carrega o teu
            próprio vídeo (ou conteúdo licenciado, com nota de licença) para a análise e remix.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
            id="viral-video-upload"
          />
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Carregar MP4/MOV
          </Button>
          {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}

          {videos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {videos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVideoId(v.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    selectedVideoId === v.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {v.upload_source === "licensed" ? "Licenciado" : "Próprio"} ·{" "}
                  {v.duration_seconds ? `${Math.round(v.duration_seconds)}s` : "?"} · {v.width}×
                  {v.height}
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedVideoId ? <AnalysisAndScript videoId={selectedVideoId} reelId={reelId} /> : null}
    </div>
  );
}

// ── 2. Análise manual + roteiro + clipes ─────────────────────────────────

function AnalysisAndScript({ videoId, reelId }: { videoId: string; reelId: string }) {
  const getAnalysis = useServerFn(getViralAnalysis);
  const saveAnalysis = useServerFn(saveViralAnalysis);
  const listAvatars = useServerFn(listViralAvatars);
  const createAvatar = useServerFn(saveViralAvatar);
  const saveScript = useServerFn(saveViralScript);
  const listScripts = useServerFn(listViralScripts);
  const generateClips = useServerFn(generateClipsForScript);
  const listClips = useServerFn(listScriptClips);
  const updateClip = useServerFn(updateScriptClip);
  const queryClient = useQueryClient();

  const [hookText, setHookText] = useState("");
  const [pacingNotes, setPacingNotes] = useState("");
  const [ctaNotes, setCtaNotes] = useState("");
  const [whyItWorks, setWhyItWorks] = useState("");
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  const [scriptId, setScriptId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [savedScriptText, setSavedScriptText] = useState("");
  const [language, setLanguage] = useState<"en-US" | "es">("en-US");
  const [avatarId, setAvatarId] = useState<string>("");
  const [newAvatarName, setNewAvatarName] = useState("");
  const [savingScript, setSavingScript] = useState(false);
  const [restoredExisting, setRestoredExisting] = useState(false);

  const analysisQ = useQuery({
    queryKey: ["facebook-viral", "analysis", videoId],
    queryFn: () => getAnalysis({ data: { viralVideoId: videoId } }),
  });

  useEffect(() => {
    if (analysisQ.data) {
      setHookText(analysisQ.data.hook_text ?? "");
      setPacingNotes(analysisQ.data.pacing_notes ?? "");
      setCtaNotes(analysisQ.data.cta_notes ?? "");
      setWhyItWorks(analysisQ.data.why_it_works ?? "");
    }
  }, [analysisQ.data]);

  // Reopens the script already saved for this video's analysis (if any) —
  // without this, refreshing the page loses the script even though it's
  // still in the DB, since scriptId only gets set after a save in-session.
  const scriptsQ = useQuery({
    queryKey: ["facebook-viral", "scripts"],
    queryFn: () => listScripts(),
    enabled: !!analysisQ.data?.id,
  });

  useEffect(() => {
    if (restoredExisting || !analysisQ.data?.id || !scriptsQ.data) return;
    const existing = scriptsQ.data.find((s) => s.viral_analysis_id === analysisQ.data!.id);
    if (existing) {
      setScriptId(existing.id);
      setScriptText(existing.script_text);
      setSavedScriptText(existing.script_text);
      setLanguage(existing.language);
      setAvatarId(existing.viral_avatar_id ?? "");
    }
    setRestoredExisting(true);
  }, [restoredExisting, analysisQ.data, scriptsQ.data]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (scriptText !== savedScriptText) e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [scriptText, savedScriptText]);

  const avatarsQ = useQuery({
    queryKey: ["facebook-viral", "avatars"],
    queryFn: () => listAvatars(),
  });
  const avatars = (avatarsQ.data ?? []) as ViralAvatarRow[];

  const clipsQ = useQuery({
    queryKey: ["facebook-viral", "clips", scriptId],
    queryFn: () =>
      scriptId ? listClips({ data: { viralScriptId: scriptId } }) : Promise.resolve([]),
    enabled: !!scriptId,
  });
  const clips = (clipsQ.data ?? []) as ViralScriptClipRow[];

  async function handleSaveAnalysis() {
    setSavingAnalysis(true);
    try {
      const result = await saveAnalysis({
        data: { viralVideoId: videoId, hookText, pacingNotes, ctaNotes, whyItWorks },
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível guardar a análise.");
        return;
      }
      toast.success("Análise guardada.");
      queryClient.invalidateQueries({ queryKey: ["facebook-viral", "analysis", videoId] });
    } finally {
      setSavingAnalysis(false);
    }
  }

  async function handleCreateAvatar() {
    if (!newAvatarName.trim()) return;
    const result = await createAvatar({ data: { name: newAvatarName } });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar o avatar.");
      return;
    }
    setAvatarId(result.avatar.id);
    setNewAvatarName("");
    toast.success("Avatar criado.");
    queryClient.invalidateQueries({ queryKey: ["facebook-viral", "avatars"] });
  }

  async function handleSaveScript() {
    setSavingScript(true);
    try {
      const result = await saveScript({
        data: {
          id: scriptId ?? undefined,
          viralAnalysisId: analysisQ.data?.id,
          viralAvatarId: avatarId || undefined,
          language,
          scriptText,
        },
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível guardar o roteiro.");
        return;
      }
      setScriptId(result.script.id);
      setSavedScriptText(scriptText);
      toast.success("Roteiro guardado.");
    } finally {
      setSavingScript(false);
    }
  }

  async function handleGenerateClips() {
    if (!scriptId) return;
    const result = await generateClips({ data: { viralScriptId: scriptId } });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível dividir o roteiro em clipes.");
      return;
    }
    toast.success(`${result.clips.length} clipes gerados.`);
    queryClient.invalidateQueries({ queryKey: ["facebook-viral", "clips", scriptId] });
  }

  async function handleUpdateClip(
    id: string,
    patch: { promptText?: string; flowVideoUrl?: string; status?: "draft" | "copied" | "imported" },
  ) {
    await updateClip({ data: { id, ...patch } });
    queryClient.invalidateQueries({ queryKey: ["facebook-viral", "clips", scriptId] });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Análise (gancho, estrutura, ritmo, CTA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Preenchido por ti ao assistir ao vídeo — sem análise automática nesta fase.
          </p>
          <LabeledTextarea
            label="Gancho (primeiros 3 segundos)"
            value={hookText}
            onChange={setHookText}
          />
          <LabeledTextarea
            label="Ritmo / estrutura narrativa"
            value={pacingNotes}
            onChange={setPacingNotes}
          />
          <LabeledTextarea label="CTA" value={ctaNotes} onChange={setCtaNotes} />
          <LabeledTextarea label="Por que funciona" value={whyItWorks} onChange={setWhyItWorks} />
          <Button onClick={handleSaveAnalysis} disabled={savingAnalysis}>
            {savingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar análise
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Roteiro original</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Idioma</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en-US" | "es")}
              >
                <option value="en-US">Inglês (EUA)</option>
                <option value="es">Espanhol</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Avatar</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={avatarId}
                onChange={(e) => setAvatarId(e.target.value)}
              >
                <option value="">Sem avatar</option>
                {avatars.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do novo avatar"
              value={newAvatarName}
              onChange={(e) => setNewAvatarName(e.target.value)}
            />
            <Button variant="outline" onClick={handleCreateAvatar}>
              Criar avatar
            </Button>
          </div>
          <Textarea
            placeholder="Escreve o roteiro original aqui…"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            rows={6}
          />
          <div className="flex gap-2">
            <Button onClick={handleSaveScript} disabled={savingScript}>
              {savingScript ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar roteiro
            </Button>
            <Button variant="outline" onClick={handleGenerateClips} disabled={!scriptId}>
              <Scissors className="mr-2 h-4 w-4" />
              Dividir em clipes de 8s
            </Button>
          </div>
        </CardContent>
      </Card>

      {clips.length > 0 ? <ClipsPanel clips={clips} onUpdate={handleUpdateClip} /> : null}
    </>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
    </div>
  );
}

// ── 4. Clipes + prompts Google Flow ──────────────────────────────────────

function ClipsPanel({
  clips,
  onUpdate,
}: {
  clips: ViralScriptClipRow[];
  onUpdate: (
    id: string,
    patch: { promptText?: string; flowVideoUrl?: string; status?: "draft" | "copied" | "imported" },
  ) => void;
}) {
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyAll() {
    const text = clips
      .map((c) => `Clipe ${c.clip_index + 1} (9:16, 8s):\n${c.prompt_text}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">4. Clipes e prompts para o Google Flow</CardTitle>
        <Button variant="outline" size="sm" onClick={copyAll}>
          {copiedAll ? <CopyCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copiar todos
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {clips.map((clip) => (
          <ClipRow key={clip.id} clip={clip} onUpdate={onUpdate} />
        ))}
      </CardContent>
    </Card>
  );
}

function ClipRow({
  clip,
  onUpdate,
}: {
  clip: ViralScriptClipRow;
  onUpdate: (
    id: string,
    patch: { promptText?: string; flowVideoUrl?: string; status?: "draft" | "copied" | "imported" },
  ) => void;
}) {
  const [promptText, setPromptText] = useState(clip.prompt_text);
  const [flowVideoUrl, setFlowVideoUrl] = useState(clip.flow_video_url ?? "");
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    onUpdate(clip.id, { status: "copied" });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline">
          Clipe {clip.clip_index + 1} · {clip.duration_seconds}s · {clip.aspect_ratio}
        </Badge>
        <Badge variant={clip.status === "imported" ? "default" : "secondary"}>{clip.status}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{clip.clip_text}</p>
      <Textarea
        placeholder="Prompt para o Google Flow (escreve/edita manualmente)…"
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        onBlur={() => onUpdate(clip.id, { promptText })}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={copyPrompt}>
          {copied ? <CopyCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copiar prompt
        </Button>
        <Input
          placeholder="URL do MP4 produzido no Flow (importar manualmente)"
          value={flowVideoUrl}
          onChange={(e) => setFlowVideoUrl(e.target.value)}
          onBlur={() =>
            onUpdate(clip.id, {
              flowVideoUrl,
              status: flowVideoUrl.trim() ? "imported" : clip.status,
            })
          }
          className="max-w-xs"
        />
      </div>
    </div>
  );
}
