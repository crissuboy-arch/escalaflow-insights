import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  PageBreak,
  AlignmentType,
  TableOfContents,
  LevelFormat,
} from "docx";

export interface EbookDocxInput {
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  chapters: { title: string; markdown: string; imageUrl?: string | null }[];
  identity?: { author?: string; brand?: string; bio?: string };
  extras?: { introduction?: string; conclusion?: string; aboutAuthor?: string; bonus?: string };
  finalCta?: string;
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith("data:")) {
      const b64 = url.split(",")[1] ?? "";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }
    const res = await fetch(url);
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function detectImageType(bytes: Uint8Array): "png" | "jpg" {
  return bytes[0] === 0x89 && bytes[1] === 0x50 ? "png" : "jpg";
}

function mdToParagraphs(md: string): Paragraph[] {
  const out: Paragraph[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: buf.join(" ").trim() })],
          spacing: { after: 160 },
        }),
      );
      buf = [];
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flush();
      continue;
    }
    const strip = (s: string) =>
      s
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[(.+?)\]\((.+?)\)/g, "$1");
    if (l.startsWith("### ")) {
      flush();
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(strip(l.slice(4)))] }));
    } else if (l.startsWith("## ")) {
      flush();
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(strip(l.slice(3)))] }));
    } else if (l.startsWith("# ")) {
      flush();
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(strip(l.slice(2)))] }));
    } else if (/^\s*[-*]\s+/.test(l)) {
      flush();
      out.push(
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun(strip(l.replace(/^\s*[-*]\s+/, "")))],
        }),
      );
    } else {
      buf.push(strip(l.trim()));
    }
  }
  flush();
  return out;
}

export async function exportEbookDocx(input: EbookDocxInput): Promise<Blob> {
  const sections: Paragraph[] = [];

  // Cover
  if (input.coverUrl) {
    const bytes = await fetchImageBytes(input.coverUrl);
    if (bytes) {
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: detectImageType(bytes),
              data: bytes,
              transformation: { width: 360, height: 540 },
            }),
          ],
        }),
      );
    }
  }
  sections.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: input.title, bold: true })],
      spacing: { before: 400, after: 200 },
    }),
  );
  if (input.subtitle) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: input.subtitle, italics: true, size: 28 })],
      }),
    );
  }
  if (input.identity?.author) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: `por ${input.identity.author}`, bold: true, size: 24 })],
      }),
    );
  }
  sections.push(new Paragraph({ children: [new PageBreak()] }));

  // TOC
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Sumário")],
    }),
  );
  // Use TableOfContents element via raw paragraph with field — fall back to plain list
  input.chapters.forEach((c, i) => {
    sections.push(
      new Paragraph({
        children: [new TextRun(`${i + 1}. ${c.title}`)],
        spacing: { after: 80 },
      }),
    );
  });
  sections.push(new Paragraph({ children: [new PageBreak()] }));

  // Introduction
  if (input.extras?.introduction?.trim()) {
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Introdução")] }),
    );
    sections.push(...mdToParagraphs(input.extras.introduction));
    sections.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Chapters
  for (let i = 0; i < input.chapters.length; i++) {
    const c = input.chapters[i];
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `Capítulo ${i + 1}`, color: "888888" })],
        spacing: { after: 80 },
      }),
    );
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: c.title, bold: true })],
        spacing: { after: 200 },
      }),
    );
    if (c.imageUrl) {
      const bytes = await fetchImageBytes(c.imageUrl);
      if (bytes) {
        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: detectImageType(bytes),
                data: bytes,
                transformation: { width: 480, height: 270 },
              }),
            ],
            spacing: { after: 200 },
          }),
        );
      }
    }
    sections.push(...mdToParagraphs(c.markdown));
    if (i < input.chapters.length - 1) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Conclusion + CTA
  if (input.extras?.conclusion?.trim() || input.finalCta?.trim()) {
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Conclusão")] }),
    );
    if (input.extras?.conclusion?.trim()) {
      sections.push(...mdToParagraphs(input.extras.conclusion));
    }
    if (input.finalCta?.trim()) {
      sections.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Próximo passo")] }),
      );
      sections.push(...mdToParagraphs(input.finalCta));
    }
  }

  // About the author
  const aboutMd = [
    input.extras?.aboutAuthor?.trim() ?? "",
    input.identity?.bio?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (aboutMd) {
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(`Sobre ${input.identity?.author ?? "o autor"}`)],
      }),
    );
    sections.push(...mdToParagraphs(aboutMd));
  }

  // Bonus
  if (input.extras?.bonus?.trim()) {
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Bônus")] }),
    );
    sections.push(...mdToParagraphs(input.extras.bonus));
  }

  // Reference TableOfContents to avoid unused import warning
  void TableOfContents;

  const doc = new Document({
    creator: "Lovable Ebook Engine",
    title: input.title,
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}