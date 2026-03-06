import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getTestRun: vi.fn(),
}));

const { getTestRun } = await import("@uberskills/db");
const mockedGetTestRun = vi.mocked(getTestRun);

const { GET } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/test/tr-123", { method: "GET" });
}

const fakeTestRun = {
  id: "tr-123",
  skillId: "skill-abc",
  model: "anthropic/claude-sonnet-4",
  systemPrompt: "You are a helper.",
  userMessage: "Hello",
  assistantResponse: "Hi there!",
  arguments: "{}",
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  latencyMs: 1200,
  ttftMs: 200,
  status: "completed" as const,
  error: null,
  sandboxStateId: null,
  sandboxResult: null,
  createdAt: MOCK_DATE,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/test/[id]", () => {
  it("returns test run data by ID", async () => {
    mockedGetTestRun.mockReturnValue(fakeTestRun);

    const response = await GET(makeRequest(), makeContext("tr-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("tr-123");
    expect(data.skillId).toBe("skill-abc");
    expect(data.model).toBe("anthropic/claude-sonnet-4");
    expect(data.status).toBe("completed");
    expect(data.promptTokens).toBe(100);
    expect(data.completionTokens).toBe(50);
    expect(data.totalTokens).toBe(150);
    expect(data.latencyMs).toBe(1200);
    expect(data.ttftMs).toBe(200);
    expect(data.error).toBeNull();
  });

  it("returns 404 when test run not found", async () => {
    mockedGetTestRun.mockReturnValue(null);

    const response = await GET(makeRequest(), makeContext("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedGetTestRun.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET(makeRequest(), makeContext("tr-123"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("TEST_RUN_READ_ERROR");
  });
});
