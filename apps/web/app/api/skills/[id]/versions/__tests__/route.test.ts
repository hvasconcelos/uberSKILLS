import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getSkillById: vi.fn(),
  listVersions: vi.fn(),
}));

const { getSkillById, listVersions } = await import("@uberskills/db");
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListVersions = vi.mocked(listVersions);

const { GET } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/skills/sk-1/versions", { method: "GET" });
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

describe("GET /api/skills/[id]/versions", () => {
  it("returns versions for a skill", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListVersions.mockReturnValue([
      {
        id: "v-1",
        skillId: "sk-1",
        version: 1,
        contentSnapshot: "# V1",
        metadataSnapshot: "{}",
        changeSummary: "Initial version",
        createdAt: MOCK_DATE,
      },
      {
        id: "v-2",
        skillId: "sk-1",
        version: 2,
        contentSnapshot: "# V2",
        metadataSnapshot: "{}",
        changeSummary: "Updated content",
        createdAt: MOCK_DATE,
      },
    ]);

    const response = await GET(makeRequest(), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versions).toHaveLength(2);
    expect(data.versions[0].version).toBe(1);
    expect(data.versions[1].changeSummary).toBe("Updated content");
  });

  it("returns empty versions array for a new skill", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListVersions.mockReturnValue([]);

    const response = await GET(makeRequest(), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versions).toEqual([]);
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
    expect(data.code).toBe("VERSIONS_READ_ERROR");
  });
});
