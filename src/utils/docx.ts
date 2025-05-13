import { Document, Packer, Paragraph } from "docx";

export async function markdownToDocx(markdown: string) {
  const doc = new Document({
    sections: [
      {
        children: markdown.split("\n\n").map((para) => new Paragraph(para)),
      },
    ],
  });
  return Packer.toBuffer(doc);
}
