import { describe, expect, it } from "vitest";

describe("@uberskillz/types", () => {
  it("should be importable", async () => {
    const types = await import("../index");
    expect(types).toBeDefined();
  });

  it("verifies TypeScript strict mode works in tests", () => {
    const value: string = "test";
    expect(value).toBe("test");
  });
});
