import type { SkillFrontmatter } from "@uberskillz/types";
import { describe, expect, it } from "vitest";
import { generateSkillMd } from "../generator";
import { parseSkillMd } from "../parser";

const baseFrontmatter: SkillFrontmatter = {
  name: "My Skill",
  description: "A helpful skill",
  trigger: "When the user says hello",
};

const baseContent = "# Instructions\n\nDo something useful.";

describe("generateSkillMd", () => {
  it("generates valid SKILL.md with all frontmatter fields", () => {
    const fm: SkillFrontmatter = { ...baseFrontmatter, model_pattern: "claude-.*" };
    const output = generateSkillMd(fm, baseContent);

    expect(output).toContain("---\n");
    expect(output).toContain("name: My Skill\n");
    expect(output).toContain("description: A helpful skill\n");
    expect(output).toContain("trigger: When the user says hello\n");
    expect(output).toContain("model_pattern: claude-.*\n");
    expect(output).toContain("# Instructions\n\nDo something useful.");
  });

  it("omits model_pattern when undefined", () => {
    const output = generateSkillMd(baseFrontmatter, baseContent);

    expect(output).not.toContain("model_pattern");
  });

  it("omits model_pattern when null", () => {
    const fm: SkillFrontmatter = {
      ...baseFrontmatter,
      model_pattern: undefined,
    };
    const output = generateSkillMd(fm, baseContent);

    expect(output).not.toContain("model_pattern");
  });

  it("omits model_pattern when empty string", () => {
    const fm: SkillFrontmatter = { ...baseFrontmatter, model_pattern: "" };
    const output = generateSkillMd(fm, baseContent);

    expect(output).not.toContain("model_pattern");
  });

  it("ends with a trailing newline", () => {
    const output = generateSkillMd(baseFrontmatter, baseContent);

    expect(output.endsWith("\n")).toBe(true);
  });

  it("wraps frontmatter in --- delimiters", () => {
    const output = generateSkillMd(baseFrontmatter, baseContent);

    expect(output.startsWith("---\n")).toBe(true);
    expect(output).toMatch(/\n---\n/);
  });

  it("trims extra whitespace from content", () => {
    const output = generateSkillMd(baseFrontmatter, "  \n  Some content  \n  ");

    expect(output).toContain("Some content");
    expect(output).not.toContain("  Some content  ");
  });

  it("handles empty content", () => {
    const output = generateSkillMd(baseFrontmatter, "");

    expect(output).toContain("---\n");
    expect(output.endsWith("\n")).toBe(true);
  });

  it("preserves multiline content", () => {
    const multiline = "# Step 1\n\nDo this.\n\n# Step 2\n\nDo that.";
    const output = generateSkillMd(baseFrontmatter, multiline);

    expect(output).toContain("# Step 1\n\nDo this.\n\n# Step 2\n\nDo that.");
  });

  // --- Round-trip tests: generateSkillMd → parseSkillMd ---

  it("round-trips with parser: all fields including model_pattern", () => {
    const fm: SkillFrontmatter = { ...baseFrontmatter, model_pattern: "gpt-4.*" };
    const generated = generateSkillMd(fm, baseContent);
    const parsed = parseSkillMd(generated);

    expect(parsed.frontmatter.name).toBe(fm.name);
    expect(parsed.frontmatter.description).toBe(fm.description);
    expect(parsed.frontmatter.trigger).toBe(fm.trigger);
    expect(parsed.frontmatter.model_pattern).toBe(fm.model_pattern);
    expect(parsed.content).toBe(baseContent);
  });

  it("round-trips with parser: without model_pattern", () => {
    const generated = generateSkillMd(baseFrontmatter, baseContent);
    const parsed = parseSkillMd(generated);

    expect(parsed.frontmatter.name).toBe(baseFrontmatter.name);
    expect(parsed.frontmatter.description).toBe(baseFrontmatter.description);
    expect(parsed.frontmatter.trigger).toBe(baseFrontmatter.trigger);
    expect(parsed.frontmatter.model_pattern).toBeUndefined();
    expect(parsed.content).toBe(baseContent);
  });

  it("round-trips with parser: multiline content with horizontal rules", () => {
    const content = "Some text.\n\n---\n\nMore text after rule.";
    const generated = generateSkillMd(baseFrontmatter, content);
    const parsed = parseSkillMd(generated);

    expect(parsed.frontmatter.name).toBe(baseFrontmatter.name);
    expect(parsed.content).toBe(content);
  });

  it("round-trips with parser: content with special YAML characters", () => {
    const fm: SkillFrontmatter = {
      name: "Skill: The Best",
      description: "Uses 'quotes' and \"doubles\"",
      trigger: "When user says #hashtag",
    };
    const generated = generateSkillMd(fm, baseContent);
    const parsed = parseSkillMd(generated);

    expect(parsed.frontmatter.name).toBe(fm.name);
    expect(parsed.frontmatter.description).toBe(fm.description);
    expect(parsed.frontmatter.trigger).toBe(fm.trigger);
  });

  it("handles frontmatter with empty required fields", () => {
    const fm: SkillFrontmatter = { name: "", description: "", trigger: "" };
    const output = generateSkillMd(fm, "Content");

    expect(output).toContain("---\n");
    expect(output).toContain("Content");

    // Verify it can be parsed back
    const parsed = parseSkillMd(output);
    expect(parsed.frontmatter.name).toBe("");
    expect(parsed.content).toBe("Content");
  });
});
