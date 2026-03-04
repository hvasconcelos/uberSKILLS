import { getAllSettings, getDecryptedApiKey, setSetting } from "@uberskillz/db";
import type { AppSettings, Theme } from "@uberskillz/types";
import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const DEFAULT_THEME: Theme = "system";
const VALID_THEMES: Theme[] = ["light", "dark", "system"];

/**
 * Masks an API key for safe display: shows only the last 4 characters.
 * Returns null if the key is null or too short to partially reveal.
 */
function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return "....";
  return ".".repeat(key.length - 4) + key.slice(-4);
}

/**
 * Builds an AppSettings object from the raw settings rows.
 * Falls back to defaults for missing keys.
 */
function buildAppSettings(
  rows: ReturnType<typeof getAllSettings>,
  decryptedApiKey: string | null,
): AppSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    openrouterApiKey: maskApiKey(decryptedApiKey),
    defaultModel: map.get("defaultModel") ?? DEFAULT_MODEL,
    theme: (map.get("theme") as Theme) ?? DEFAULT_THEME,
  };
}

/** Reads the current settings and returns them as an AppSettings response. */
function respondWithCurrentSettings(): NextResponse<AppSettings> {
  const rows = getAllSettings();
  const decryptedApiKey = getDecryptedApiKey();
  return NextResponse.json(buildAppSettings(rows, decryptedApiKey));
}

// GET /api/settings -- returns current application settings with masked API key
export async function GET(): Promise<NextResponse> {
  try {
    return respondWithCurrentSettings();
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve settings", code: "SETTINGS_READ_ERROR" },
      { status: 500 },
    );
  }
}

// PUT /api/settings -- updates one or more settings fields
export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const { openrouterApiKey, defaultModel, theme } = body;

  // Validate individual fields when present
  if (openrouterApiKey !== undefined && typeof openrouterApiKey !== "string") {
    return NextResponse.json(
      { error: "openrouterApiKey must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (defaultModel !== undefined && typeof defaultModel !== "string") {
    return NextResponse.json(
      { error: "defaultModel must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (theme !== undefined) {
    if (typeof theme !== "string" || !VALID_THEMES.includes(theme as Theme)) {
      return NextResponse.json(
        {
          error: `theme must be one of: ${VALID_THEMES.join(", ")}`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }
  }

  try {
    if (openrouterApiKey !== undefined) {
      setSetting("openrouterApiKey", openrouterApiKey as string, true);
    }
    if (defaultModel !== undefined) {
      setSetting("defaultModel", defaultModel as string);
    }
    if (theme !== undefined) {
      setSetting("theme", theme as string);
    }

    return respondWithCurrentSettings();
  } catch {
    return NextResponse.json(
      { error: "Failed to update settings", code: "SETTINGS_WRITE_ERROR" },
      { status: 500 },
    );
  }
}
