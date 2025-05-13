import { Router } from "express";
import { getCallDetails } from "../services/justcall";
import {
  extractEmail,
  shouldGenerate,
  generateMarkdownReport,
} from "../services/openai";
import { sendReportEmail } from "../services/email";
import { markdownToDocx } from "../utils/docx";

const router = Router();

router.post("/webhook", async (req, res) => {
  try {
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
    const docxBuf = await markdownToDocx(markdown as string);
    await sendReportEmail(email, docxBuf);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;
