import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getDecryptedApiKey: vi.fn(),
  getSkillById: vi.fn(),
  listFiles: vi.fn(),
  createTestRun: vi.fn(),
  updateTestRun: vi.fn(),
}));

vi.mock("@uberskills/skill-engine", () => ({
  substitute: vi.fn(),
  buildTestSystemPrompt: vi.fn(),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

const { getDecryptedApiKey, getSkillById, listFiles, createTestRun, updateTestRun } = await import(
  "@uberskills/db"
);
const mockedGetDecryptedApiKey = vi.mocked(getDecryptedApiKey);
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListFiles = vi.mocked(listFiles);
const mockedCreateTestRun = vi.mocked(createTestRun);
const mockedUpdateTestRun = vi.mocked(updateTestRun);

const { substitute, buildTestSystemPrompt } = await import("@uberskills/skill-engine");
const mockedSubstitute = vi.mocked(substitute);
const mockedBuildTestSystemPrompt = vi.mocked(buildTestSystemPrompt);

const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
const mockedCreateOpenRouter = vi.mocked(createOpenRouter);

const { streamText } = await import("ai");
const mockedStreamText = vi.mocked(streamText);

const { POST } = await import("../route");

/** Helper to build a POST request with a JSON body. */
function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Minimal valid request body for most tests. */
const validBody = {
  skillId: "skill-123",
  model: "anthropic/claude-sonnet-4",
  userMessage: "Hello, test this skill",
};

/** Fake skill returned by getSkillById. */
const fakeSkill = {
  id: "skill-123",
  name: "Test Skill",
  slug: "test-skill",
  description: "A test skill",
  trigger: "/test",
  tags: "[]",
  modelPattern: null,
  content: "You are a $ROLE. Help with $TASK.",
  status: "draft" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Fake test run row returned by createTestRun. */
const fakeTestRun = {
  id: "tr-abc",
  skillId: "skill-123",
  model: "anthropic/claude-sonnet-4",
  systemPrompt: "You are a developer. Help with coding.",
  userMessage: "Hello, test this skill",
  assistantResponse: null,
  arguments: "{}",
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  latencyMs: null,
  ttftMs: null,
  status: "running" as const,
  error: null,
  createdAt: new Date(),
};

/** Sets up the common mocks for a valid "happy path" test. */
function setupHappyPath() {
  mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");
  mockedGetSkillById.mockReturnValue(fakeSkill);
  mockedSubstitute.mockReturnValue("You are a developer. Help with coding.");
  mockedListFiles.mockReturnValue([]);
  mockedBuildTestSystemPrompt.mockReturnValue({
    systemPrompt: "You are a developer. Help with coding.",
    inlinedCount: 0,
    summarizedCount: 0,
  });
  mockedCreateTestRun.mockReturnValue(fakeTestRun);

  const mockModelFn = vi.fn().mockReturnValue({ modelId: "anthropic/claude-sonnet-4" });
  mockedCreateOpenRouter.mockReturnValue(
    mockModelFn as unknown as ReturnType<typeof createOpenRouter>,
  );

  return mockModelFn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/test", () => {
  // ---------------------------------------------------------------------------
  // API key validation
  // ---------------------------------------------------------------------------

  it("returns 401 when no API key is configured", async () => {
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("NO_API_KEY");
  });

  it("returns 500 when API key decryption fails", async () => {
    mockedGetDecryptedApiKey.mockImplementation(() => {
      throw new Error("decryption failed");
    });

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("DECRYPT_ERROR");
  });

  // ---------------------------------------------------------------------------
  // Request body validation
  // ---------------------------------------------------------------------------

  it("returns 400 when body is not valid JSON", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const request = new Request("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 400 when skillId is missing", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ model: "m", userMessage: "hi" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_SKILL_ID");
  });

  it("returns 400 when skillId is empty", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ skillId: "  ", model: "m", userMessage: "hi" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_SKILL_ID");
  });

  it("returns 400 when model is missing", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ skillId: "s1", userMessage: "hi" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_MODEL");
  });

  it("returns 400 when model is empty", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ skillId: "s1", model: " ", userMessage: "hi" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_MODEL");
  });

  it("returns 400 when userMessage is missing", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ skillId: "s1", model: "m" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_USER_MESSAGE");
  });

  it("returns 400 when userMessage is empty", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ skillId: "s1", model: "m", userMessage: "   " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_USER_MESSAGE");
  });

  it("returns 400 when arguments is not a plain object", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ ...validBody, arguments: "not-object" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_ARGUMENTS");
  });

  it("returns 400 when arguments is an array", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ ...validBody, arguments: ["a"] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_ARGUMENTS");
  });

  // ---------------------------------------------------------------------------
  // Skill not found
  // ---------------------------------------------------------------------------

  it("returns 404 when skill is not found", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");
    mockedGetSkillById.mockReturnValue(null);

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("SKILL_NOT_FOUND");
  });

  // ---------------------------------------------------------------------------
  // Happy path: streaming response
  // ---------------------------------------------------------------------------

  it("resolves placeholders, creates test run, and returns streaming response", async () => {
    const mockModelFn = setupHappyPath();

    const mockResponse = new Response("streamed data", { status: 200 });
    mockedStreamText.mockReturnValue({
      toTextStreamResponse: () => mockResponse,
    } as unknown as ReturnType<typeof streamText>);

    const response = await POST(
      makeRequest({ ...validBody, arguments: { ROLE: "developer", TASK: "coding" } }),
    );

    // Verify substitute was called with skill content and argument values
    expect(mockedSubstitute).toHaveBeenCalledWith("You are a $ROLE. Help with $TASK.", {
      ROLE: "developer",
      TASK: "coding",
    });

    // Verify test run was created with "running" status
    expect(mockedCreateTestRun).toHaveBeenCalledWith({
      skillId: "skill-123",
      model: "anthropic/claude-sonnet-4",
      systemPrompt: "You are a developer. Help with coding.",
      userMessage: "Hello, test this skill",
      arguments: JSON.stringify({ ROLE: "developer", TASK: "coding" }),
    });

    // Verify OpenRouter provider was configured correctly
    expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
      apiKey: "sk-or-v1-test",
      headers: {
        "HTTP-Referer": "https://uberskills.dev",
        "X-Title": "UberSkills",
      },
    });

    // Verify streamText was called with resolved content as system prompt
    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "You are a developer. Help with coding.",
        messages: [{ role: "user", content: "Hello, test this skill" }],
      }),
    );

    expect(mockModelFn).toHaveBeenCalledWith("anthropic/claude-sonnet-4");

    // Verify test run ID is exposed via header
    expect(response.headers.get("X-Test-Run-Id")).toBe("tr-abc");
  });

  it("defaults to empty arguments when none provided", async () => {
    setupHappyPath();
    mockedSubstitute.mockReturnValue(fakeSkill.content);

    const mockResponse = new Response("ok", { status: 200 });
    mockedStreamText.mockReturnValue({
      toTextStreamResponse: () => mockResponse,
    } as unknown as ReturnType<typeof streamText>);

    await POST(makeRequest(validBody));

    // substitute called with empty object for arguments
    expect(mockedSubstitute).toHaveBeenCalledWith(fakeSkill.content, {});

    // createTestRun stores serialized empty object
    expect(mockedCreateTestRun).toHaveBeenCalledWith(expect.objectContaining({ arguments: "{}" }));
  });

  // ---------------------------------------------------------------------------
  // onFinish callback: metrics persistence
  // ---------------------------------------------------------------------------

  it("onFinish updates test run with response and metrics", async () => {
    setupHappyPath();

    let capturedOnFinish: ((event: Record<string, unknown>) => void) | undefined;

    mockedStreamText.mockImplementation((opts: Record<string, unknown>) => {
      capturedOnFinish = opts.onFinish as typeof capturedOnFinish;
      return {
        toTextStreamResponse: () => new Response("ok"),
      } as unknown as ReturnType<typeof streamText>;
    });

    await POST(makeRequest(validBody));

    // Simulate the onFinish callback from AI SDK
    expect(capturedOnFinish).toBeDefined();
    await capturedOnFinish?.({
      text: "Here is the AI response.",
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    expect(mockedUpdateTestRun).toHaveBeenCalledWith("tr-abc", {
      assistantResponse: "Here is the AI response.",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      latencyMs: expect.any(Number),
      ttftMs: null,
      status: "completed",
    });
  });

  // ---------------------------------------------------------------------------
  // onError callback: error persistence
  // ---------------------------------------------------------------------------

  it("onError updates test run with error status", async () => {
    setupHappyPath();

    let capturedOnError: ((event: { error: unknown }) => void) | undefined;

    mockedStreamText.mockImplementation((opts: Record<string, unknown>) => {
      capturedOnError = opts.onError as typeof capturedOnError;
      return {
        toTextStreamResponse: () => new Response("ok"),
      } as unknown as ReturnType<typeof streamText>;
    });

    await POST(makeRequest(validBody));

    expect(capturedOnError).toBeDefined();
    await capturedOnError?.({ error: new Error("stream broke") });

    expect(mockedUpdateTestRun).toHaveBeenCalledWith("tr-abc", {
      latencyMs: expect.any(Number),
      ttftMs: null,
      status: "error",
      error: "stream broke",
    });
  });

  it("onError handles non-Error objects gracefully", async () => {
    setupHappyPath();

    let capturedOnError: ((event: { error: unknown }) => void) | undefined;

    mockedStreamText.mockImplementation((opts: Record<string, unknown>) => {
      capturedOnError = opts.onError as typeof capturedOnError;
      return {
        toTextStreamResponse: () => new Response("ok"),
      } as unknown as ReturnType<typeof streamText>;
    });

    await POST(makeRequest(validBody));

    await capturedOnError?.({ error: "plain string error" });

    expect(mockedUpdateTestRun).toHaveBeenCalledWith("tr-abc", {
      latencyMs: expect.any(Number),
      ttftMs: null,
      status: "error",
      error: "Unknown streaming error",
    });
  });

  // ---------------------------------------------------------------------------
  // Synchronous streamText failures
  // ---------------------------------------------------------------------------

  it("returns 401 and persists error when streamText throws auth error", async () => {
    setupHappyPath();
    mockedStreamText.mockImplementation(() => {
      throw new Error("401 Unauthorized");
    });

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_KEY");

    // Verify the test run was updated with error status
    expect(mockedUpdateTestRun).toHaveBeenCalledWith("tr-abc", {
      latencyMs: expect.any(Number),
      status: "error",
      error: "401 Unauthorized",
    });
  });

  it("returns 429 and persists error when streamText throws rate limit error", async () => {
    setupHappyPath();
    mockedStreamText.mockImplementation(() => {
      throw new Error("429 rate limit exceeded");
    });

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");

    expect(mockedUpdateTestRun).toHaveBeenCalledWith("tr-abc", {
      latencyMs: expect.any(Number),
      status: "error",
      error: "429 rate limit exceeded",
    });
  });

  it("returns 502 and persists error when streamText throws generic error", async () => {
    setupHappyPath();
    mockedStreamText.mockImplementation(() => {
      throw new Error("Connection refused");
    });

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe("UPSTREAM_ERROR");

    expect(mockedUpdateTestRun).toHaveBeenCalledWith("tr-abc", {
      latencyMs: expect.any(Number),
      status: "error",
      error: "Connection refused",
    });
  });

  // ---------------------------------------------------------------------------
  // onChunk callback: TTFT measurement
  // ---------------------------------------------------------------------------

  it("onChunk sets TTFT on first chunk only", async () => {
    setupHappyPath();

    let capturedOnChunk: (() => void) | undefined;
    let capturedOnFinish: ((event: Record<string, unknown>) => void) | undefined;

    mockedStreamText.mockImplementation((opts: Record<string, unknown>) => {
      capturedOnChunk = opts.onChunk as typeof capturedOnChunk;
      capturedOnFinish = opts.onFinish as typeof capturedOnFinish;
      return {
        toTextStreamResponse: () => new Response("ok"),
      } as unknown as ReturnType<typeof streamText>;
    });

    await POST(makeRequest(validBody));

    // Simulate two chunks -- only the first should set TTFT
    capturedOnChunk?.();
    capturedOnChunk?.();

    await capturedOnFinish?.({
      text: "response",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    // TTFT should be a number (set on first chunk, not reset on second)
    const updateCall = (mockedUpdateTestRun as Mock).mock.calls[0] as [string, { ttftMs: number }];
    expect(updateCall[1].ttftMs).toBeTypeOf("number");
    expect(updateCall[1].ttftMs).toBeGreaterThanOrEqual(0);
  });
});
