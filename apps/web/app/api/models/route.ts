import { isModelCacheEmpty, listModels } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";
import { fetchAndSyncModels, isSyncError } from "@/lib/sync-models";

const log = routeLogger("GET", "/api/models");

/**
 * GET /api/models -- Returns cached models from the database.
 *
 * On first access (empty cache), auto-syncs from OpenRouter.
 * Subsequent requests are instant DB reads.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Auto-populate on first access
    if (isModelCacheEmpty()) {
      await fetchAndSyncModels();
    }

    const rows = listModels();

    const models = rows
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        provider: r.provider,
        contextLength: r.contextLength,
        inputPrice: r.inputPrice,
        outputPrice: r.outputPrice,
        modality: r.modality,
      }))
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    log.info({ count: models.length }, "models loaded");
    return NextResponse.json({ models });
  } catch (err) {
    if (isSyncError(err)) {
      log.warn({ code: err.code }, err.message);
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus },
      );
    }
    log.error({ err }, "failed to load models");
    return NextResponse.json(
      { error: "Failed to load models", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
