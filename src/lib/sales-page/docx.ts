import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type { SalesPage } from "@/lib/sales-page.server";

function p(text: string, opts: { bold?: boolean; italics?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
  });
}

function h(level: typeof HeadingLevel.HEADING_1, text: string) {
  return new Paragraph({
    heading: level,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

export async function exportSalesPageDocx(title: string, page: SalesPage) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Página de Vendas", italics: true })],
    }),
    new Paragraph({ children: [new TextRun("")] }),

    h(HeadingLevel.HEADING_1, "Hero"),
    p(page.hero, { bold: true }),
    p(page.headline),
    p(page.subheadline, { italics: true }),

    h(HeadingLevel.HEADING_1, "Lead"),
    ...page.lead.split(/\n+/).filter(Boolean).map((l) => p(l)),

    h(HeadingLevel.HEADING_1, "Dor"),
    ...page.dor.split(/\n+/).filter(Boolean).map((l) => p(l)),

    h(HeadingLevel.HEADING_1, "Mecanismo"),
    ...page.mecanismo.split(/\n+/).filter(Boolean).map((l) => p(l)),

    h(HeadingLevel.HEADING_1, "Benefícios"),
    ...page.beneficios.map(
      (b) =>
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun(b)] }),
    ),

    h(HeadingLevel.HEADING_1, "Quebra de Objeções"),
    ...page.objecoes.flatMap((o) => [
      p(`Q: ${o.q}`, { bold: true }),
      p(`R: ${o.a}`),
    ]),

    h(HeadingLevel.HEADING_1, "Depoimentos"),
    ...page.depoimentos.flatMap((d) => [
      p(`"${d.texto}"`, { italics: true }),
      p(`— ${d.nome}`),
    ]),

    h(HeadingLevel.HEADING_1, "Oferta"),
    ...page.oferta.split(/\n+/).filter(Boolean).map((l) => p(l)),

    h(HeadingLevel.HEADING_1, "Bônus"),
    ...page.bonus.map(
      (b) =>
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun(b)] }),
    ),

    h(HeadingLevel.HEADING_1, "Garantia"),
    p(page.garantia),

    h(HeadingLevel.HEADING_1, "FAQ"),
    ...page.faq.flatMap((f) => [
      p(`Q: ${f.q}`, { bold: true }),
      p(`R: ${f.a}`),
    ]),

    h(HeadingLevel.HEADING_1, "CTA"),
    p(page.cta, { bold: true }),

    h(HeadingLevel.HEADING_1, "Estrutura Visual Sugerida"),
    ...page.estruturaVisual.split(/\n+/).filter(Boolean).map((l) => p(l)),
  ];

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "pagina-de-vendas"}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}