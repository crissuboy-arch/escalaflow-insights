import JSZip from "jszip";
import { parseInline, stripEmojis } from "./typography";

export interface EpubInput {
  title: string;
  subtitle?: string | null;
  language?: string;
  coverUrl?: string | null;
  chapters: { title: string; markdown: string; imageUrl?: string | null }[];
  identity?: {
    author?: string;
    brand?: string;
    bio?: string;
    copyright?: string;
    disclaimer?: string;
    dedication?: string;
  };
  /** "digital" | "print" | "kdp" — controls font stack hint in CSS. */
  renderMode?: "digital" | "print" | "kdp";
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(s: string): string {
  // Reuse the PDF parser, then emit semantic HTML.
  const runs = parseInline(s);
  return runs
    .map((r) => {
      const safe = escapeHtml(r.text);
      let out = safe;
      if (r.style === "bold") out = `<strong>${out}</strong>`;
      else if (r.style === "italic") out = `<em>${out}</em>`;
      else if (r.style === "boldItalic") out = `<strong><em>${out}</em></strong>`;
      if (r.underline) out = `<u>${out}</u>`;
      if (r.highlight) out = `<mark>${out}</mark>`;
      return out;
    })
    .join("");
}

function mdToHtml(md: string): string {
  const lines = stripEmojis(md).replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let inUl = false;
  let inOl = false;
  const flushP = () => {
    if (para.length) {
      out.push(`<p>${inlineToHtml(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flushP();
      closeLists();
      continue;
    }
    if (l.startsWith("### ")) {
      flushP();
      closeLists();
      out.push(`<h3>${inlineToHtml(l.slice(4))}</h3>`);
    } else if (l.startsWith("## ")) {
      flushP();
      closeLists();
      out.push(`<h2>${inlineToHtml(l.slice(3))}</h2>`);
    } else if (l.startsWith("# ")) {
      flushP();
      closeLists();
      out.push(`<h2>${inlineToHtml(l.slice(2))}</h2>`);
    } else if (/^\s*\d+\.\s+/.test(l)) {
      flushP();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineToHtml(l.replace(/^\s*\d+\.\s+/, ""))}</li>`);
    } else if (/^\s*[-*]\s+/.test(l)) {
      flushP();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineToHtml(l.replace(/^\s*[-*]\s+/, ""))}</li>`);
    } else {
      para.push(l.trim());
    }
  }
  flushP();
  closeLists();
  return out.join("\n");
}

async function fetchImage(
  url: string,
): Promise<{ bytes: Uint8Array; mime: string; ext: string } | null> {
  try {
    if (url.startsWith("data:")) {
      const m = url.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) return null;
      const bin = atob(m[2]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const mime = m[1];
      const ext = mime.includes("png") ? "png" : "jpg";
      return { bytes: arr, mime, ext };
    }
    const res = await fetch(url);
    const buf = new Uint8Array(await res.arrayBuffer());
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    return {
      bytes: buf,
      mime: isPng ? "image/png" : "image/jpeg",
      ext: isPng ? "png" : "jpg",
    };
  } catch {
    return null;
  }
}

const CSS = `
@namespace epub "http://www.idpf.org/2007/ops";
html, body { margin: 0; padding: 0; }
body { font-family: Georgia, "Times New Roman", serif; line-height: 1.55; color: #1a1a1a; padding: 0 1em; }
.sans body, body.sans { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; }
h1, h2, h3 { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; line-height: 1.25; }
h1 { font-size: 1.6em; margin: 1.2em 0 0.6em; }
h2 { font-size: 1.3em; margin: 1.1em 0 0.5em; }
h3 { font-size: 1.1em; margin: 1em 0 0.4em; }
p { margin: 0 0 0.6em; text-indent: 1.2em; text-align: justify; }
p:first-of-type { text-indent: 0; }
p:first-of-type::first-letter {
  font-size: 3.2em;
  float: left;
  line-height: 0.9;
  padding: 0.05em 0.08em 0 0;
  font-weight: 700;
  color: #5b3a14;
}
ul, ol { margin: 0.6em 0 0.8em 1.4em; padding: 0; }
li { margin: 0.2em 0; }
blockquote { border-left: 3px solid #ccc; margin: 0.8em 0; padding: 0.2em 0.9em; color: #444; font-style: italic; }
mark { background: #fff48a; padding: 0 0.1em; }
u { text-decoration: underline; }
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
.cover { text-align: center; padding: 0; margin: 0; }
.cover img { width: 100%; height: auto; }
.title-page { text-align: center; padding-top: 25%; }
.title-page h1 { font-size: 2.2em; margin: 0 0 0.3em; }
.title-page .subtitle { font-style: italic; color: #555; margin-bottom: 2em; }
.title-page .author { margin-top: 4em; font-size: 1.1em; }
.copyright { font-size: 0.85em; color: #555; padding: 4em 0; }
.dedication { text-align: center; font-style: italic; padding-top: 35%; color: #555; }
`;

export async function exportEbookEpub(input: EpubInput): Promise<Blob> {
  const zip = new JSZip();
  const lang = input.language ?? "pt-BR";
  const uuid = `urn:uuid:${crypto.randomUUID()}`;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const author = input.identity?.author?.trim() || "Autor";
  const publisher = input.identity?.brand?.trim() || "";

  // mimetype must be first, uncompressed
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  const oebps = zip.folder("OEBPS")!;
  const css = oebps.folder("css")!;
  const text = oebps.folder("text")!;
  const images = oebps.folder("images")!;

  css.file("style.css", CSS);

  const manifest: string[] = [
    `<item id="css" href="css/style.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
  ];
  const spine: string[] = [];
  const navItems: { id: string; href: string; title: string }[] = [];

  // Cover
  let coverImgFile: string | null = null;
  if (input.coverUrl) {
    const img = await fetchImage(input.coverUrl);
    if (img) {
      coverImgFile = `images/cover.${img.ext}`;
      images.file(`cover.${img.ext}`, img.bytes);
      manifest.push(
        `<item id="cover-img" href="${coverImgFile}" media-type="${img.mime}" properties="cover-image"/>`,
      );
      text.file(
        "cover.xhtml",
        `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}">
<head><meta charset="utf-8"/><title>Capa</title>
<link rel="stylesheet" type="text/css" href="../css/style.css"/></head>
<body epub:type="cover" class="cover"><img src="../${coverImgFile}" alt="${escapeHtml(input.title)}"/></body></html>`,
      );
      manifest.push(
        `<item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>`,
      );
      spine.push(`<itemref idref="cover" linear="yes"/>`);
    }
  }

  // Title page
  text.file(
    "title.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head><meta charset="utf-8"/><title>${escapeHtml(input.title)}</title>
<link rel="stylesheet" type="text/css" href="../css/style.css"/></head>
<body class="title-page">
<h1>${escapeHtml(input.title)}</h1>
${input.subtitle ? `<p class="subtitle">${escapeHtml(input.subtitle)}</p>` : ""}
<p class="author">${escapeHtml(author)}</p>
</body></html>`,
  );
  manifest.push(`<item id="title" href="text/title.xhtml" media-type="application/xhtml+xml"/>`);
  spine.push(`<itemref idref="title" linear="yes"/>`);

  // Copyright
  const year = new Date().getFullYear();
  text.file(
    "copyright.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head><meta charset="utf-8"/><title>Copyright</title>
<link rel="stylesheet" type="text/css" href="../css/style.css"/></head>
<body class="copyright">
<p>${escapeHtml(input.identity?.copyright?.trim() || `Copyright © ${year} ${author}`)}</p>
<p>Todos os direitos reservados.</p>
${publisher ? `<p>Publicado por ${escapeHtml(publisher)}.</p>` : ""}
${input.identity?.disclaimer?.trim() ? `<p>${escapeHtml(input.identity.disclaimer.trim())}</p>` : ""}
</body></html>`,
  );
  manifest.push(
    `<item id="copyright" href="text/copyright.xhtml" media-type="application/xhtml+xml"/>`,
  );
  spine.push(`<itemref idref="copyright" linear="yes"/>`);

  // Dedication
  if (input.identity?.dedication?.trim()) {
    text.file(
      "dedication.xhtml",
      `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head><meta charset="utf-8"/><title>Dedicatória</title>
<link rel="stylesheet" type="text/css" href="../css/style.css"/></head>
<body class="dedication">${inlineToHtml(input.identity.dedication.trim())}</body></html>`,
    );
    manifest.push(
      `<item id="dedication" href="text/dedication.xhtml" media-type="application/xhtml+xml"/>`,
    );
    spine.push(`<itemref idref="dedication" linear="yes"/>`);
  }

  // Nav (TOC) goes after frontmatter
  spine.push(`<itemref idref="nav" linear="yes"/>`);

  // Chapters
  for (let i = 0; i < input.chapters.length; i++) {
    const c = input.chapters[i];
    const id = `ch${i + 1}`;
    let imgTag = "";
    if (c.imageUrl) {
      const img = await fetchImage(c.imageUrl);
      if (img) {
        const name = `images/${id}.${img.ext}`;
        images.file(`${id}.${img.ext}`, img.bytes);
        manifest.push(`<item id="img-${i + 1}" href="${name}" media-type="${img.mime}"/>`);
        imgTag = `<img src="../${name}" alt=""/>`;
      }
    }
    text.file(
      `${id}.xhtml`,
      `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head><meta charset="utf-8"/><title>${escapeHtml(c.title)}</title>
<link rel="stylesheet" type="text/css" href="../css/style.css"/></head>
<body><h1>${escapeHtml(c.title)}</h1>${imgTag}${mdToHtml(c.markdown)}</body></html>`,
    );
    manifest.push(`<item id="${id}" href="text/${id}.xhtml" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${id}" linear="yes"/>`);
    navItems.push({ id, href: `text/${id}.xhtml`, title: c.title });
  }

  // EPUB3 nav
  oebps.file(
    "nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}">
<head><meta charset="utf-8"/><title>Sumário</title>
<link rel="stylesheet" type="text/css" href="css/style.css"/></head>
<body><nav epub:type="toc" id="toc"><h1>Sumário</h1><ol>
${navItems.map((n) => `<li><a href="${n.href}">${escapeHtml(n.title)}</a></li>`).join("")}
</ol></nav></body></html>`,
  );

  // EPUB2 NCX (Kindle/Kobo legacy compat)
  oebps.file(
    "toc.ncx",
    `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeHtml(input.title)}</text></docTitle>
  <navMap>
${navItems
  .map(
    (n, i) =>
      `    <navPoint id="np-${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeHtml(n.title)}</text></navLabel><content src="${n.href}"/></navPoint>`,
  )
  .join("\n")}
  </navMap>
</ncx>`,
  );

  oebps.file(
    "content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${escapeHtml(input.title)}</dc:title>
    <dc:language>${lang}</dc:language>
    <dc:creator opf:role="aut">${escapeHtml(author)}</dc:creator>
    ${input.subtitle ? `<dc:description>${escapeHtml(input.subtitle)}</dc:description>` : ""}
    ${publisher ? `<dc:publisher>${escapeHtml(publisher)}</dc:publisher>` : ""}
    <dc:date>${now.slice(0, 10)}</dc:date>
    <meta property="dcterms:modified">${now}</meta>
    ${coverImgFile ? `<meta name="cover" content="cover-img"/>` : ""}
  </metadata>
  <manifest>
    ${manifest.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spine.join("\n    ")}
  </spine>
</package>`,
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
