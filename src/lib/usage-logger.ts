import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface ChatLogEntry {
  ip: string;
  user_message: string;
  assistant_message: string;
  estimated_cost_inr: number;
  input_tokens: number;
  output_tokens: number;
  summit_day: number;
  user_profile: Record<string, unknown> | null;
}

/**
 * Log a chat interaction to Supabase. Fire-and-forget — never blocks or throws.
 */
export function logChat(entry: ChatLogEntry) {
  if (!supabase) return;

  Promise.resolve(
    supabase
      .from("chat_logs")
      .insert(entry)
      .then(({ error }) => {
        if (error) console.error("Usage log failed:", error.message);
      })
  ).catch(() => {
    // Silently ignore — logging should never break the app
  });
}

/**
 * Get the summit day number (1-5) based on the current date.
 * Feb 16 = Day 1, Feb 17 = Day 2, ..., Feb 20 = Day 5
 */
export function getSummitDay(): number {
  const now = new Date();
  const feb16 = new Date("2026-02-16T00:00:00+05:30");
  const diff = Math.floor(
    (now.getTime() - feb16.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(1, Math.min(5, diff + 1));
}

// Gemini 2.0 Flash Lite pricing
const INPUT_COST_PER_TOKEN = 0.075 / 1_000_000; // $0.075 per 1M input tokens
const OUTPUT_COST_PER_TOKEN = 0.3 / 1_000_000; // $0.30 per 1M output tokens
const USD_TO_INR = 85;

export function estimateCostINR(
  inputTokens: number,
  outputTokens: number
): number {
  const usd =
    inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  return Math.round(usd * USD_TO_INR * 100) / 100; // Round to 2 decimal places
}
