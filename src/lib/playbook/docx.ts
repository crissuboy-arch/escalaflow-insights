import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

export interface PlaybookDocxScene {
  title: string;
  text: string;
  balloons: string[];
  exercise: string;
  practical_action: string;
}

export async function exportPlaybookDocx(
  title: string,
  scenes: PlaybookDocxScene[],
) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Playbook interativo", italics: true })],
    }),
    new Paragraph({ children: [new TextRun("")] }),
  ];

  scenes.forEach((s, i) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `Cena ${i + 1}: ${s.title}`, bold: true })],
      }),
    );
    s.text
      .replace(/\r/g, "")
      .split("\n")
      .filter((l) => l.trim())
      .forEach((line) =>
        children.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun(line.trim())],
          }),
        ),
      );
    if (s.balloons?.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: "Pontos-chave", bold: true })],
        }),
      );
      s.balloons.forEach((b) =>
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun(b)],
          }),
        ),
      );
    }
    if (s.exercise) {
      children.push(
        new Paragraph({
          spacing: { before: 160 },
          children: [
            new TextRun({ text: "Exercício: ", bold: true }),
            new TextRun(s.exercise),
          ],
        }),
      );
    }
    if (s.practical_action) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Ação prática: ", bold: true }),
            new TextRun(s.practical_action),
          ],
        }),
      );
    }
    children.push(new Paragraph({ children: [new TextRun("")] }));
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}