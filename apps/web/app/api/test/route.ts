import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  createTestRun,
  getDecryptedApiKey,
  getSandboxState,
  getSkillById,
  updateTestRun,
} from "@uberskills/db";
import { substitute } from "@uberskills/skill-engine";
import { Sandbox } from "@uberskills/skill-engine/server";
import type { SandboxResult } from "@uberskills/types";
import { stepCountIs, streamText, type ToolSet } from "ai";
import { NextResponse } from "next/server";
import { routeLogger } from "@/lib/logger";

const log = routeLogger("POST", "/api/test");

/** Expected request body for POST /api/test. */
interface TestRequestBody {
  skillId: string;
  model: string;
  userMessage: string;
  arguments?: Record<string, string>;
  /** Optional sandbox state ID to run with filesystem sandbox. */
  sandboxStateId?: string;
}

/**
 * POST /api/test -- Executes a skill test run with streaming.
 *
 * Flow:
 * 1. Validate request and fetch skill from database
 * 2. Resolve $VARIABLE_NAME placeholders in skill content
 * 3. Optionally initialize a sandbox from a stored zip
 * 4. Create a test_runs row with status "running"
 * 5. Stream AI response using resolved content as system prompt
 * 6. If sandbox: provide a `bash` tool for file operations
 * 7. On completion: capture metrics, sandbox output zip, and update test run
 * 8. On error: update test run with error details
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

  const { skillId, model, userMessage, arguments: args, sandboxStateId } = body;

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

  // Initialize sandbox if requested
  let sandbox: Sandbox | null = null;
  if (sandboxStateId) {
    const sandboxState = getSandboxState(sandboxStateId);
    if (!sandboxState) {
      return NextResponse.json(
        { error: `Sandbox state "${sandboxStateId}" not found`, code: "SANDBOX_NOT_FOUND" },
        { status: 404 },
      );
    }

    try {
      const zipAbsPath = resolve("data", sandboxState.zipPath);
      const zipBuffer = await readFile(zipAbsPath);
      sandbox = new Sandbox();
      await sandbox.init(zipBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize sandbox";
      return NextResponse.json({ error: message, code: "SANDBOX_INIT_ERROR" }, { status: 500 });
    }
  }

  // Resolve $VARIABLE_NAME placeholders in skill content
  const substitutionValues = args ?? {};
  const resolvedContent = substitute(skill.content, substitutionValues);

  // Augment system prompt with sandbox context if available
  let systemPrompt = resolvedContent;
  if (sandbox) {
    systemPrompt += [
      "",
      "",
      "## Sandbox Environment",
      "",
      "You have access to a sandboxed project directory via the `bash` tool.",
      "Use standard bash commands (ls, cat, grep, sed, mkdir, cp, mv, rm, etc.) to",
      "read and modify files. The working directory is the project root.",
      "All file operations are isolated to this sandbox.",
    ].join("\n");
  }

  log.info({ skillId, model, hasSandbox: !!sandbox }, "test run started");

  // Persist test run with status "running" before streaming starts
  const testRun = createTestRun({
    skillId,
    model,
    systemPrompt,
    userMessage,
    arguments: JSON.stringify(substitutionValues),
    sandboxStateId: sandboxStateId ?? undefined,
  });

  const rlog = log.child({ testRunId: testRun.id });

  // Record request start time for latency and TTFT measurement
  const startMs = Date.now();
  let ttftMs: number | null = null;

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://uberskills.dev",
      "X-Title": "UberSkills",
    },
  });

  // Shared callbacks for streaming lifecycle
  const onChunk = () => {
    if (ttftMs === null) {
      ttftMs = Date.now() - startMs;
    }
  };

  const onFinish = async ({
    text,
    usage,
  }: {
    text: string;
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  }) => {
    const latencyMs = Date.now() - startMs;

    // If sandbox is active, save the output zip and result metadata
    let sandboxResultJson: string | undefined;
    if (sandbox) {
      try {
        const outputZip = await sandbox.toZip();
        const outputFileIndex = await sandbox.buildFileIndex();

        // Store output zip to disk
        const outputZipRelPath = `sandboxes/${skillId}/runs/${testRun.id}-output.zip`;
        const outputZipAbsPath = resolve("data", outputZipRelPath);
        await mkdir(dirname(outputZipAbsPath), { recursive: true });
        await writeFile(outputZipAbsPath, outputZip);

        const sandboxResult: SandboxResult = {
          outputZipPath: outputZipRelPath,
          outputFileIndex,
          toolCalls: sandbox.getLog(),
        };
        sandboxResultJson = JSON.stringify(sandboxResult);
      } catch (err) {
        rlog.error({ err }, "failed to save sandbox output");
      } finally {
        await sandbox.cleanup();
      }
    }

    updateTestRun(testRun.id, {
      assistantResponse: text,
      promptTokens: usage.inputTokens ?? null,
      completionTokens: usage.outputTokens ?? null,
      totalTokens: usage.totalTokens ?? null,
      latencyMs,
      ttftMs,
      status: "completed",
      sandboxResult: sandboxResultJson ?? null,
    });

    rlog.info({ latencyMs, tokens: usage.totalTokens ?? 0, ttftMs }, "test run completed");
  };

  const onError = async ({ error }: { error: unknown }) => {
    const message = error instanceof Error ? error.message : "Unknown streaming error";
    const latencyMs = Date.now() - startMs;

    if (sandbox) {
      await sandbox.cleanup();
    }

    updateTestRun(testRun.id, {
      latencyMs,
      ttftMs,
      status: "error",
      error: message,
    });

    rlog.error({ err: error, latencyMs }, "test run stream error");
  };

  try {
    // Use separate streamText calls to avoid conditional tool type issues
    // Build sandbox tool separately to help type inference
    // Build the streamText config based on whether sandbox mode is active.
    // When sandbox is enabled, the AI gets a `bash` tool for running commands.
    const streamConfig = {
      model: openrouter(model),
      system: systemPrompt,
      messages: [{ role: "user" as const, content: userMessage }],
      onChunk,
      onFinish,
      onError,
    };

    // Create sandbox tools. The AI SDK tool() helper expects zod v3 schemas,
    // but this project uses zod v4. We construct the tool manually and cast.
    const sandboxRef = sandbox;
    const sandboxTools = sandboxRef
      ? ({
          bash: {
            description:
              "Run a bash command in the sandboxed project directory. " +
              "Supports standard commands: ls, cat, grep, sed, awk, find, mkdir, cp, mv, rm, " +
              "echo, head, tail, wc, sort, uniq, diff, touch, chmod, tree, jq, etc.",
            inputSchema: {
              type: "object",
              properties: {
                command: { type: "string", description: "The bash command to execute" },
              },
              required: ["command"],
            },
            execute: async (input: Record<string, unknown>) => {
              const command = input.command as string;
              return sandboxRef.exec(command);
            },
          },
        } as unknown as ToolSet)
      : undefined;

    const result = sandboxTools
      ? streamText({
          ...streamConfig,
          tools: sandboxTools,
          stopWhen: stepCountIs(20),
        })
      : streamText(streamConfig);

    // Return the streaming response to the client.
    // The X-Test-Run-Id header lets the client reference the persisted test run.
    const response = result.toTextStreamResponse();
    response.headers.set("X-Test-Run-Id", testRun.id);
    return response;
  } catch (error: unknown) {
    // Handle synchronous failures (e.g. invalid model configuration)
    const message = error instanceof Error ? error.message : "Unknown error";
    const latencyMs = Date.now() - startMs;

    if (sandbox) {
      await sandbox.cleanup();
    }

    updateTestRun(testRun.id, {
      latencyMs,
      status: "error",
      error: message,
    });

    rlog.error({ err: error, latencyMs }, "test run failed");

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
