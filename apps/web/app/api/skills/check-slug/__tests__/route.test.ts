import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getSkillBySlug: vi.fn(),
}));

const { getSkillBySlug } = await import("@uberskills/db");
const mockedGetSkillBySlug = vi.mocked(getSkillBySlug);

const { GET } = await import("../route");

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/skills/check-slug");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/skills/check-slug", () => {
  it("returns available: true when slug does not exist", async () => {
    mockedGetSkillBySlug.mockReturnValue(null);

    const response = await GET(makeRequest({ slug: "new-skill" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
  });

  it("returns available: false when slug already exists", async () => {
    mockedGetSkillBySlug.mockReturnValue({ id: "skill-abc" } as ReturnType<typeof getSkillBySlug>);

    const response = await GET(makeRequest({ slug: "taken-slug" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
  });

  it("returns available: true when slug exists but matches excludeId", async () => {
    mockedGetSkillBySlug.mockReturnValue({
      id: "skill-abc",
    } as ReturnType<typeof getSkillBySlug>);

    const response = await GET(makeRequest({ slug: "my-skill", excludeId: "skill-abc" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
  });

  it("returns available: false when slug exists and excludeId does not match", async () => {
    mockedGetSkillBySlug.mockReturnValue({
      id: "skill-abc",
    } as ReturnType<typeof getSkillBySlug>);

    const response = await GET(makeRequest({ slug: "my-skill", excludeId: "skill-other" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
  });

  it("returns 400 when slug is missing", async () => {
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when slug is empty", async () => {
    const response = await GET(makeRequest({ slug: "   " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});
