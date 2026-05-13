import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { extractPdfText } from "@/lib/ebook/pdf-extract";
import { extractEbookBriefingFromPdfText } from "@/lib/ebook.functions";
import type { Briefing } from "@/lib/ebook.server";

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  onReady: (briefing: Briefing, suggestedChapterCount: number) => void;
  busy?: boolean;
}

export function PdfUploadCard({ onReady, busy }: Props) {
  const { t } = useTranslation();
  const fnExtract = useServerFn(extractEbookBriefingFromPdfText);
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "parsing" | "analyzing">("idle");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(t("ebook.pdfImport.errorNotPdf"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("ebook.pdfImport.errorTooLarge"));
      return;
    }
    try {
      setStage("parsing");
      const text = await extractPdfText(file);
      if (!text || text.trim().length < 50) {
        toast.error(t("ebook.pdfImport.errorEmpty"));
        setStage("idle");
        return;
      }
      setStage("analyzing");
      const result = await fnExtract({
        data: { text, fileName: file.name },
      });
      const { suggestedChapterCount, ...briefing } = result;
      onReady(briefing as Briefing, suggestedChapterCount ?? 6);
      toast.success(t("ebook.pdfImport.success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ebook.pdfImport.errorParse"));
    } finally {
      setStage("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const working = stage !== "idle";
  const label =
    stage === "parsing"
      ? t("ebook.pdfImport.parsing")
      : stage === "analyzing"
        ? t("ebook.pdfImport.analyzing")
        : t("ebook.pdfImport.selectFile");

  return (
    <Card className="flex flex-col border-primary/30">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileUp className="h-5 w-5 text-primary" />
        </div>
        <CardTitle>{t("ebook.pdfImport.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("ebook.pdfImport.description")}</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !working && !busy && inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center text-xs transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border/60"
          } ${working || busy ? "pointer-events-none opacity-60" : "hover:border-primary/60"}`}
        >
          {t("ebook.pdfImport.dropHere")}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button
          disabled={working || busy}
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}