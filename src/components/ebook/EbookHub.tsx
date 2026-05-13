import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Flame, BookOpen, Sparkles } from "lucide-react";
import { EBOOK_CATEGORIES, type EbookCategory } from "@/lib/ebook/styles";
import { PdfUploadCard } from "./PdfUploadCard";
import type { Briefing } from "@/lib/ebook.server";

export interface AiKickstart {
  niche: string;
  promise: string;
  audience: string;
  style: string;
  chapterCount: number;
  language: string;
}

interface Props {
  onUseMined: () => void;
  onScratch: (category: EbookCategory) => void;
  onAiGenerate: (input: AiKickstart) => void;
  onPdfImport: (briefing: Briefing, suggestedChapterCount: number) => void;
  busy?: boolean;
}

export function EbookHub({ onUseMined, onScratch, onAiGenerate, onPdfImport, busy }: Props) {
  const [category, setCategory] = useState<EbookCategory>("Amazon/KDP");
  const [ai, setAi] = useState<AiKickstart>({
    niche: "",
    promise: "",
    audience: "",
    style: "Direto e prático",
    chapterCount: 6,
    language: "Português",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {/* Card 1 */}
      <Card className="flex flex-col border-primary/30">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Criar Ebook com Oferta Minerada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Transforme um anúncio validado da sua mineração em ebook pronto para vender. A IA extrai
            briefing, estrutura e copy.
          </p>
          <Button onClick={onUseMined} disabled={busy} className="w-full">
            Usar anúncio minerado
          </Button>
        </CardContent>
      </Card>

      {/* Card 2 */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Criar Ebook do Zero</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Escolha uma categoria base:</p>
            <div className="flex flex-wrap gap-1.5">
              {EBOOK_CATEGORIES.map((c) => (
                <Badge
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  onClick={() => setCategory(c)}
                  className="cursor-pointer"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            onClick={() => onScratch(category)}
            disabled={busy}
            variant="secondary"
            className="w-full"
          >
            Começar do Zero
          </Button>
        </CardContent>
      </Card>

      {/* Card 3 */}
      <Card className="flex flex-col border-primary/30">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Criar Ebook com IA</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nicho</Label>
              <Input value={ai.niche} onChange={(e) => setAi({ ...ai, niche: e.target.value })} placeholder="Ex: emagrecimento" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Promessa</Label>
              <Textarea rows={2} value={ai.promise} onChange={(e) => setAi({ ...ai, promise: e.target.value })} placeholder="Resultado principal" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Público</Label>
              <Input value={ai.audience} onChange={(e) => setAi({ ...ai, audience: e.target.value })} placeholder="Ex: mulheres 30-45" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estilo</Label>
              <Input value={ai.style} onChange={(e) => setAi({ ...ai, style: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Capítulos</Label>
              <Input type="number" min={3} max={15} value={ai.chapterCount} onChange={(e) => setAi({ ...ai, chapterCount: Math.max(3, Math.min(15, Number(e.target.value) || 6)) })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Idioma</Label>
              <Input value={ai.language} onChange={(e) => setAi({ ...ai, language: e.target.value })} />
            </div>
          </div>
          <Button
            onClick={() => onAiGenerate(ai)}
            disabled={busy || !ai.niche || !ai.promise}
            className="mt-2 w-full"
          >
            Gerar Estrutura IA
          </Button>
        </CardContent>
      </Card>

      {/* Card 4 - PDF Import */}
      <PdfUploadCard onReady={onPdfImport} busy={busy} />
    </motion.div>
  );
}