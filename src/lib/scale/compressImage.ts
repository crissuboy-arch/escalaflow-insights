export type CompressResult = {
  dataUrl: string;
  originalSize: number;
  finalSize: number;
  mime: string;
  width: number;
  height: number;
};

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_INPUT = 25 * 1024 * 1024; // 25MB
const TARGET_BYTES = 2 * 1024 * 1024; // ~2MB
const HARD_MAX_OUTPUT = 8 * 1024 * 1024; // reject if still too big

function supportsWebP(): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function loadBitmap(file: File): Promise<{ bitmap: ImageBitmap | HTMLImageElement; width: number; height: number; }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { bitmap: bmp, width: bmp.width, height: bmp.height };
    } catch {
      /* fallback */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("decode_failed"));
      i.src = url;
    });
    return { bitmap: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function targetDimensions(w: number, h: number): { tw: number; th: number } {
  const ratio = Math.max(w, h) / Math.min(w, h);
  // Tall scroll screenshot: keep more vertical detail
  if (h > w && ratio > 3) {
    const tw = Math.min(w, 1080);
    const scale = tw / w;
    const th = Math.min(Math.round(h * scale), 6000);
    return { tw, th };
  }
  // Default: longest side <= 2000
  const longest = Math.max(w, h);
  if (longest <= 2000) return { tw: w, th: h };
  const scale = 2000 / longest;
  return { tw: Math.round(w * scale), th: Math.round(h * scale) };
}

async function encode(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<string> {
  return canvas.toDataURL(mime, quality);
}

export async function compressImage(file: File, opts?: { maxBytes?: number }): Promise<CompressResult> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("unsupported_format");
  }
  if (file.size > MAX_INPUT) {
    throw new Error("too_large");
  }

  const { bitmap, width, height } = await loadBitmap(file);
  const { tw, th } = targetDimensions(width, height);

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("decode_failed");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, tw, th);

  const useWebP = supportsWebP();
  const mime = useWebP ? "image/webp" : "image/jpeg";
  const qualities = useWebP ? [0.82, 0.7, 0.6, 0.5] : [0.8, 0.7, 0.6, 0.5];
  const target = opts?.maxBytes ?? TARGET_BYTES;

  let best = "";
  for (const q of qualities) {
    best = await encode(canvas, mime, q);
    if (dataUrlBytes(best) <= target) break;
  }

  const finalSize = dataUrlBytes(best);
  if (finalSize > HARD_MAX_OUTPUT) {
    throw new Error("still_too_large");
  }

  return {
    dataUrl: best,
    originalSize: file.size,
    finalSize,
    mime,
    width: tw,
    height: th,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const ACCEPTED_MIME = ACCEPTED.join(",");