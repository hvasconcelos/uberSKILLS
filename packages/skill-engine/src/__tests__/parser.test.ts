import { describe, expect, it } from "vitest";
import { parseSkillMd } from "../parser";

describe("parseSkillMd", () => {
  it("parses a valid SKILL.md with all frontmatter fields", () => {
    const raw = `---
name: My Skill
description: A helpful skill
trigger: When the user says hello
model_pattern: "claude-.*"
---

# Instructions

Do something useful.
`;

    const result = parseSkillMd(raw);

    expect(result.frontmatter.name).toBe("My Skill");
    expect(result.frontmatter.description).toBe("A helpful skill");
    expect(result.frontmatter.trigger).toBe("When the user says hello");
    expect(result.frontmatter.model_pattern).toBe("claude-.*");
    expect(result.content).toBe("# Instructions\n\nDo something useful.");
  });

  it("parses frontmatter without optional model_pattern", () => {
    const raw = `---
name: Basic Skill
description: Does basic things
trigger: Always
---

Some content here.
`;

    const result = parseSkillMd(raw);

    expect(result.frontmatter.name).toBe("Basic Skill");
    expect(result.frontmatter.model_pattern).toBeUndefined();
    expect(result.content).toBe("Some content here.");
  });

  it("returns empty frontmatter when no --- delimiters exist", () => {
    const raw = "Just some markdown content without frontmatter.";

    const result = parseSkillMd(raw);

    expect(result.frontmatter.name).toBe("");
    expect(result.frontmatter.description).toBe("");
    expect(result.frontmatter.trigger).toBe("");
    expect(result.frontmatter.model_pattern).toBeUndefined();
    expect(result.content).toBe("Just some markdown content without frontmatter.");
  });

  it("handles empty input", () => {
    const result = parseSkillMd("");

    expect(result.frontmatter.name).toBe("");
    expect(result.content).toBe("");
  });

  it("handles whitespace-only input", () => {
    const result = parseSkillMd("   \n\n   ");

    expect(result.frontmatter.name).toBe("");
    expect(result.content).toBe("");
  });

  it("handles malformed YAML gracefully", () => {
    const raw = `---
name: [unclosed bracket
description: !!invalid
---

Content after bad YAML.
`;

    const result = parseSkillMd(raw);

    // Should fall back to empty frontmatter
    expect(result.frontmatter.name).toBe("");
    expect(result.content).toBe("Content after bad YAML.");
  });

  it("handles frontmatter with non-string values", () => {
    const raw = `---
name: 42
description: true
trigger: null
---

Body text.
`;

    const result = parseSkillMd(raw);

    // Non-string values default to empty string
    expect(result.frontmatter.name).toBe("");
    expect(result.frontmatter.description).toBe("");
    expect(result.frontmatter.trigger).toBe("");
    expect(result.content).toBe("Body text.");
  });

  it("trims trailing whitespace from content", () => {
    const raw = `---
name: Trim Test
description: Test trimming
trigger: test
---

Content with trailing whitespace.

`;

    const result = parseSkillMd(raw);

    expect(result.content).toBe("Content with trailing whitespace.");
  });

  it("handles frontmatter with extra whitespace around delimiters", () => {
    const raw = `---
name: Whitespace
description: Spaces after dashes
trigger: test
---

Content.
`;

    const result = parseSkillMd(raw);

    expect(result.frontmatter.name).toBe("Whitespace");
    expect(result.content).toBe("Content.");
  });

  it("handles empty frontmatter block", () => {
    const raw = `---

---

Some content.
`;

    const result = parseSkillMd(raw);

    expect(result.frontmatter.name).toBe("");
    expect(result.frontmatter.description).toBe("");
    expect(result.frontmatter.trigger).toBe("");
    expect(result.content).toBe("Some content.");
  });

  it("preserves multiline content correctly", () => {
    const raw = `---
name: Multi
description: Multiline
trigger: test
---

# Step 1

Do this first.

# Step 2

Do this second.

- bullet 1
- bullet 2
`;

    const result = parseSkillMd(raw);

    expect(result.content).toContain("# Step 1");
    expect(result.content).toContain("# Step 2");
    expect(result.content).toContain("- bullet 1");
    expect(result.content).toContain("- bullet 2");
  });

  it("handles content with --- inside (not at the start)", () => {
    const raw = `---
name: Dashes Inside
description: Content has horizontal rules
trigger: test
---

Some text.

---

More text after a horizontal rule.
`;

    const result = parseSkillMd(raw);

    expect(result.frontmatter.name).toBe("Dashes Inside");
    expect(result.content).toContain("---");
    expect(result.content).toContain("More text after a horizontal rule.");
  });
});
