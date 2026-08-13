import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

/** Flash-Lite is free-tier eligible and fast enough to feel instant on paste. */
const MODEL_ID = process.env.AI_MODEL ?? "gemini-3.1-flash-lite";

export const isAiConfigured = Boolean(apiKey);

export function captureModel() {
  if (!isAiConfigured) {
    throw new Error(
      "AI capture is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local."
    );
  }

  return createGoogleGenerativeAI({ apiKey })(MODEL_ID);
}
