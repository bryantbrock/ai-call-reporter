import express from "express";
import axios from "axios";
import { OpenAI } from "openai";
import { Resend } from "resend";
import { Document, Packer, Paragraph } from "docx";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const resend = new Resend(process.env.RESEND_API_KEY);

async function getCallDetails(callId) {
  const url = `${process.env.JUSTCALL_API_URL}/calls/get`;
  const { data } = await axios.post(url, {
    headers: {
      Authorization: `${process.env.JUSTCALL_API_KEY}:${process.env.JUSTCALL_API_SECRET}`,
    },
    data: { id: callId },
  });
  return data;
}

function extractEmail(transcript) {
  const m = transcript.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m?.[0] ?? null;
}

async function shouldGenerate(transcript) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Decide whether to generate a report. Reply YES or NO.",
      },
      { role: "user", content: `Transcript:\n${transcript}` },
    ],
  });
  const answer = resp.choices[0].message.content?.trim().toLowerCase();
  return answer?.startsWith("yes") ?? false;
}

async function generateMarkdownReport(transcript) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an AI that writes analytical reports in Markdown.",
      },
      {
        role: "user",
        content: `Please generate a detailed Markdown report for:\n\n${transcript}`,
      },
    ],
    max_tokens: 1500,
  });
  return resp.choices[0].message.content;
}

async function markdownToDocx(markdown) {
  const doc = new Document({
    sections: [
      {
        children: markdown.split("\n\n").map((para) => new Paragraph(para)),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

app.post("/webhook/justcall", async (req, res) => {
  try {
    const event = req.body;
    if (event.event !== "call.ended") return res.sendStatus(200);

    console.log("Received event", JSON.stringify(event, null, 2));

    const callId = event.data.id;
    const details = await getCallDetails(callId);

    console.log("Call details", JSON.stringify(details, null, 2));

    const transcript = details.transcript || "";
    const email = extractEmail(transcript);
    if (!email) {
      console.warn("No email found in transcript");
      return res.sendStatus(200);
    }

    if (!(await shouldGenerate(transcript))) {
      console.log("AI decided no report needed");
      return res.sendStatus(200);
    }

    const markdown = await generateMarkdownReport(transcript);
    const docxBuf = await markdownToDocx(markdown);
    const b64 = docxBuf.toString("base64");

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

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`🚀 Listening on ${port}`);
});
