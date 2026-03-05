import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getDecryptedApiKey: vi.fn(),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn().mockImplementation((msgs: unknown) => Promise.resolve(msgs)),
}));

const { getDecryptedApiKey } = await import("@uberskills/db");
const mockedGetDecryptedApiKey = vi.mocked(getDecryptedApiKey);

const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
const mockedCreateOpenRouter = vi.mocked(createOpenRouter);

const { streamText } = await import("ai");
const mockedStreamText = vi.mocked(streamText);

const { POST } = await import("../route");

/** Helper to build a POST request with a JSON body. */
function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat", () => {
  it("returns 401 when no API key is configured", async () => {
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await POST(
      makeRequest({
        messages: [{ role: "user", content: "hi" }],
        model: "anthropic/claude-sonnet-4",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("NO_API_KEY");
  });

  it("returns 500 when API key decryption fails", async () => {
    mockedGetDecryptedApiKey.mockImplementation(() => {
      throw new Error("decryption failed");
    });

    const response = await POST(
      makeRequest({
        messages: [{ role: "user", content: "hi" }],
        model: "anthropic/claude-sonnet-4",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("DECRYPT_ERROR");
  });

  it("returns 400 when body is not valid JSON", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 400 when messages is missing or empty", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ messages: [], model: "anthropic/claude-sonnet-4" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_MESSAGES");
  });

  it("returns 400 when messages is not an array", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(
      makeRequest({ messages: "not-array", model: "anthropic/claude-sonnet-4" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_MESSAGES");
  });

  it("returns 400 when model is missing", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(makeRequest({ messages: [{ role: "user", content: "hi" }] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_MODEL");
  });

  it("returns 400 when model is empty string", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const response = await POST(
      makeRequest({ messages: [{ role: "user", content: "hi" }], model: "  " }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_MODEL");
  });

  it("creates OpenRouter provider with correct headers and streams response", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    // Mock the provider factory to return a model selector function
    const mockModelFn = vi.fn().mockReturnValue({ modelId: "anthropic/claude-sonnet-4" });
    mockedCreateOpenRouter.mockReturnValue(
      mockModelFn as unknown as ReturnType<typeof createOpenRouter>,
    );

    // Mock streamText to return an object with toUIMessageStreamResponse
    const mockResponse = new Response("streamed data", { status: 200 });
    mockedStreamText.mockReturnValue({
      toUIMessageStreamResponse: () => mockResponse,
    } as unknown as ReturnType<typeof streamText>);

    const messages = [{ role: "user" as const, content: "Create a React component skill" }];
    const response = await POST(makeRequest({ messages, model: "anthropic/claude-sonnet-4" }));

    // Verify OpenRouter provider was created with the API key and headers
    expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
      apiKey: "sk-or-v1-test",
      headers: {
        "HTTP-Referer": "https://uberskills.dev",
        "X-Title": "UberSkills",
      },
    });

    // Verify the model selector was called with the correct model id
    expect(mockModelFn).toHaveBeenCalledWith("anthropic/claude-sonnet-4");

    // Verify streamText was called with system prompt and messages
    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("SKILL.md"),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Create a React component skill" }),
        ]),
      }),
    );

    expect(response).toBe(mockResponse);
  });

  it("returns 502 when streamText throws a generic error", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const mockModelFn = vi.fn().mockReturnValue({ modelId: "test/model" });
    mockedCreateOpenRouter.mockReturnValue(
      mockModelFn as unknown as ReturnType<typeof createOpenRouter>,
    );
    mockedStreamText.mockImplementation(() => {
      throw new Error("Connection refused");
    });

    const response = await POST(
      makeRequest({ messages: [{ role: "user", content: "hi" }], model: "test/model" }),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe("UPSTREAM_ERROR");
  });

  it("returns 401 when streamText throws an auth error", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-bad");

    const mockModelFn = vi.fn().mockReturnValue({ modelId: "test/model" });
    mockedCreateOpenRouter.mockReturnValue(
      mockModelFn as unknown as ReturnType<typeof createOpenRouter>,
    );
    mockedStreamText.mockImplementation(() => {
      throw new Error("401 Unauthorized");
    });

    const response = await POST(
      makeRequest({ messages: [{ role: "user", content: "hi" }], model: "test/model" }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_KEY");
  });

  it("returns 429 when streamText throws a rate limit error", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-key");

    const mockModelFn = vi.fn().mockReturnValue({ modelId: "test/model" });
    mockedCreateOpenRouter.mockReturnValue(
      mockModelFn as unknown as ReturnType<typeof createOpenRouter>,
    );
    mockedStreamText.mockImplementation(() => {
      throw new Error("429 rate limit exceeded");
    });

    const response = await POST(
      makeRequest({ messages: [{ role: "user", content: "hi" }], model: "test/model" }),
    );
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });
});
