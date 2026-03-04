import { getTestRun } from "@uberskillz/db";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/test/[id] -- fetches a single test run by ID
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const testRun = getTestRun(id);

    if (!testRun) {
      return NextResponse.json(
        { error: `Test run "${id}" not found`, code: "NOT_FOUND" },
        { status: 404 },
      );
    }

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
      createdAt: testRun.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve test run", code: "TEST_RUN_READ_ERROR" },
      { status: 500 },
    );
  }
}
