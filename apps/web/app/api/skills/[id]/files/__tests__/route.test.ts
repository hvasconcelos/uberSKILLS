import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getSkillById: vi.fn(),
  listFiles: vi.fn(),
  createFile: vi.fn(),
}));

const { getSkillById, listFiles, createFile } = await import("@uberskills/db");
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListFiles = vi.mocked(listFiles);
const mockedCreateFile = vi.mocked(createFile);

const { GET, POST } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const fakeSkill = {
  id: "sk-1",
  name: "Test",
  slug: "test",
  description: "",
  trigger: "",
  tags: "[]",
  modelPattern: null,
  content: "",
  status: "draft" as const,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
};

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/skills/sk-1/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/skills/[id]/files
// ---------------------------------------------------------------------------
describe("GET /api/skills/[id]/files", () => {
  it("returns files for a skill", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([
      {
        id: "f-1",
        skillId: "sk-1",
        path: "prompts/setup.md",
        content: "Setup",
        type: "prompt",
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ]);

    const request = new Request("http://localhost/api/skills/sk-1/files", { method: "GET" });
    const response = await GET(request, makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.files).toHaveLength(1);
    expect(data.files[0].path).toBe("prompts/setup.md");
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const request = new Request("http://localhost/api/skills/x/files", { method: "GET" });
    const response = await GET(request, makeContext("x"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedGetSkillById.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const request = new Request("http://localhost/api/skills/sk-1/files", { method: "GET" });
    const response = await GET(request, makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("FILES_READ_ERROR");
  });
});

// ---------------------------------------------------------------------------
// POST /api/skills/[id]/files
// ---------------------------------------------------------------------------
describe("POST /api/skills/[id]/files", () => {
  it("creates a file and returns 201", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedCreateFile.mockReturnValue({
      id: "f-new",
      skillId: "sk-1",
      path: "prompts/init.md",
      content: "Init content",
      type: "prompt",
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
    });

    const response = await POST(
      makePostRequest({ path: "prompts/init.md", content: "Init content", type: "prompt" }),
      makeContext("sk-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.path).toBe("prompts/init.md");
    expect(mockedCreateFile).toHaveBeenCalledWith({
      skillId: "sk-1",
      path: "prompts/init.md",
      content: "Init content",
      type: "prompt",
    });
  });

  it("defaults type to resource when not provided", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedCreateFile.mockReturnValue({
      id: "f-new",
      skillId: "sk-1",
      path: "resources/data.md",
      content: "",
      type: "resource",
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
    });

    await POST(makePostRequest({ path: "resources/data.md" }), makeContext("sk-1"));

    expect(mockedCreateFile).toHaveBeenCalledWith(expect.objectContaining({ type: "resource" }));
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/skills/sk-1/files", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request, makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await POST(makePostRequest({ path: "test.md" }), makeContext("x"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 400 when path is missing", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await POST(makePostRequest({ content: "no path" }), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when path is empty", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await POST(makePostRequest({ path: "   " }), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for absolute path", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await POST(makePostRequest({ path: "/etc/hosts" }), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("relative path");
  });

  it("returns 400 for path traversal", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await POST(
      makePostRequest({ path: "../escape/file.md" }),
      makeContext("sk-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("..");
  });

  it("returns 400 for invalid type", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await POST(
      makePostRequest({ path: "test.md", type: "invalid" }),
      makeContext("sk-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-string content", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await POST(
      makePostRequest({ path: "test.md", content: 123 }),
      makeContext("sk-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for duplicate path", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([
      {
        id: "f-1",
        skillId: "sk-1",
        path: "prompts/setup.md",
        content: "",
        type: "prompt",
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ]);

    const response = await POST(makePostRequest({ path: "prompts/setup.md" }), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.code).toBe("DUPLICATE_PATH");
  });

  it("returns 500 on database error during creation", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedCreateFile.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await POST(makePostRequest({ path: "test.md" }), makeContext("sk-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("FILE_CREATE_ERROR");
  });
});
