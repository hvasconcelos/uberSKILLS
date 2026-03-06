import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  isModelCacheEmpty: vi.fn(),
  listModels: vi.fn(),
}));

vi.mock("@/lib/sync-models", () => ({
  fetchAndSyncModels: vi.fn(),
  isSyncError: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  routeLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const { isModelCacheEmpty, listModels } = await import("@uberskills/db");
const { fetchAndSyncModels, isSyncError } = await import("@/lib/sync-models");
const mockedIsModelCacheEmpty = vi.mocked(isModelCacheEmpty);
const mockedListModels = vi.mocked(listModels);
const mockedFetchAndSyncModels = vi.mocked(fetchAndSyncModels);
const mockedIsSyncError = vi.mocked(isSyncError);

const { GET } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/models", () => {
  it("returns 401 when no API key is configured", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    const err = Object.assign(new Error("No API key configured"), {
      code: "NO_API_KEY",
      httpStatus: 401,
    });
    mockedFetchAndSyncModels.mockRejectedValueOnce(err);
    mockedIsSyncError.mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("NO_API_KEY");
  });

  it("returns sorted model list with provider field on success", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(false);
    mockedListModels.mockReturnValue([
      {
        id: "openai/gpt-4",
        slug: "openai-gpt-4",
        name: "GPT-4",
        provider: "openai",
        contextLength: 8192,
        inputPrice: "0.03",
        outputPrice: "0.06",
        modality: "text->text",
        syncedAt: new Date(),
      },
      {
        id: "anthropic/claude-sonnet-4",
        slug: "anthropic-claude-sonnet-4",
        name: "Claude Sonnet 4",
        provider: "anthropic",
        contextLength: 200000,
        inputPrice: "0.003",
        outputPrice: "0.015",
        modality: "text->text",
        syncedAt: new Date(),
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toHaveLength(2);
    // Sorted by provider: anthropic before openai
    expect(data.models[0].id).toBe("anthropic/claude-sonnet-4");
    expect(data.models[0].provider).toBe("anthropic");
    expect(data.models[1].id).toBe("openai/gpt-4");
    expect(data.models[1].provider).toBe("openai");
  });

  it("auto-syncs on first access when cache is empty", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    mockedFetchAndSyncModels.mockResolvedValueOnce(1);
    mockedListModels.mockReturnValue([
      {
        id: "openai/gpt-4",
        slug: "openai-gpt-4",
        name: "GPT-4",
        provider: "openai",
        contextLength: 8192,
        inputPrice: "0.03",
        outputPrice: "0.06",
        modality: "text->text",
        syncedAt: new Date(),
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(mockedFetchAndSyncModels).toHaveBeenCalledOnce();
    expect(data.models).toHaveLength(1);
    expect(data.models[0].id).toBe("openai/gpt-4");
  });

  it("skips sync when cache is populated", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(false);
    mockedListModels.mockReturnValue([]);

    await GET();

    expect(mockedFetchAndSyncModels).not.toHaveBeenCalled();
  });

  it("returns 401 when OpenRouter returns 401", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    const err = Object.assign(new Error("Invalid API key"), {
      code: "INVALID_KEY",
      httpStatus: 401,
    });
    mockedFetchAndSyncModels.mockRejectedValueOnce(err);
    mockedIsSyncError.mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_KEY");
  });

  it("returns 429 when rate limited", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    const err = Object.assign(new Error("Rate limited"), {
      code: "RATE_LIMITED",
      httpStatus: 429,
    });
    mockedFetchAndSyncModels.mockRejectedValueOnce(err);
    mockedIsSyncError.mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("returns 502 on network error", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    const err = Object.assign(new Error("Upstream error"), {
      code: "UPSTREAM_ERROR",
      httpStatus: 502,
    });
    mockedFetchAndSyncModels.mockRejectedValueOnce(err);
    mockedIsSyncError.mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe("UPSTREAM_ERROR");
  });
});
