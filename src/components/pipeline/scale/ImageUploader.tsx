import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MIME, compressImage, formatBytes } from "@/lib/scale/compressImage";

type Item = {
  id: string;
  dataUrl: string;
  name: string;
  originalSize: number;
  finalSize: number;
  status: "processing" | "ready" | "error";
  error?: string;
};

export function ImageUploader({
  value,
  onChange,
  maxFiles = 6,
  label,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>(() =>
    value.map((u, i) => ({
      id: `init-${i}`,
      dataUrl: u,
      name: `imagem-${i + 1}`,
      originalSize: 0,
      finalSize: 0,
      status: "ready" as const,
    })),
  );
  const [dragOver, setDragOver] = useState(false);

  // Sync upward when items change
  const lastEmitted = useRef<string>("");
  useEffect(() => {
    const ready = items.filter((it) => it.status === "ready").map((it) => it.dataUrl);
    const key = ready.join("|");
    if (key !== lastEmitted.current) {
      lastEmitted.current = key;
      onChange(ready);
    }
  }, [items, onChange]);

  // If parent resets value to empty externally, clear items
  useEffect(() => {
    if (value.length === 0 && items.some((i) => i.status === "ready")) {
      setItems([]);
      lastEmitted.current = "";
    }
  }, [value, items]);

  const processFiles = useCallback(
    async (files: File[]) => {
      const remaining = maxFiles - items.length;
      if (remaining <= 0) {
        toast.error(`Máximo de ${maxFiles} imagens atingido.`);
        return;
      }
      const accepted = files.slice(0, remaining);
      if (files.length > remaining) {
        toast.warning(`Apenas ${remaining} imagem(ns) adicionada(s) (limite ${maxFiles}).`);
      }

      const pending: Item[] = accepted.map((f) => ({
        id: `${Date.now()}-${Math.random()}`,
        dataUrl: "",
        name: f.name,
        originalSize: f.size,
        finalSize: 0,
        status: "processing" as const,
      }));
      setItems((cur) => [...cur, ...pending]);

      for (let i = 0; i < accepted.length; i++) {
        const f = accepted[i];
        const id = pending[i].id;
        try {
          if (f.size > 25 * 1024 * 1024) {
            toast("Sua imagem está muito pesada. Compactamos automaticamente para continuar.");
          }
          const res = await compressImage(f);
          setItems((cur) =>
            cur.map((it) =>
              it.id === id
                ? { ...it, dataUrl: res.dataUrl, finalSize: res.finalSize, status: "ready" }
                : it,
            ),
          );
          if (f.size > 1.5 * 1024 * 1024) {
            toast.success(`Otimizada: ${formatBytes(f.size)} → ${formatBytes(res.finalSize)}`);
          }
        } catch (err) {
          const code = err instanceof Error ? err.message : "fail";
          const msg =
            code === "too_large"
              ? "Imagem muito grande (>25MB). Tente um print menor."
              : code === "unsupported_format"
                ? "Formato não suportado. Use PNG, JPG ou WEBP."
                : code === "still_too_large"
                  ? "Imagem ainda muito pesada após compressão. Tente reduzir antes."
                  : "Não consegui ler essa imagem. Tente outra.";
          toast.error(msg);
          setItems((cur) =>
            cur.map((it) => (it.id === id ? { ...it, status: "error", error: msg } : it)),
          );
          // Remove failed item after a beat
          setTimeout(() => {
            setItems((cur) => cur.filter((it) => it.id !== id));
          }, 1500);
        }
      }
    },
    [items.length, maxFiles],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) void processFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) void processFiles(files);
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      void processFiles(files);
    }
  }

  function remove(id: string) {
    setItems((cur) => cur.filter((it) => it.id !== id));
  }

  const canAdd = items.length < maxFiles;

  return (
    <div className="space-y-2" onPaste={onPaste}>
      {label && <p className="text-xs uppercase text-muted-foreground">{label}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (canAdd) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border/60"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME}
            multiple={maxFiles > 1}
            hidden
            onChange={onPick}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={!canAdd}
          >
            <Upload className="mr-2 h-4 w-4" /> Selecionar
          </Button>
          <span className="text-xs text-muted-foreground">
            {canAdd
              ? `Arraste, cole (Ctrl+V) ou clique · PNG / JPG / WEBP · até 25MB · ${items.length}/${maxFiles}`
              : `Limite de ${maxFiles} atingido`}
          </span>
        </div>

        {items.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="relative overflow-hidden rounded-md border border-border/60 bg-muted/30"
              >
                <div className="flex aspect-video items-center justify-center bg-muted/50">
                  {it.status === "processing" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : it.status === "error" ? (
                    <ImageIcon className="h-5 w-5 text-destructive" />
                  ) : (
                    <img src={it.dataUrl} alt={it.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="px-2 py-1">
                  <p className="truncate text-[10px] text-muted-foreground" title={it.name}>
                    {it.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {it.status === "processing"
                      ? "comprimindo..."
                      : it.status === "error"
                        ? it.error || "erro"
                        : it.originalSize > 0 && it.originalSize !== it.finalSize
                          ? `${formatBytes(it.originalSize)} → ${formatBytes(it.finalSize)}`
                          : formatBytes(it.finalSize || it.originalSize)}
                  </p>
                </div>
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                  onClick={() => remove(it.id)}
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}