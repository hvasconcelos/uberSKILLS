import { getSkillById, listTestRuns } from "@uberskillz/db";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/test-runs — list all test runs for a skill
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const skill = getSkillById(id);
    if (!skill) {
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
      createdAt: run.createdAt,
    }));

    return NextResponse.json({ testRuns });
  } catch {
    return NextResponse.json(
      { error: "Failed to list test runs", code: "TEST_RUNS_READ_ERROR" },
      { status: 500 },
    );
  }
}
