import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  listSkills: vi.fn(),
  listFiles: vi.fn(),
  getSkillById: vi.fn(),
}));

vi.mock("@uberskills/skill-engine", () => ({
  generateSkillMd: vi.fn(),
}));

const { listSkills, listFiles, getSkillById } = await import("@uberskills/db");
const { generateSkillMd } = await import("@uberskills/skill-engine");
const mockedListSkills = vi.mocked(listSkills);
const mockedListFiles = vi.mocked(listFiles);
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedGenerateSkillMd = vi.mocked(generateSkillMd);

const { GET, POST } = await import("../route");

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

beforeEach(() => {
  vi.clearAllMocks();
  mockedGenerateSkillMd.mockReturnValue("---\nname: Test Skill\n---\n\n# Instructions\n");
});

describe("GET /api/export", () => {
  it("returns 404 when no skills exist", async () => {
    mockedListSkills.mockReturnValue({ data: [], total: 0, page: 1, limit: 10000, totalPages: 0 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("EMPTY");
  });

  it("returns a zip file with skills", async () => {
    mockedListSkills.mockReturnValue({
      data: [makeSkill()],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
    });
    mockedListFiles.mockReturnValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain("uberskills-export-");
    expect(mockedGenerateSkillMd).toHaveBeenCalledOnce();
    expect(mockedListFiles).toHaveBeenCalledWith("sk_1");
  });

  it("returns 500 on error", async () => {
    mockedListSkills.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("EXPORT_ERROR");
  });
});

describe("POST /api/export", () => {
  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/export", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 400 when neither skillId nor skillIds provided", async () => {
    const request = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for empty skillIds array", async () => {
    const request = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillIds: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const request = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId: "nonexistent" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("exports a single skill as zip with slug-based filename", async () => {
    const skill = makeSkill();
    mockedGetSkillById.mockReturnValue(skill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);

    const request = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId: "sk_1" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="test-skill.zip"',
    );
  });

  it("exports multiple skills with generic filename", async () => {
    const skill1 = makeSkill({ id: "sk_1", slug: "skill-one" });
    const skill2 = makeSkill({ id: "sk_2", slug: "skill-two" });
    mockedGetSkillById
      .mockReturnValueOnce(skill1 as ReturnType<typeof getSkillById>)
      .mockReturnValueOnce(skill2 as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);

    const request = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillIds: ["sk_1", "sk_2"] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="uberskills-export.zip"',
    );
    expect(mockedGetSkillById).toHaveBeenCalledTimes(2);
  });

  it("returns 500 on unexpected error", async () => {
    mockedGetSkillById.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const request = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId: "sk_1" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("EXPORT_ERROR");
  });
});
