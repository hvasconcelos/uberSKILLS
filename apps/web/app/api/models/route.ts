import { getDecryptedApiKey } from "@uberskillz/db";
import { NextResponse } from "next/server";

/** Minimal model shape returned to the client. */
interface OpenRouterModel {
  id: string;
  name: string;
}

/**
 * GET /api/models -- Fetches available models from OpenRouter.
 *
 * Requires a valid API key stored in settings. Returns a sorted list of
 * model IDs and display names for the Default Model dropdown.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const apiKey = getDecryptedApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Add one in Settings first.", code: "NO_API_KEY" },
        { status: 401 },
      );
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://uberskillz.dev",
        "X-Title": "UberSkillz",
      },
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) {
        return NextResponse.json(
          { error: "Invalid API key", code: "INVALID_KEY" },
          { status: 401 },
        );
      }
      if (status === 429) {
        return NextResponse.json(
          { error: "Rate limited by OpenRouter. Try again shortly.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `OpenRouter returned status ${status}`, code: "UPSTREAM_ERROR" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { data: { id: string; name: string }[] };

    const models: OpenRouterModel[] = (data.data ?? [])
      .map((m) => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json(
      {
        error: "Could not reach OpenRouter. Check your network connection.",
        code: "NETWORK_ERROR",
      },
      { status: 502 },
    );
  }
}
