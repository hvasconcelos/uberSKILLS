import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  getDecryptedApiKey: vi.fn(),
}));

const { getDecryptedApiKey } = await import("@uberskills/db");
const mockedGetDecryptedApiKey = vi.mocked(getDecryptedApiKey);

const { GET } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/settings/test", () => {
  it("returns 401 when no API key is configured", async () => {
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("NO_API_KEY");
  });

  it("returns connected status on successful OpenRouter call", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-valid-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("connected");
  });

  it("sends correct authorization headers to OpenRouter", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await GET();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-or-v1-test",
          "HTTP-Referer": "https://uberskills.dev",
          "X-Title": "UberSkills",
        }),
      }),
    );
  });

  it("returns 401 when OpenRouter returns 401", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-bad");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_KEY");
  });

  it("returns 401 when OpenRouter returns 403", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-bad");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_KEY");
  });

  it("returns 429 when rate limited", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Too Many Requests", { status: 429 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("returns 502 for other OpenRouter errors", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe("UPSTREAM_ERROR");
  });

  it("returns 502 on network error", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-key");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe("NETWORK_ERROR");
  });
});
