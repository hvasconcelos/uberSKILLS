import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createTestRun, getDecryptedApiKey, getSkillById, updateTestRun } from "@uberskillz/db";
import { substitute } from "@uberskillz/skill-engine";
import { streamText } from "ai";
import { NextResponse } from "next/server";

/** Expected request body for POST /api/test. */
interface TestRequestBody {
  skillId: string;
  model: string;
  userMessage: string;
  arguments?: Record<string, string>;
}

/**
 * POST /api/test -- Executes a skill test run with streaming.
 *
 * Flow:
 * 1. Validate request and fetch skill from database
 * 2. Resolve $VARIABLE_NAME placeholders in skill content
 * 3. Create a test_runs row with status "running"
 * 4. Stream AI response using resolved content as system prompt
 * 5. On completion: capture metrics (tokens, latency, TTFT) and update test run
 * 6. On error: update test run with error details
 */
export async function POST(request: Request): Promise<Response> {
  // Decrypt the stored API key
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

  // Parse and validate request body
  let body: TestRequestBody;
  try {
    body = (await request.json()) as TestRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const { skillId, model, userMessage, arguments: args } = body;

  if (typeof skillId !== "string" || skillId.trim() === "") {
    return NextResponse.json(
      { error: "skillId must be a non-empty string", code: "INVALID_SKILL_ID" },
      { status: 400 },
    );
  }

  if (typeof model !== "string" || model.trim() === "") {
    return NextResponse.json(
      { error: "model must be a non-empty string", code: "INVALID_MODEL" },
      { status: 400 },
    );
  }

  if (typeof userMessage !== "string" || userMessage.trim() === "") {
    return NextResponse.json(
      { error: "userMessage must be a non-empty string", code: "INVALID_USER_MESSAGE" },
      { status: 400 },
    );
  }

  if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) {
    return NextResponse.json(
      { error: "arguments must be a plain object", code: "INVALID_ARGUMENTS" },
      { status: 400 },
    );
  }

  // Fetch the skill from the database
  const skill = getSkillById(skillId);
  if (!skill) {
    return NextResponse.json(
      { error: `Skill with ID "${skillId}" not found`, code: "SKILL_NOT_FOUND" },
      { status: 404 },
    );
  }

  // Resolve $VARIABLE_NAME placeholders in skill content
  const substitutionValues = args ?? {};
  const resolvedContent = substitute(skill.content, substitutionValues);

  // Persist test run with status "running" before streaming starts
  const testRun = createTestRun({
    skillId,
    model,
    systemPrompt: resolvedContent,
    userMessage,
    arguments: JSON.stringify(substitutionValues),
  });

  // Record request start time for latency and TTFT measurement
  const startMs = Date.now();
  let ttftMs: number | null = null;

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://uberskillz.dev",
      "X-Title": "UberSkillz",
    },
  });

  try {
    const result = streamText({
      model: openrouter(model),
      system: resolvedContent,
      messages: [{ role: "user", content: userMessage }],
      // Capture time-to-first-token on the first chunk
      onChunk() {
        if (ttftMs === null) {
          ttftMs = Date.now() - startMs;
        }
      },
      // Persist metrics and response after streaming completes
      async onFinish({ text, usage }) {
        const latencyMs = Date.now() - startMs;

        updateTestRun(testRun.id, {
          assistantResponse: text,
          promptTokens: usage.inputTokens ?? null,
          completionTokens: usage.outputTokens ?? null,
          totalTokens: usage.totalTokens ?? null,
          latencyMs,
          ttftMs,
          status: "completed",
        });
      },
      // Persist error details if streaming fails mid-stream
      async onError({ error }) {
        const message = error instanceof Error ? error.message : "Unknown streaming error";
        const latencyMs = Date.now() - startMs;

        updateTestRun(testRun.id, {
          latencyMs,
          ttftMs,
          status: "error",
          error: message,
        });
      },
    });

    // Return the streaming response to the client.
    // The X-Test-Run-Id header lets the client reference the persisted test run.
    const response = result.toTextStreamResponse();
    response.headers.set("X-Test-Run-Id", testRun.id);
    return response;
  } catch (error: unknown) {
    // Handle synchronous failures (e.g. invalid model configuration)
    const message = error instanceof Error ? error.message : "Unknown error";
    const latencyMs = Date.now() - startMs;

    updateTestRun(testRun.id, {
      latencyMs,
      status: "error",
      error: message,
    });

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
