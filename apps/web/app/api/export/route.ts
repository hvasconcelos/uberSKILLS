import { listFiles, listSkills } from "@uberskillz/db";
import { generateSkillMd } from "@uberskillz/skill-engine";
import { zipSync } from "fflate";
import { NextResponse } from "next/server";

/**
 * GET /api/export -- Exports all skills as a single zip file.
 *
 * Each skill is placed in its own subdirectory (named by slug) containing:
 * - SKILL.md (the main skill file)
 * - Any auxiliary files associated with the skill
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = listSkills({ limit: 10000 });

    if (result.data.length === 0) {
      return NextResponse.json({ error: "No skills to export.", code: "EMPTY" }, { status: 404 });
    }

    // Build the zip file structure: { "path/to/file": Uint8Array }
    const files: Record<string, Uint8Array> = {};
    const encoder = new TextEncoder();

    for (const skill of result.data) {
      const dir = skill.slug;

      // Generate SKILL.md from the skill data
      const skillMd = generateSkillMd(
        {
          name: skill.name,
          description: skill.description,
          trigger: skill.trigger,
          model_pattern: skill.modelPattern ?? undefined,
        },
        skill.content,
      );

      files[`${dir}/SKILL.md`] = encoder.encode(skillMd);

      // Include auxiliary files
      const skillFiles = listFiles(skill.id);
      for (const file of skillFiles) {
        files[`${dir}/${file.path}`] = encoder.encode(file.content);
      }
    }

    const zipped = zipSync(files);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `uberskillz-export-${timestamp}.zip`;

    return new NextResponse(Buffer.from(zipped), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipped.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export skills.", code: "EXPORT_ERROR" },
      { status: 500 },
    );
  }
}
