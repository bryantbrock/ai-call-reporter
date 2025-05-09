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
  const response = await fetch(
    `${process.env.JUSTCALL_API_URL}/calls_ai/${callId}?platform=justcall&fetch_transcription=true&fetch_summary=true&fetch_ai_insights=true&fetch_action_items=true&fetch_smart_chapters=true`,
    {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.8",
        authorization:
          "dd230c7ea54842340e49f36768ef8da1ff6aaaca:cbb0d0e9ad537ec8b991167611cc619b4a5cb337",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "x-readme-api-explorer": "5.351.0",
      },
      referrer: "https://developer.justcall.io/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    }
  );
  const data = await response.json();
  return data;
}

async function extractEmail(fullText) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant that extracts email addresses from text. Return only the email address, nothing else.",
      },
      {
        role: "user",
        content: `Extract the email address from the following text:\n${fullText}`,
      },
    ],
  });
  return resp.choices[0].message.content?.trim() ?? null;
}

async function shouldGenerate(fullText) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant that determines if a user has requested a report or research to be generated. Look for phrases indicating a request for report generation, research, or analysis. If such a request is found, reply YES. If no clear request for report generation is found, reply NO.",
      },
      { role: "user", content: `Full context:\n${fullText}` },
    ],
  });
  const answer = resp.choices[0].message.content?.trim().toLowerCase();
  return answer?.startsWith("yes") ?? false;
}

async function generateMarkdownReport(transcript) {
  const text = Array.isArray(transcript)
    ? transcript.map((t) => t.sentence).join(" ")
    : transcript;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an AI that writes customer-requested reports in Markdown. The goal of this AI agent is to write a report requested by the customer, NOT to summarize the call.",
      },
      {
        role: "user",
        content: `Please generate a detailed Markdown report for:\n\n${text}`,
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

console.log(process.env);

app.post("/webhook/justcall", async (req, res) => {
  try {
    // const webhookSecret = req.query.secret;
    // if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    //   return res.sendStatus(401);
    // }

    const event = req.body;
    if (event.type !== "call.completed") return res.sendStatus(200);

    console.log("Received event", JSON.stringify(event, null, 2));

    const callId = event?.data?.id;

    if (!callId) {
      console.warn("No call ID found in event");
      return res.sendStatus(200);
    }

    const details = await getCallDetails(callId);
    const transcript = details.data["call_transcription"] || [];
    const fullText = transcript.map((t) => t.sentence).join(" ");
    const email = await extractEmail(fullText);

    if (!email) {
      console.warn("No email found in transcript");
      return res.sendStatus(200);
    }

    const shouldGenerateResult = await shouldGenerate(fullText);
    if (!shouldGenerateResult) {
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
