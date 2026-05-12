import type { ProductIdentity } from "./niches";

export interface EbookHtmlInput {
  title: string;
  subtitle?: string | null;
  identity?: ProductIdentity;
  coverUrl?: string | null;
  chapters: { title: string; markdown: string; imageUrl?: string | null }[];
  introduction?: string;
  conclusion?: string;
  bonus?: string;
  aboutAuthor?: string;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function md(s: string): string {
  // very small markdown → html
  const lines = s.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let inList = false;
  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flushList();
      continue;
    }
    if (l.startsWith("### ")) {
      flushList();
      out.push(`<h3>${esc(l.slice(4))}</h3>`);
    } else if (l.startsWith("## ")) {
      flushList();
      out.push(`<h2>${esc(l.slice(3))}</h2>`);
    } else if (l.startsWith("# ")) {
      flushList();
      out.push(`<h1>${esc(l.slice(2))}</h1>`);
    } else if (/^\s*[-*]\s+/.test(l)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${esc(l.replace(/^\s*[-*]\s+/, ""))}</li>`);
    } else {
      flushList();
      let p = esc(l);
      p = p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      p = p.replace(/\*(.+?)\*/g, "<em>$1</em>");
      out.push(`<p>${p}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

export function exportEbookHtml(input: EbookHtmlInput): Blob {
  const id = input.identity ?? {};
  const css = `
:root { --bg:#0b0b0e; --fg:#1a1a1f; --muted:#666; --accent:#9b7a3a; }
* { box-sizing: border-box; }
body { margin:0; font-family: Georgia, "Times New Roman", serif; color: var(--fg); background:#fafaf7; }
main { max-width: 760px; margin: 0 auto; padding: 48px 24px 96px; }
.cover { background: var(--bg); color:#fff; min-height: 80vh; display:flex; flex-direction:column; justify-content:center; padding: 48px; text-align:center; }
.cover h1 { font-size: 48px; margin: 0 0 12px; }
.cover p { color:#d4c79a; font-size: 18px; }
.cover img { max-width: 280px; margin: 24px auto 0; border-radius: 8px; }
h1, h2, h3 { color: var(--fg); }
h1 { font-size: 32px; margin-top: 56px; }
h2 { font-size: 22px; color: var(--accent); margin-top: 32px; }
h3 { font-size: 17px; }
p { line-height: 1.7; font-size: 17px; }
ul { line-height: 1.7; }
.meta { font-size: 13px; color: var(--muted); margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
.chapter-img { width:100%; border-radius: 8px; margin: 16px 0 8px; }
@media print { .cover { page-break-after: always; } h1 { page-break-before: always; } }
`;
  const cover = `
<section class="cover">
  ${input.coverUrl ? `<img src="${esc(input.coverUrl)}" alt="capa" />` : ""}
  <h1>${esc(input.title)}</h1>
  ${input.subtitle ? `<p>${esc(input.subtitle)}</p>` : ""}
  ${id.author ? `<p style="margin-top:24px">por <strong>${esc(id.author)}</strong></p>` : ""}
  ${id.brand ? `<p style="opacity:.7">${esc(id.brand)}</p>` : ""}
</section>`;
  const intro = input.introduction
    ? `<section><h1>Introdução</h1>${md(input.introduction)}</section>`
    : "";
  const chapters = input.chapters
    .map(
      (c, i) => `
<section>
  <h1>${i + 1}. ${esc(c.title)}</h1>
  ${c.imageUrl ? `<img class="chapter-img" src="${esc(c.imageUrl)}" alt="" />` : ""}
  ${md(c.markdown)}
</section>`,
    )
    .join("\n");
  const conclusion = input.conclusion
    ? `<section><h1>Conclusão</h1>${md(input.conclusion)}</section>`
    : "";
  const bonus = input.bonus ? `<section><h1>Bônus</h1>${md(input.bonus)}</section>` : "";
  const about = input.aboutAuthor
    ? `<section><h1>Sobre o autor</h1>${md(input.aboutAuthor)}</section>`
    : "";
  const meta = `
<div class="meta">
  ${id.copyright ? `<p>${esc(id.copyright)}</p>` : ""}
  ${id.instagram ? `<p>Instagram: ${esc(id.instagram)}</p>` : ""}
  ${id.brand ? `<p>${esc(id.brand)}</p>` : ""}
</div>`;
  const html = `<!doctype html>
<html lang="${esc(id.language ?? "pt-BR")}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(input.title)}</title>
<meta name="description" content="${esc(id.shortDescription ?? input.subtitle ?? input.title)}" />
<style>${css}</style>
</head>
<body>
${cover}
<main>
${intro}
${chapters}
${conclusion}
${bonus}
${about}
${meta}
</main>
</body>
</html>`;
  return new Blob([html], { type: "text/html;charset=utf-8" });
}