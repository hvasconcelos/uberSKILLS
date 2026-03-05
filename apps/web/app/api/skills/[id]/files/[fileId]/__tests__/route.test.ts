import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getSkillById: vi.fn(),
  listFiles: vi.fn(),
  updateFile: vi.fn(),
  deleteFile: vi.fn(),
}));

const { getSkillById, listFiles, updateFile, deleteFile } = await import("@uberskills/db");
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListFiles = vi.mocked(listFiles);
const mockedUpdateFile = vi.mocked(updateFile);
const mockedDeleteFile = vi.mocked(deleteFile);

const { PUT, DELETE } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

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

function makeContext(id: string, fileId: string) {
  return { params: Promise.resolve({ id, fileId }) };
}

function makePutRequest(body: unknown): Request {
  return new Request("http://localhost/api/skills/sk-1/files/f-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request("http://localhost/api/skills/sk-1/files/f-1", { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// PUT /api/skills/[id]/files/[fileId]
// ---------------------------------------------------------------------------
describe("PUT /api/skills/[id]/files/[fileId]", () => {
  it("updates file and returns updated data", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);
    mockedUpdateFile.mockReturnValue({
      id: "f-1",
      skillId: "sk-1",
      path: "prompts/updated.md",
      content: "Updated",
      type: "prompt",
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
    });

    const response = await PUT(
      makePutRequest({ path: "prompts/updated.md", content: "Updated" }),
      makeContext("sk-1", "f-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.path).toBe("prompts/updated.md");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/skills/sk-1/files/f-1", {
      method: "PUT",
      body: "not json",
    });

    const response = await PUT(request, makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await PUT(makePutRequest({ content: "x" }), makeContext("x", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 400 for empty path", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ path: "  " }), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for absolute path", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ path: "/etc/hosts" }), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for path traversal", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await PUT(
      makePutRequest({ path: "resources/../../../escape" }),
      makeContext("sk-1", "f-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for duplicate path (excluding current file)", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([
      {
        id: "f-other",
        skillId: "sk-1",
        path: "taken.md",
        content: "",
        type: "resource",
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ]);

    const response = await PUT(makePutRequest({ path: "taken.md" }), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.code).toBe("DUPLICATE_PATH");
  });

  it("allows updating path to same value (own file)", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([
      {
        id: "f-1",
        skillId: "sk-1",
        path: "same.md",
        content: "",
        type: "resource",
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ]);
    mockedUpdateFile.mockReturnValue({
      id: "f-1",
      skillId: "sk-1",
      path: "same.md",
      content: "updated",
      type: "resource",
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
    });

    const response = await PUT(
      makePutRequest({ path: "same.md", content: "updated" }),
      makeContext("sk-1", "f-1"),
    );

    expect(response.status).toBe(200);
  });

  it("returns 400 for invalid type", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ type: "invalid" }), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-string content", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ content: 123 }), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when file not found during update", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedUpdateFile.mockReturnValue(null);

    const response = await PUT(
      makePutRequest({ content: "new" }),
      makeContext("sk-1", "nonexistent"),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedUpdateFile.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await PUT(makePutRequest({ content: "x" }), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("FILE_UPDATE_ERROR");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/skills/[id]/files/[fileId]
// ---------------------------------------------------------------------------
describe("DELETE /api/skills/[id]/files/[fileId]", () => {
  it("deletes file and returns success", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedDeleteFile.mockReturnValue(true);

    const response = await DELETE(makeDeleteRequest(), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await DELETE(makeDeleteRequest(), makeContext("x", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 404 when file not found", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedDeleteFile.mockReturnValue(false);

    const response = await DELETE(makeDeleteRequest(), makeContext("sk-1", "nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedGetSkillById.mockReturnValue(fakeSkill as ReturnType<typeof getSkillById>);
    mockedDeleteFile.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await DELETE(makeDeleteRequest(), makeContext("sk-1", "f-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("FILE_DELETE_ERROR");
  });
});
