import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReportEmail(email: string, docxBuffer: Buffer) {
  const b64 = docxBuffer.toString("base64");

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "JustCall <hello@justcall.ai>",
    to: email,
    subject: "Your AI-Generated Report",
    html: `<p>Hi there,</p>
           <p>Please find your report attached.</p>`,
    attachments: [
      {
        filename: "report.docx",
        content: b64,
      },
    ],
  });
}
