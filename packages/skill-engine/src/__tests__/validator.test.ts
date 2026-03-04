import type { SkillFrontmatter } from "@uberskillz/types";
import { describe, expect, it } from "vitest";
import { validateSkill } from "../validator";

const validFrontmatter: SkillFrontmatter = {
  name: "My Skill",
  description: "A useful skill that helps users.",
  trigger: "When the user asks for help",
};

const validContent =
  "# Instructions\n\nDo something useful. This content is long enough to pass the minimum length check.";

describe("validateSkill", () => {
  it("passes for a valid skill", () => {
    const result = validateSkill(validFrontmatter, validContent);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("passes with optional model_pattern as valid regex", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, model_pattern: "claude-.*" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- name validation ---

  it("fails when name is missing", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "name", severity: "error" }),
    );
  });

  it("fails when name is whitespace only", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "   " };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "name", severity: "error" }),
    );
  });

  it("fails when name exceeds 100 characters", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "A".repeat(101) };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "name", severity: "error" }),
    );
  });

  it("passes when name is exactly 100 characters", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "A".repeat(100) };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
  });

  // --- description validation ---

  it("warns when description is empty", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, description: "" };
    const result = validateSkill(fm, validContent);

    // Empty description is a warning, not an error — skill is still valid
    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "description", severity: "warning" }),
    );
  });

  it("fails when description exceeds 500 characters", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, description: "B".repeat(501) };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "description", severity: "error" }),
    );
  });

  it("passes when description is exactly 500 characters", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, description: "B".repeat(500) };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
  });

  // --- trigger validation ---

  it("fails when trigger is missing", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, trigger: "" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "trigger", severity: "error" }),
    );
  });

  it("fails when trigger is whitespace only", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, trigger: "  \n  " };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "trigger", severity: "error" }),
    );
  });

  // --- model_pattern validation ---

  it("fails when model_pattern is an invalid regex", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, model_pattern: "[invalid(" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "model_pattern", severity: "error" }),
    );
  });

  it("passes when model_pattern is undefined (optional)", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter };
    delete fm.model_pattern;
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
  });

  it("passes when model_pattern is an empty string", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, model_pattern: "" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
  });

  // --- content validation ---

  it("fails when content is empty", () => {
    const result = validateSkill(validFrontmatter, "");

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "content", severity: "error" }),
    );
  });

  it("fails when content is whitespace only", () => {
    const result = validateSkill(validFrontmatter, "   \n\n   ");

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "content", severity: "error" }),
    );
  });

  // --- multiple errors ---

  it("collects multiple errors and warnings at once", () => {
    const fm: SkillFrontmatter = {
      name: "",
      description: "",
      trigger: "",
      model_pattern: "[bad(",
    };
    const result = validateSkill(fm, "");

    expect(result.valid).toBe(false);
    // name(error), description(warning), trigger(error), model_pattern(error), content(error)
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });

  it("required-field errors have severity 'error'", () => {
    const fm: SkillFrontmatter = { name: "", description: "Has a description", trigger: "" };
    const result = validateSkill(fm, "");

    for (const err of result.errors) {
      expect(err.severity).toBe("error");
    }
  });

  // --- warning rules ---

  it("warns when content is very short", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter };
    const result = validateSkill(fm, "Short.");

    // Short content is a warning, skill is still valid
    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "content", severity: "warning" }),
    );
  });

  it("does not warn when content meets minimum length", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter };
    const result = validateSkill(fm, "A".repeat(50));

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warnings do not affect validity", () => {
    // Only warnings: empty description + short content
    const fm: SkillFrontmatter = { ...validFrontmatter, description: "" };
    const result = validateSkill(fm, "Short.");

    expect(result.valid).toBe(true);
    const warnings = result.errors.filter((e) => e.severity === "warning");
    expect(warnings.length).toBe(2);
  });
});
