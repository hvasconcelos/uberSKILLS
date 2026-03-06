import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskills/db", () => ({
  isModelCacheEmpty: vi.fn(),
  listModels: vi.fn(),
}));

vi.mock("@/lib/sync-models", () => ({
  fetchAndSyncModels: vi.fn(),
}));

const { isModelCacheEmpty, listModels } = await import("@uberskills/db");
const mockedIsModelCacheEmpty = vi.mocked(isModelCacheEmpty);
const mockedListModels = vi.mocked(listModels);

const { fetchAndSyncModels } = await import("@/lib/sync-models");
const mockedFetchAndSyncModels = vi.mocked(fetchAndSyncModels);

const { GET } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/models", () => {
  it("returns sorted model list from cache", async () => {
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

  it("auto-syncs when cache is empty", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    mockedFetchAndSyncModels.mockResolvedValue(5);
    mockedListModels.mockReturnValue([]);

    const response = await GET();
    const data = await response.json();

    expect(mockedFetchAndSyncModels).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(data.models).toEqual([]);
  });

  it("does not sync when cache is populated", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(false);
    mockedListModels.mockReturnValue([]);

    await GET();

    expect(mockedFetchAndSyncModels).not.toHaveBeenCalled();
  });

  it("returns empty list when auto-sync fails silently", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(true);
    mockedFetchAndSyncModels.mockRejectedValue(new Error("sync failed"));
    mockedListModels.mockReturnValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toEqual([]);
  });

  it("returns 500 when listModels throws", async () => {
    mockedIsModelCacheEmpty.mockReturnValue(false);
    mockedListModels.mockImplementation(() => {
      throw new Error("db error");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
