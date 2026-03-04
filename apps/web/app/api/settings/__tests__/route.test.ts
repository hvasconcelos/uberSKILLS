import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskillz/db", () => ({
  getAllSettings: vi.fn(),
  getDecryptedApiKey: vi.fn(),
  setSetting: vi.fn(),
}));

const { getAllSettings, getDecryptedApiKey, setSetting } = await import("@uberskillz/db");
const mockedGetAllSettings = vi.mocked(getAllSettings);
const mockedGetDecryptedApiKey = vi.mocked(getDecryptedApiKey);
const mockedSetSetting = vi.mocked(setSetting);

const { GET, PUT } = await import("../route");

const MOCK_DATE = new Date("2026-01-01T00:00:00Z");

/** Creates a setting row with a default updatedAt timestamp. */
function makeSettingRow(key: string, value: string, encrypted = false) {
  return { key, value, encrypted, updatedAt: MOCK_DATE };
}

/** Creates a PUT request with a JSON body. */
function makePutRequest(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/settings", () => {
  it("returns default settings when no settings exist", async () => {
    mockedGetAllSettings.mockReturnValue([]);
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      openrouterApiKey: null,
      defaultModel: "anthropic/claude-sonnet-4",
      theme: "system",
    });
  });

  it("returns stored settings with masked API key", async () => {
    mockedGetAllSettings.mockReturnValue([
      makeSettingRow("defaultModel", "anthropic/claude-haiku-3.5"),
      makeSettingRow("theme", "dark"),
      makeSettingRow("openrouterApiKey", "encrypted-blob", true),
    ]);
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-abcdef1234567890");

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.defaultModel).toBe("anthropic/claude-haiku-3.5");
    expect(data.theme).toBe("dark");
    expect(data.openrouterApiKey).toMatch(/^\.+7890$/);
    expect(data.openrouterApiKey).not.toContain("sk-or-v1");
  });

  it("masks short API keys with dots", async () => {
    mockedGetAllSettings.mockReturnValue([]);
    mockedGetDecryptedApiKey.mockReturnValue("abcd");

    const response = await GET();
    const data = await response.json();

    expect(data.openrouterApiKey).toBe("....");
  });

  it("returns 500 on database error", async () => {
    mockedGetAllSettings.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to retrieve settings",
      code: "SETTINGS_READ_ERROR",
    });
  });
});

describe("PUT /api/settings", () => {
  it("updates a single setting and returns updated state", async () => {
    mockedGetAllSettings.mockReturnValue([makeSettingRow("theme", "dark")]);
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await PUT(makePutRequest({ theme: "dark" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockedSetSetting).toHaveBeenCalledWith("theme", "dark");
    expect(data.theme).toBe("dark");
  });

  it("encrypts the API key when updating", async () => {
    mockedGetAllSettings.mockReturnValue([makeSettingRow("openrouterApiKey", "encrypted", true)]);
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-new-key");

    const response = await PUT(makePutRequest({ openrouterApiKey: "sk-or-v1-new-key" }));

    expect(response.status).toBe(200);
    expect(mockedSetSetting).toHaveBeenCalledWith("openrouterApiKey", "sk-or-v1-new-key", true);
  });

  it("updates multiple settings at once", async () => {
    mockedGetAllSettings.mockReturnValue([
      makeSettingRow("defaultModel", "google/gemini-pro"),
      makeSettingRow("theme", "light"),
    ]);
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await PUT(
      makePutRequest({ defaultModel: "google/gemini-pro", theme: "light" }),
    );

    expect(response.status).toBe(200);
    expect(mockedSetSetting).toHaveBeenCalledWith("defaultModel", "google/gemini-pro");
    expect(mockedSetSetting).toHaveBeenCalledWith("theme", "light");
  });

  it("rejects invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await PUT(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("rejects invalid theme value", async () => {
    const response = await PUT(makePutRequest({ theme: "midnight" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("theme must be one of");
  });

  it("rejects non-string openrouterApiKey", async () => {
    const response = await PUT(makePutRequest({ openrouterApiKey: 12345 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("openrouterApiKey must be a string");
  });

  it("rejects non-string defaultModel", async () => {
    const response = await PUT(makePutRequest({ defaultModel: true }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 on database write error", async () => {
    mockedSetSetting.mockImplementation(() => {
      throw new Error("Write failure");
    });

    const response = await PUT(makePutRequest({ theme: "dark" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("SETTINGS_WRITE_ERROR");
  });
});
