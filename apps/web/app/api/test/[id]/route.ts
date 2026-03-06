import { getTestRun } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/test/[id]");

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/test/[id] -- fetches a single test run by ID
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const rlog = log.child({ testRunId: id });

  try {
    const testRun = getTestRun(id);

    if (!testRun) {
      rlog.warn("test run not found");
      return NextResponse.json(
        { error: `Test run "${id}" not found`, code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    rlog.info("test run retrieved");
    return NextResponse.json({
      id: testRun.id,
      skillId: testRun.skillId,
      model: testRun.model,
      status: testRun.status,
      promptTokens: testRun.promptTokens,
      completionTokens: testRun.completionTokens,
      totalTokens: testRun.totalTokens,
      latencyMs: testRun.latencyMs,
      ttftMs: testRun.ttftMs,
      error: testRun.error,
      sandboxStateId: testRun.sandboxStateId,
      hasSandboxResult: !!testRun.sandboxResult,
      createdAt: testRun.createdAt,
    });
  } catch (err) {
    rlog.error({ err }, "failed to retrieve test run");
    return NextResponse.json(
      { error: "Failed to retrieve test run", code: "TEST_RUN_READ_ERROR" },
      { status: 500 },
    );
  }
}
