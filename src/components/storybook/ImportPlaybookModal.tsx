import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { importPlaybookFn } from "@/lib/storybook-enhancements.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onImported: (count: number) => void;
};

type DetectedChapter = { title: string; body: string };

export function ImportPlaybookModal({ open, onClose, projectId, onImported }: Props) {
  const importFn = useServerFn(importPlaybookFn);
  const [text, setText] = useState("");
  const [format, setFormat] = useState("markdown");
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<DetectedChapter[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleImport = async () => {
    if (!text.trim()) { toast.error("Cole o texto do playbook."); return; }
    setRunning(true);
    setPreview(null);
    try {
      const result = await importFn({ data: { id: projectId, text, format } });
      setPreview(result.chapters as DetectedChapter[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setRunning(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirmed(true);
    onImported(preview.length);
    toast.success(`${preview.length} capítulos importados com sucesso!`);
    onClose();
    setText("");
    setPreview(null);
    setConfirmed(false);
  };

  const handleClose = () => {
    if (!running) {
      setText("");
      setPreview(null);
      setConfirmed(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-primary/20 bg-[#080e1a]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #E8623A, #a855f7)" }}>
              <Upload className="h-4 w-4 text-white" />
            </span>
            <div>
              <div className="text-base font-bold">Importar Playbook</div>
              <div className="text-xs font-normal text-slate-400">Cole seu texto — a IA divide em capítulos automaticamente</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!preview ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Formato do texto</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0d1627]">
                    {[
                      { id: "markdown", label: "Markdown (# Títulos)" },
                      { id: "text", label: "Texto Simples" },
                      { id: "bullets", label: "Tópicos / Bullet Points" },
                      { id: "numbered", label: "Lista Numerada" },
                    ].map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-slate-200">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">Cole o conteúdo do seu playbook</Label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Cole aqui seu playbook, capítulos, roteiro ou qualquer texto estruturado...\n\nExemplo:\n# Capítulo 1: O Início\nConteúdo do primeiro capítulo...\n\n# Capítulo 2: A Transformação\nConteúdo do segundo capítulo...`}
                  rows={12}
                  className="border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">{text.length.toLocaleString("pt-BR")} caracteres · ~{Math.round(text.split(/\s+/).filter(Boolean).length / 200)} páginas</p>
              </div>

              <Button
                onClick={handleImport}
                disabled={running || !text.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-purple-600 text-white hover:from-orange-500 hover:to-purple-500"
              >
                {running ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Dividindo em capítulos…</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Importar com IA</>
                )}
              </Button>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">
                  <strong>{preview.length} capítulos detectados</strong> — revise abaixo antes de confirmar
                </span>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {preview.map((ch, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "rgba(232,98,58,0.15)", color: "#E8623A" }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{ch.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{ch.body.slice(0, 120)}…</p>
                      <p className="mt-1 text-[10px] text-slate-500">{ch.body.split(/\s+/).filter(Boolean).length} palavras</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-slate-500">
                ⚠️ Esta ação substituirá os capítulos atuais. Os textos originais são preservados.
              </p>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPreview(null)} className="flex-1 text-slate-400">
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Reeditar texto
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={confirmed}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-purple-600 text-white"
                >
                  {confirmed ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Confirmar Importação
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
