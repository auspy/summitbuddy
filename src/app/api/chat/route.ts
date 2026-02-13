import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { buildCompressedSystemPrompt } from "@/lib/system-prompt";
import { loadSummitData } from "@/lib/data-loader";
import type { UserProfile } from "@/lib/types";
import { logChat, getSummitDay, estimateCostINR } from "@/lib/usage-logger";

export const maxDuration = 60;

// --- Upstash Redis rate limiter (persists across cold starts) ---
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per 60 seconds
    })
  : null;

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = getClientIP(req);

  // Rate limit check (skipped if Upstash env vars not configured)
  if (ratelimit) {
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      const retryAfterMs = Math.max(0, reset - Date.now());
      return new Response(
        JSON.stringify({
          error:
            "You're sending messages too quickly. Please wait a moment and try again.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
          },
        }
      );
    }
  }

  try {
    const { messages, profile } = (await req.json()) as {
      messages: Omit<UIMessage, "id">[];
      profile?: UserProfile;
    };

    const data = loadSummitData();
    const systemPrompt = buildCompressedSystemPrompt(data, profile);

    // Gemini 2.0 Flash Lite: $0.075/1M in, $0.30/1M out
    const model = google("gemini-2.0-flash-lite");

    // Cap conversation to last 10 messages to reduce token costs
    const recentMessages = messages.slice(-10);
    const modelMessages = await convertToModelMessages(recentMessages);

    // Extract the last user message for logging
    const lastUserMsg = recentMessages
      .filter((m) => m.role === "user")
      .pop();
    const userText =
      lastUserMsg?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "";

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 1500,
      maxRetries: 0,
    });

    // Log usage in background after stream completes (non-blocking)
    result.usage.then((usage) => {
      result.text.then((text) => {
        logChat({
          ip,
          user_message: userText.slice(0, 500),
          assistant_message: text.slice(0, 500),
          estimated_cost_inr: estimateCostINR(
            usage.inputTokens ?? 0,
            usage.outputTokens ?? 0
          ),
          input_tokens: usage.inputTokens ?? 0,
          output_tokens: usage.outputTokens ?? 0,
          summit_day: getSummitDay(),
          user_profile: (profile as Record<string, unknown>) || null,
        });
      });
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };

    // Rate limit or quota exceeded from provider
    if (err.status === 429) {
      return new Response(
        JSON.stringify({
          error:
            "Summit Buddy is getting too many requests right now. Please wait a moment and try again.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Request too large (token limit)
    if (err.status === 413) {
      return new Response(
        JSON.stringify({
          error:
            "Your conversation is too long. Please start a new chat.",
        }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auth error
    if (err.status === 401) {
      return new Response(
        JSON.stringify({
          error: "AI service is not configured. Please contact the organizers.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Chat API error:", err.message || error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
