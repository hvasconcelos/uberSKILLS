import type { SkillFrontmatter } from "@uberskills/types";
import { describe, expect, it } from "vitest";
import { validateSkill } from "../validator";

const validFrontmatter: SkillFrontmatter = {
  name: "my-skill",
  description: "A useful skill that helps users. Use when the user asks for help.",
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
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "a".repeat(100) };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
  });

  it("warns when name is not kebab-case", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "My Skill" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "name",
        severity: "warning",
        message: "Name should be kebab-case (e.g. 'my-skill').",
      }),
    );
  });

  it("does not warn when name is kebab-case", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "my-great-skill" };
    const result = validateSkill(fm, validContent);

    const nameWarnings = result.errors.filter(
      (e) => e.field === "name" && e.severity === "warning",
    );
    expect(nameWarnings).toHaveLength(0);
  });

  it("fails when name contains 'claude'", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "claude-helper" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "name",
        severity: "error",
        message: "Skill names must not contain 'claude' or 'anthropic' (reserved).",
      }),
    );
  });

  it("fails when name contains 'anthropic' (case-insensitive)", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "my-Anthropic-tool" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "name",
        severity: "error",
        message: "Skill names must not contain 'claude' or 'anthropic' (reserved).",
      }),
    );
  });

  it("fails when name contains XML angle brackets", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, name: "<my-skill>" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "name",
        severity: "error",
        message: "Frontmatter fields must not contain XML angle brackets.",
      }),
    );
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
    const fm: SkillFrontmatter = {
      ...validFrontmatter,
      description: `Use when ${"B".repeat(491)}`,
    };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
  });

  it("fails when description contains XML angle brackets", () => {
    const fm: SkillFrontmatter = {
      ...validFrontmatter,
      description: "Does <something> useful. Use when asked.",
    };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "description",
        severity: "error",
        message: "Frontmatter fields must not contain XML angle brackets.",
      }),
    );
  });

  it("warns when description lacks trigger language", () => {
    const fm: SkillFrontmatter = {
      ...validFrontmatter,
      description: "A useful skill that helps users.",
    };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "description",
        severity: "warning",
        message: "Description should explain WHAT the skill does AND WHEN to use it.",
      }),
    );
  });

  it("does not warn when description has trigger language", () => {
    const fm: SkillFrontmatter = {
      ...validFrontmatter,
      description: "Generates React components. Use when the user asks to create a component.",
    };
    const result = validateSkill(fm, validContent);

    const descWarnings = result.errors.filter(
      (e) => e.field === "description" && e.message.includes("WHAT"),
    );
    expect(descWarnings).toHaveLength(0);
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

  it("fails when trigger contains XML angle brackets", () => {
    const fm: SkillFrontmatter = { ...validFrontmatter, trigger: "When <user> asks" };
    const result = validateSkill(fm, validContent);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: "trigger",
        severity: "error",
        message: "Frontmatter fields must not contain XML angle brackets.",
      }),
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
    const fm: SkillFrontmatter = {
      name: "",
      description: "Has a description. Use when testing.",
      trigger: "",
    };
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
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});
