import type { PlaybookSceneIn } from "./pdf";

const W = 1080;
const H = 1350;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width <= maxWidth) cur = t;
      else { if (cur) out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}

async function loadImg(url: string): Promise<ImageBitmap | HTMLImageElement | null> {
  // Try fetch + createImageBitmap (handles CORS/blob safely)
  try {
    const r = await fetch(url, { mode: "cors" });
    if (r.ok) {
      const blob = await r.blob();
      return await createImageBitmap(blob);
    }
  } catch {
    /* fallthrough */
  }
  // Fallback to Image element with crossOrigin (works for data: URLs)
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });
}

async function renderScene(scene: PlaybookSceneIn, idx: number, total: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // Background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#241344");
  g.addColorStop(1, "#0e1530");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Image
  if (scene.image_url) {
    const img = await loadImg(scene.image_url);
    if (img) {
      const ratio = img.height / img.width;
      const imgH = Math.min(W * ratio, 700);
      ctx.drawImage(img, 0, 0, W, imgH);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, imgH - 80, W, 80);
    }
  }

  // Header tag
  ctx.fillStyle = "#a78bfa";
  ctx.font = "600 28px 'Helvetica', sans-serif";
  ctx.fillText(`CENA ${idx + 1} / ${total}`, 60, 770);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 64px 'Helvetica', sans-serif";
  const titleLines = wrapText(ctx, scene.title, W - 120);
  let y = 830;
  for (const l of titleLines.slice(0, 3)) { ctx.fillText(l, 60, y); y += 72; }

  // Body
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "400 28px 'Helvetica', sans-serif";
  const bodyLines = wrapText(ctx, scene.text, W - 120);
  y += 12;
  for (const l of bodyLines.slice(0, 9)) { ctx.fillText(l, 60, y); y += 38; if (y > H - 80) break; }

  // Footer accent
  ctx.fillStyle = "#facc15";
  ctx.fillRect(60, H - 20, 80, 6);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

export async function exportPlaybookCarousel(title: string, scenes: PlaybookSceneIn[]) {
  for (let i = 0; i < scenes.length; i++) {
    const blob = await renderScene(scenes[i], i, scenes.length);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-cena-${String(i + 1).padStart(2, "0")}.png`;
    a.click();
    URL.revokeObjectURL(url);
    await new Promise((r) => setTimeout(r, 80));
  }
}