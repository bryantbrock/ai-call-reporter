import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractEmail(fullText: string) {
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

export async function shouldGenerate(fullText: string) {
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

export async function generateMarkdownReport(transcript: any[]) {
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
