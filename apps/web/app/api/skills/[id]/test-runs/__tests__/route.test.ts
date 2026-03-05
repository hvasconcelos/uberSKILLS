import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getSkillById: vi.fn(),
  listTestRuns: vi.fn(),
}));

const { getSkillById, listTestRuns } = await import("@uberskills/db");
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListTestRuns = vi.mocked(listTestRuns);

const { GET } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/skills/sk-1/test-runs", { method: "GET" });
}

const fakeSkill = {
  id: "sk-1",
  name: "Test Skill",
  slug: "test-skill",
  description: "",
  trigger: "",
  tags: "[]",
  modelPattern: null,
  content: "",
  status: "draft" as const,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/skills/[id]/test-runs", () => {
  it("returns test runs for a skill with run numbers", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListTestRuns.mockReturnValue([
      {
        id: "tr-1",
        skillId: "sk-1",
        model: "claude",
        status: "completed" as const,
        totalTokens: 100,
        latencyMs: 500,
        error: null,
        assistantResponse: "hello",
        promptTokens: 50,
        completionTokens: 50,
        ttftMs: 100,
        createdAt: MOCK_DATE,
        systemPrompt: "",
        userMessage: "",
        arguments: "{}",
      },
      {
        id: "tr-2",
        skillId: "sk-1",
        model: "gpt-4",
        status: "error" as const,
        totalTokens: null,
        latencyMs: null,
        error: "timeout",
        assistantResponse: null,
        promptTokens: null,
        completionTokens: null,
        ttftMs: null,
        createdAt: MOCK_DATE,
        systemPrompt: "",
        userMessage: "",
        arguments: "{}",
      },
    ]);

    const response = await GET(makeRequest(), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.testRuns).toHaveLength(2);
    // Run numbers should be calculated: total - index
    expect(data.testRuns[0].runNumber).toBe(2);
    expect(data.testRuns[1].runNumber).toBe(1);
    expect(data.testRuns[0].id).toBe("tr-1");
    expect(data.testRuns[1].error).toBe("timeout");
  });

  it("returns empty array when skill has no test runs", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListTestRuns.mockReturnValue([]);

    const response = await GET(makeRequest(), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.testRuns).toEqual([]);
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await GET(makeRequest(), makeContext("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedGetSkillById.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET(makeRequest(), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("TEST_RUNS_READ_ERROR");
  });
});
