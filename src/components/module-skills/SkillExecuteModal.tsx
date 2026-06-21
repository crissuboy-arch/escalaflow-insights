import { useState } from "react";
import { marked } from "marked";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap, Copy, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export type InputField = {
  key: string;
  label: string;
  type: "text" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
};

export type ModuleSkill = {
  id: string;
  module_key: string;
  skill_id: string;
  skill_name: string;
  input_schema: InputField[];
  output_schema: { key: string; label: string }[];
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  skill: ModuleSkill;
};

export function SkillExecuteModal({ open, onClose, skill }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultHtml, setResultHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const fields: InputField[] = Array.isArray(skill.input_schema) ? skill.input_schema : [];

  const handleChange = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const handleExecute = async () => {
    setRunning(true);
    setResult(null);
    setResultHtml("");
    try {
      const res = await fetch("/api/execute-skill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module_key: skill.module_key, inputs: values }),
      });
      const data = (await res.json()) as { ok: boolean; result?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Erro desconhecido");
      const text = data.result ?? "";
      setResult(text);
      const html = await Promise.resolve(marked.parse(text));
      setResultHtml(typeof html === "string" ? html : String(html));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao executar skill");
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      toast.success("Copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${skill.skill_id || skill.module_key}-resultado.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (!running) {
      setValues({});
      setResult(null);
      setResultHtml("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-blue-500/20 bg-[#080e1a] backdrop-blur-xl shadow-[0_0_60px_rgba(0,119,255,0.15)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_16px_rgba(99,102,241,0.5)]">
              <Zap className="h-4 w-4 text-white" />
            </span>
            <div>
              <div className="text-base font-bold">{skill.skill_name}</div>
              <div className="text-xs font-normal text-slate-400">Skill IA — {skill.module_key.replace(/_/g, " ")}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-sm text-slate-300">{f.label}</Label>
              {f.type === "select" ? (
                <Select value={values[f.key] ?? ""} onValueChange={(v) => handleChange(f.key, v)}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-white focus:border-blue-500/50">
                    <SelectValue placeholder={`Selecione ${f.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0d1627]">
                    {(f.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-slate-200 focus:bg-blue-500/20">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={4}
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-blue-500/50"
                />
              ) : (
                <Input
                  value={values[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-blue-500/50"
                />
              )}
            </div>
          ))}

          <Button
            onClick={handleExecute}
            disabled={running}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:from-blue-500 hover:to-purple-500 hover:shadow-[0_0_28px_rgba(99,102,241,0.5)] transition-all"
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando skill IA…
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Executar Skill IA
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  ✓ Resultado gerado
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-slate-400 hover:text-white">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 px-2 text-slate-400 hover:text-white">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div
                className="skill-result rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: resultHtml }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
