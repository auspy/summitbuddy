import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { streamText, convertToModelMessages } from "ai";
import {
  buildSystemPrompt,
  buildCompressedSystemPrompt,
} from "@/lib/system-prompt";
import { loadSummitData } from "@/lib/data-loader";
import { UserProfile } from "@/lib/types";

export const maxDuration = 60;

const PROVIDER = process.env.LLM_PROVIDER || "groq";

export async function POST(req: Request) {
  const { messages, profile } = await req.json();

  const data = loadSummitData();

  // Use compressed prompt to stay within free tier limits
  const systemPrompt = buildCompressedSystemPrompt(data, profile);

  const model =
    PROVIDER === "google"
      ? google("gemini-2.0-flash-lite")
      : groq("llama-3.3-70b-specdec");

  // Convert UIMessages (with parts[]) to ModelMessages (with content) for streamText
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1500,
    maxRetries: 0,
  });

  return result.toUIMessageStreamResponse();
}
