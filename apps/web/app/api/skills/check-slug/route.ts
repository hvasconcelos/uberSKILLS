import { getSkillBySlug } from "@uberskillz/db";
import { NextResponse } from "next/server";

// GET /api/skills/check-slug?slug=my-skill&excludeId=abc123
// Returns { available: boolean } indicating whether the slug is free to use.
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug || slug.trim().length === 0) {
    return NextResponse.json(
      { error: "slug query parameter is required", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const excludeId = searchParams.get("excludeId");
  const existing = getSkillBySlug(slug.trim());
  const available = !existing || existing.id === excludeId;

  return NextResponse.json({ available });
}
