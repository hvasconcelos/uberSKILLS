import type { UIMessage } from "@ai-sdk/react";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getDecryptedApiKey } from "@uberskills/db";
import { convertToModelMessages, streamText } from "ai";
import { NextResponse } from "next/server";

import { SKILL_CREATION_SYSTEM_PROMPT } from "@/lib/system-prompts";

/** Expected request body for the POST /api/chat route. */
interface ChatRequestBody {
  messages: UIMessage[];
  model: string;
}

/**
 * POST /api/chat -- Streams an AI response for skill creation.
 *
 * Accepts a list of chat messages and a model identifier, then uses the
 * Vercel AI SDK with the OpenRouter provider to stream back a response.
 * The system prompt instructs the AI to generate valid SKILL.md content.
 */
export async function POST(request: Request): Promise<Response> {
  let apiKey: string | null;
  try {
    apiKey = getDecryptedApiKey();
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt API key. Check your encryption secret.", code: "DECRYPT_ERROR" },
      { status: 500 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key configured. Add one in Settings first.", code: "NO_API_KEY" },
      { status: 401 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const { messages, model } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages must be a non-empty array", code: "INVALID_MESSAGES" },
      { status: 400 },
    );
  }

  if (typeof model !== "string" || model.trim() === "") {
    return NextResponse.json(
      { error: "model must be a non-empty string", code: "INVALID_MODEL" },
      { status: 400 },
    );
  }

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://uberskills.dev",
      "X-Title": "UberSkills",
    },
  });

  // Note: streamText() returns synchronously. Upstream errors (401, 429) may
  // surface during streaming rather than here, but this catch handles
  // synchronous failures like invalid model configuration.
  try {
    const result = streamText({
      model: openrouter(model),
      system: SKILL_CREATION_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("401") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Invalid API key", code: "INVALID_KEY" }, { status: 401 });
    }
    if (message.includes("429") || message.includes("rate")) {
      return NextResponse.json(
        { error: "Rate limited by OpenRouter. Try again shortly.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate response from AI provider.", code: "UPSTREAM_ERROR" },
      { status: 502 },
    );
  }
}
