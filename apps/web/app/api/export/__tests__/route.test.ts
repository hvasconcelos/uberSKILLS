import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskillz/db", () => ({
  listSkills: vi.fn(),
  listFiles: vi.fn(),
}));

vi.mock("@uberskillz/skill-engine", () => ({
  generateSkillMd: vi.fn(),
}));

const { listSkills, listFiles } = await import("@uberskillz/db");
const { generateSkillMd } = await import("@uberskillz/skill-engine");
const mockedListSkills = vi.mocked(listSkills);
const mockedListFiles = vi.mocked(listFiles);
const mockedGenerateSkillMd = vi.mocked(generateSkillMd);

const { GET } = await import("../route");

const MOCK_DATE = new Date("2026-01-01T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
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
      data: [
        {
          id: "1",
          name: "Test Skill",
          slug: "test-skill",
          description: "A test",
          trigger: "test trigger",
          tags: "[]",
          modelPattern: null,
          content: "# Instructions",
          status: "draft",
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
        },
      ],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
    });

    mockedListFiles.mockReturnValue([]);
    mockedGenerateSkillMd.mockReturnValue("---\nname: Test Skill\n---\n\n# Instructions\n");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain("uberskillz-export-");
    expect(mockedGenerateSkillMd).toHaveBeenCalledOnce();
    expect(mockedListFiles).toHaveBeenCalledWith("1");
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
