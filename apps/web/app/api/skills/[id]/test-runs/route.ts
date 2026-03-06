import { getSkillById, listTestRuns } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/skills/[id]/test-runs");

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/test-runs — list all test runs for a skill
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const rlog = log.child({ skillId: id });

  try {
    const skill = getSkillById(id);
    if (!skill) {
      rlog.warn("skill not found");
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const runs = listTestRuns(id);

    // Return only the fields needed by the history table to keep the payload small.
    const testRuns = runs.map((run, index) => ({
      id: run.id,
      runNumber: runs.length - index,
      model: run.model,
      status: run.status,
      totalTokens: run.totalTokens,
      latencyMs: run.latencyMs,
      error: run.error,
      assistantResponse: run.assistantResponse,
      promptTokens: run.promptTokens,
      completionTokens: run.completionTokens,
      ttftMs: run.ttftMs,
      sandboxStateId: run.sandboxStateId ?? null,
      hasSandboxResult: !!run.sandboxResult,
      createdAt: run.createdAt,
    }));

    rlog.info({ count: testRuns.length }, "test runs listed");
    return NextResponse.json({ testRuns });
  } catch (err) {
    rlog.error({ err }, "failed to list test runs");
    return NextResponse.json(
      { error: "Failed to list test runs", code: "TEST_RUNS_READ_ERROR" },
      { status: 500 },
    );
  }
}
