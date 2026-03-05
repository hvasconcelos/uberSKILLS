import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  createSkill: vi.fn(),
  createVersion: vi.fn(),
  createFile: vi.fn(),
  getSkillBySlug: vi.fn(),
  updateSkill: vi.fn(),
}));

vi.mock("@uberskills/skill-engine/server", () => ({
  importFromDirectory: vi.fn(),
  importFromZip: vi.fn(),
}));

const { createSkill, createVersion, createFile, getSkillBySlug, updateSkill } = await import(
  "@uberskills/db"
);
const { importFromDirectory, importFromZip } = await import("@uberskills/skill-engine/server");
const mockedCreateSkill = vi.mocked(createSkill);
const mockedCreateVersion = vi.mocked(createVersion);
const mockedCreateFile = vi.mocked(createFile);
const mockedGetSkillBySlug = vi.mocked(getSkillBySlug);
const mockedUpdateSkill = vi.mocked(updateSkill);
const mockedImportFromDirectory = vi.mocked(importFromDirectory);
const mockedImportFromZip = vi.mocked(importFromZip);

const { POST } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Invalid request type
// ---------------------------------------------------------------------------
describe("POST /api/import — invalid type", () => {
  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 400 for unknown type", async () => {
    const response = await POST(makeJsonRequest({ type: "unknown" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_TYPE");
  });
});

// ---------------------------------------------------------------------------
// Directory scan
// ---------------------------------------------------------------------------
describe("POST /api/import — directory scan", () => {
  it("returns scanned skills with conflict info", async () => {
    mockedImportFromDirectory.mockResolvedValue([
      {
        skill: {
          frontmatter: { name: "My Skill", description: "A skill", trigger: "test" },
          content: "# Instructions",
        },
        files: [],
        valid: true,
        errors: [],
        source: "/path/to/skill",
      },
    ]);
    mockedGetSkillBySlug.mockReturnValue(null);

    const response = await POST(
      makeJsonRequest({ type: "directory", path: "/home/user/.claude/skills" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].slug).toBe("my-skill");
    expect(data.skills[0].conflict).toBe(false);
  });

  it("marks conflicting skills", async () => {
    mockedImportFromDirectory.mockResolvedValue([
      {
        skill: {
          frontmatter: { name: "Existing Skill", description: "", trigger: "" },
          content: "",
        },
        files: [],
        valid: true,
        errors: [],
        source: "/path",
      },
    ]);
    mockedGetSkillBySlug.mockReturnValue({ id: "existing-id" } as ReturnType<
      typeof getSkillBySlug
    >);

    const response = await POST(makeJsonRequest({ type: "directory", path: "/some/dir" }));
    const data = await response.json();

    expect(data.skills[0].conflict).toBe(true);
  });

  it("returns 400 when path is missing", async () => {
    const response = await POST(makeJsonRequest({ type: "directory" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when directory scan fails", async () => {
    mockedImportFromDirectory.mockRejectedValue(new Error("ENOENT"));

    const response = await POST(makeJsonRequest({ type: "directory", path: "/bad/path" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("DIRECTORY_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Zip upload
// ---------------------------------------------------------------------------
describe("POST /api/import — zip upload", () => {
  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost/api/import", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("MISSING_FILE");
  });

  it("returns 400 for non-zip file", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.txt", { type: "text/plain" }));
    const request = new Request("http://localhost/api/import", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_FILE_TYPE");
  });

  it("processes a valid zip upload", async () => {
    mockedImportFromZip.mockResolvedValue([
      {
        skill: {
          frontmatter: { name: "Zipped", description: "", trigger: "" },
          content: "",
        },
        files: [],
        valid: true,
        errors: [],
        source: "zipped-skill",
      },
    ]);
    mockedGetSkillBySlug.mockReturnValue(null);

    const formData = new FormData();
    formData.append("file", new File(["zip content"], "skills.zip"));
    const request = new Request("http://localhost/api/import", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].slug).toBe("zipped");
  });

  it("returns 400 when zip processing fails", async () => {
    mockedImportFromZip.mockRejectedValue(new Error("Invalid zip"));

    const formData = new FormData();
    formData.append("file", new File(["bad data"], "bad.zip"));
    const request = new Request("http://localhost/api/import", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("ZIP_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------
describe("POST /api/import — confirm", () => {
  it("creates new skills and returns 201", async () => {
    mockedGetSkillBySlug.mockReturnValue(null);
    mockedCreateSkill.mockReturnValue({
      id: "new-skill-id",
      name: "Imported Skill",
      slug: "imported-skill",
      description: "",
      trigger: "",
      tags: "[]",
      modelPattern: null,
      content: "# Content",
      status: "draft" as const,
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
    });
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    const response = await POST(
      makeJsonRequest({
        type: "confirm",
        skills: [
          {
            frontmatter: { name: "Imported Skill", description: "", trigger: "" },
            content: "# Content",
            files: [{ path: "prompts/init.md", content: "Init", type: "prompt" }],
          },
        ],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toHaveLength(1);
    expect(data.imported[0].action).toBe("created");
    expect(mockedCreateSkill).toHaveBeenCalledOnce();
    expect(mockedCreateVersion).toHaveBeenCalledOnce();
    expect(mockedCreateFile).toHaveBeenCalledOnce();
  });

  it("updates existing skill when overwrite is true", async () => {
    mockedGetSkillBySlug.mockReturnValue({
      id: "existing-id",
      name: "Old",
      slug: "imported-skill",
    } as ReturnType<typeof getSkillBySlug>);

    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    const response = await POST(
      makeJsonRequest({
        type: "confirm",
        skills: [
          {
            frontmatter: { name: "Imported Skill", description: "New desc", trigger: "" },
            content: "# Updated",
            files: [],
            overwrite: true,
          },
        ],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported[0].action).toBe("updated");
    expect(mockedUpdateSkill).toHaveBeenCalledWith("existing-id", expect.any(Object));
    expect(mockedCreateSkill).not.toHaveBeenCalled();
  });

  it("returns 409 on conflict without overwrite", async () => {
    mockedGetSkillBySlug.mockReturnValue({
      id: "existing-id",
    } as ReturnType<typeof getSkillBySlug>);

    const response = await POST(
      makeJsonRequest({
        type: "confirm",
        skills: [
          {
            frontmatter: { name: "Conflict Skill", description: "", trigger: "" },
            content: "",
            files: [],
          },
        ],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });

  it("returns 400 when skills is missing or empty", async () => {
    const response = await POST(makeJsonRequest({ type: "confirm", skills: [] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when skill has no frontmatter.name", async () => {
    const response = await POST(
      makeJsonRequest({
        type: "confirm",
        skills: [{ frontmatter: {}, content: "", files: [] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 on database save error", async () => {
    mockedGetSkillBySlug.mockReturnValue(null);
    mockedCreateSkill.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await POST(
      makeJsonRequest({
        type: "confirm",
        skills: [
          {
            frontmatter: { name: "Fail Skill", description: "", trigger: "" },
            content: "",
            files: [],
          },
        ],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("IMPORT_SAVE_ERROR");
  });
});
