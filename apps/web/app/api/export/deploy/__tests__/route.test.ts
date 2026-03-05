import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getSkillById: vi.fn(),
  listFiles: vi.fn(),
  updateSkill: vi.fn(),
}));

vi.mock("@uberskills/skill-engine/server", () => ({
  deployToFilesystem: vi.fn(),
}));

const { getSkillById, listFiles, updateSkill } = await import("@uberskills/db");
const { deployToFilesystem } = await import("@uberskills/skill-engine/server");
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListFiles = vi.mocked(listFiles);
const mockedUpdateSkill = vi.mocked(updateSkill);
const mockedDeployToFilesystem = vi.mocked(deployToFilesystem);

const { POST } = await import("../route");

const MOCK_DATE = new Date("2026-01-01T00:00:00Z");

const makeSkill = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "sk_1",
  name: "Test Skill",
  slug: "test-skill",
  description: "A test",
  trigger: "test trigger",
  tags: "[]",
  modelPattern: null,
  content: "# Instructions",
  status: "draft" as const,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
  ...overrides,
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/export/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/export/deploy", () => {
  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/export/deploy", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 400 when skillId is missing", async () => {
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when skillId is empty string", async () => {
    const response = await POST(makeRequest({ skillId: "  " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await POST(makeRequest({ skillId: "nonexistent" }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("deploys skill and updates status to deployed", async () => {
    const skill = makeSkill();
    mockedGetSkillById.mockReturnValue(skill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedDeployToFilesystem.mockResolvedValue("/home/user/.claude/skills/test-skill");

    const response = await POST(makeRequest({ skillId: "sk_1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.path).toBe("/home/user/.claude/skills/test-skill");
    expect(data.status).toBe("deployed");
    expect(mockedUpdateSkill).toHaveBeenCalledWith("sk_1", { status: "deployed" });
    expect(mockedDeployToFilesystem).toHaveBeenCalledOnce();
  });

  it("deploys skill with associated files", async () => {
    const skill = makeSkill();
    mockedGetSkillById.mockReturnValue(skill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([
      {
        id: "f_1",
        skillId: "sk_1",
        path: "prompts/setup.md",
        content: "Setup content",
        type: "prompt",
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ]);
    mockedDeployToFilesystem.mockResolvedValue("/home/user/.claude/skills/test-skill");

    const response = await POST(makeRequest({ skillId: "sk_1" }));

    expect(response.status).toBe(200);
    // Verify files were passed to deployToFilesystem
    const callArgs = mockedDeployToFilesystem.mock.calls[0];
    expect(callArgs?.[1]).toHaveLength(1);
    expect(callArgs?.[1]?.[0]?.path).toBe("prompts/setup.md");
  });

  it("returns 400 on path traversal error", async () => {
    const skill = makeSkill();
    mockedGetSkillById.mockReturnValue(skill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedDeployToFilesystem.mockRejectedValue(new Error("Path traversal detected: bad path"));

    const response = await POST(makeRequest({ skillId: "sk_1" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("PATH_TRAVERSAL");
  });

  it("returns 500 on filesystem error", async () => {
    const skill = makeSkill();
    mockedGetSkillById.mockReturnValue(skill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedDeployToFilesystem.mockRejectedValue(new Error("EACCES: permission denied"));

    const response = await POST(makeRequest({ skillId: "sk_1" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("DEPLOY_ERROR");
    expect(data.error).toContain("permission denied");
  });
});
