import JSZip from "jszip";

export interface EpubInput {
  title: string;
  subtitle?: string | null;
  language?: string;
  coverUrl?: string | null;
  chapters: { title: string; markdown: string; imageUrl?: string | null }[];
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      out.push(`<p>${escapeHtml(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  let inList = false;
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flush();
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    const strip = (s: string) =>
      s
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
    if (l.startsWith("### ")) {
      flush();
      out.push(`<h3>${escapeHtml(l.slice(4))}</h3>`);
    } else if (l.startsWith("## ")) {
      flush();
      out.push(`<h2>${escapeHtml(l.slice(3))}</h2>`);
    } else if (l.startsWith("# ")) {
      flush();
      out.push(`<h2>${escapeHtml(l.slice(2))}</h2>`);
    } else if (/^\s*[-*]\s+/.test(l)) {
      flush();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${strip(escapeHtml(l.replace(/^\s*[-*]\s+/, "")))}</li>`);
    } else {
      para.push(l.trim());
    }
  }
  flush();
  if (inList) out.push("</ul>");
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

export async function exportEbookEpub(input: EpubInput): Promise<Blob> {
  const zip = new JSZip();
  const lang = input.language ?? "pt-BR";
  const uuid = `urn:uuid:${crypto.randomUUID()}`;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

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
  oebps.file(
    "style.css",
    `body{font-family:Georgia,serif;line-height:1.6;color:#222;padding:0 1em}h1,h2,h3{font-family:Helvetica,Arial,sans-serif;color:#111}img{max-width:100%;height:auto;display:block;margin:1em auto}`,
  );

  const manifest: string[] = [
    `<item id="css" href="style.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  ];
  const spine: string[] = [];

  // Cover image
  if (input.coverUrl) {
    const img = await fetchImage(input.coverUrl);
    if (img) {
      oebps.file(`cover.${img.ext}`, img.bytes);
      manifest.push(
        `<item id="cover-img" href="cover.${img.ext}" media-type="${img.mime}" properties="cover-image"/>`,
      );
    }
  }

  // Title page
  oebps.file(
    "title.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}"><head>
<meta charset="utf-8"/><title>${escapeHtml(input.title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h1 style="text-align:center;margin-top:30%">${escapeHtml(input.title)}</h1>
${input.subtitle ? `<p style="text-align:center;font-style:italic">${escapeHtml(input.subtitle)}</p>` : ""}
</body></html>`,
  );
  manifest.push(`<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`);
  spine.push(`<itemref idref="title"/>`);
  spine.push(`<itemref idref="nav"/>`);

  // Chapters
  for (let i = 0; i < input.chapters.length; i++) {
    const c = input.chapters[i];
    let imgTag = "";
    if (c.imageUrl) {
      const img = await fetchImage(c.imageUrl);
      if (img) {
        const name = `ch${i + 1}.${img.ext}`;
        oebps.file(name, img.bytes);
        manifest.push(
          `<item id="img-${i + 1}" href="${name}" media-type="${img.mime}"/>`,
        );
        imgTag = `<img src="${name}" alt=""/>`;
      }
    }
    const id = `ch${i + 1}`;
    oebps.file(
      `${id}.xhtml`,
      `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}"><head>
<meta charset="utf-8"/><title>${escapeHtml(c.title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h2>${escapeHtml(c.title)}</h2>${imgTag}${mdToHtml(c.markdown)}</body></html>`,
    );
    manifest.push(
      `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`,
    );
    spine.push(`<itemref idref="${id}"/>`);
  }

  // Nav
  oebps.file(
    "nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}"><head>
<meta charset="utf-8"/><title>Sumário</title></head><body>
<nav epub:type="toc"><h1>Sumário</h1><ol>
${input.chapters.map((c, i) => `<li><a href="ch${i + 1}.xhtml">${escapeHtml(c.title)}</a></li>`).join("")}
</ol></nav></body></html>`,
  );

  oebps.file(
    "content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${escapeHtml(input.title)}</dc:title>
    <dc:language>${lang}</dc:language>
    <dc:creator>Lovable Ebook Engine</dc:creator>
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    ${manifest.join("\n    ")}
  </manifest>
  <spine>
    ${spine.join("\n    ")}
  </spine>
</package>`,
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}