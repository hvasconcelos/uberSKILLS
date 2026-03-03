import { describe, expect, it } from "vitest";

describe("@uberskillz/types", () => {
  it("exports all skill-related types", async () => {
    const types = await import("../index");
    // Type-only exports compile away at runtime, so the module itself must be importable.
    expect(types).toBeDefined();
  });

  it("skill status values are assignable", () => {
    const statuses: Array<import("../index").SkillStatus> = ["draft", "ready", "deployed"];
    expect(statuses).toHaveLength(3);
  });

  it("test run status values are assignable", () => {
    const statuses: Array<import("../index").TestRunStatus> = ["running", "completed", "error"];
    expect(statuses).toHaveLength(3);
  });

  it("file type values are assignable", () => {
    const types: Array<import("../index").FileType> = ["prompt", "resource"];
    expect(types).toHaveLength(2);
  });

  it("theme values are assignable", () => {
    const themes: Array<import("../index").Theme> = ["light", "dark", "system"];
    expect(themes).toHaveLength(3);
  });

  it("validation error severity values are assignable", () => {
    const error: import("../index").ValidationError = {
      field: "name",
      message: "Name is required",
      severity: "error",
    };
    expect(error.field).toBe("name");
    expect(error.severity).toBe("error");
  });
});
