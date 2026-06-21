import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, Copy, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { publishStorybookFn } from "@/lib/storybook-enhancements.functions";

type CheckItem = {
  key: string;
  label: string;
  pass: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  story: Record<string, unknown>;
  projectTitle: string;
};

export function PublishModal({ open, onClose, projectId, story, projectTitle }: Props) {
  const publishFn = useServerFn(publishStorybookFn);
  const [customSlug, setCustomSlug] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const planning = (story.planning ?? {}) as Record<string, unknown>;
  const chapters = (story.chapters ?? []) as Array<{ body?: string; title?: string }>;
  const chapsWithText = chapters.filter((c) => c.body && c.body.trim());

  const checks: CheckItem[] = [
    { key: "title",    label: "Título do AnimaBook",            pass: !!(planning.title || projectTitle) },
    { key: "chapters", label: `Mínimo 1 capítulo com conteúdo (${chapsWithText.length})`, pass: chapsWithText.length > 0 },
    { key: "author",   label: "Autor definido",                  pass: !!planning.author },
  ];
  const allPass = checks.every((c) => c.pass);

  const handlePublish = async () => {
    if (!allPass) { toast.error("Corrija os itens marcados antes de publicar."); return; }
    setPublishing(true);
    try {
      const { slug } = await publishFn({ data: { id: projectId, customSlug: customSlug.trim() || undefined } });
      setPublishedSlug(slug);
      toast.success("AnimaBook publicado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar");
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = publishedSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/story/${publishedSlug}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    if (!publishing) {
      setCustomSlug("");
      if (!publishedSlug) onClose();
      else { setPublishedSlug(null); onClose(); }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-primary/20 bg-[#080e1a]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #3b82f6, #a855f7)" }}>
              <Globe className="h-4 w-4 text-white" />
            </span>
            <div>
              <div className="text-base font-bold">Publicar AnimaBook</div>
              <div className="text-xs font-normal text-slate-400">Gera um link público real com visualização animada</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {!publishedSlug ? (
            <>
              {/* Checklist */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-400">Verificação antes de publicar</Label>
                {checks.map((c) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5"
                  >
                    {c.pass
                      ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                      : <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    }
                    <span className={`text-sm ${c.pass ? "text-slate-300" : "text-red-300"}`}>{c.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Slug personalizado */}
              <div className="space-y-1.5">
                <Label className="text-slate-300">Slug personalizado <span className="text-slate-500">(opcional)</span></Label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-slate-500">/story/</span>
                  <Input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="meu-playbook-incrivel"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  />
                </div>
                <p className="text-xs text-slate-500">Deixe em branco para gerar automaticamente a partir do título.</p>
              </div>

              <Button
                onClick={handlePublish}
                disabled={publishing || !allPass}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                {publishing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publicando…</>
                ) : (
                  <><Globe className="mr-2 h-4 w-4" />Publicar AnimaBook</>
                )}
              </Button>

              {!allPass && (
                <p className="text-center text-xs text-red-400">
                  Corrija os itens em vermelho antes de publicar.
                </p>
              )}
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                <p className="font-semibold text-emerald-300">AnimaBook publicado!</p>
                <p className="mt-1 text-xs text-slate-400">Seu link público está pronto e funcionando.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">Link público</Label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
                  <span className="flex-1 truncate font-mono text-sm text-blue-300">{publicUrl}</span>
                  <button onClick={handleCopy} className="flex-shrink-0 text-slate-400 hover:text-white">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-slate-300" onClick={handleCopy}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar Link
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  onClick={() => window.open(publicUrl, "_blank")}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
