import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getTestRun } from "@uberskills/db";
import { readTextFileFromZip } from "@uberskills/skill-engine/server";
import type { SandboxResult } from "@uberskills/types";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/test/[id]/sandbox");

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/test/[id]/sandbox -- Get sandbox result metadata for a test run.
 * GET /api/test/[id]/sandbox?download=true -- Download the output zip.
 * GET /api/test/[id]/sandbox?file=src/index.ts -- Read a text file from the output zip.
 */
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse | Response> {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const rlog = log.child({ testRunId: id });

  const testRun = getTestRun(id);
  if (!testRun) {
    return NextResponse.json(
      { error: `Test run "${id}" not found`, code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!testRun.sandboxResult) {
    return NextResponse.json(
      { error: "This test run does not have sandbox results", code: "NO_SANDBOX" },
      { status: 404 },
    );
  }

  const sandboxResult = JSON.parse(testRun.sandboxResult) as SandboxResult;

  // Download output zip
  if (searchParams.get("download") === "true") {
    try {
      const zipAbsPath = resolve("data", sandboxResult.outputZipPath);
      const zipBuffer = await readFile(zipAbsPath);

      return new Response(zipBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="sandbox-output-${id}.zip"`,
          "Content-Length": String(zipBuffer.length),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Output zip file not found on disk", code: "FILE_NOT_FOUND" },
        { status: 404 },
      );
    }
  }

  // Read a specific file from the output zip
  const filePath = searchParams.get("file");
  if (filePath) {
    try {
      const zipAbsPath = resolve("data", sandboxResult.outputZipPath);
      const zipBuffer = await readFile(zipAbsPath);
      const content = readTextFileFromZip(zipBuffer, filePath);

      if (content === null) {
        return NextResponse.json(
          { error: `File "${filePath}" not found in output zip`, code: "FILE_NOT_FOUND" },
          { status: 404 },
        );
      }

      return NextResponse.json({ path: filePath, content });
    } catch {
      return NextResponse.json(
        { error: "Failed to read file from output zip", code: "FILE_READ_ERROR" },
        { status: 500 },
      );
    }
  }

  // Return sandbox result metadata
  rlog.info("sandbox result retrieved");
  return NextResponse.json({
    outputFileIndex: sandboxResult.outputFileIndex,
    toolCalls: sandboxResult.toolCalls,
  });
}
