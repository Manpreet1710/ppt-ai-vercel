import { env } from "@/env";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { type LanguageModelV1 } from "ai";

export function modelPicker(): LanguageModelV1 {
  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
  });
  return google("models/gemini-2.0-flash") as unknown as LanguageModelV1;
}
