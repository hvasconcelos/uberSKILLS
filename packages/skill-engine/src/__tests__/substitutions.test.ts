import { describe, expect, it } from "vitest";
import { detectPlaceholders, substitute } from "../substitutions";

describe("detectPlaceholders", () => {
  it("detects single placeholder", () => {
    expect(detectPlaceholders("Hello $NAME")).toEqual(["NAME"]);
  });

  it("detects multiple unique placeholders", () => {
    const result = detectPlaceholders("$GREETING $NAME, your id is $ID");
    expect(result).toContain("GREETING");
    expect(result).toContain("NAME");
    expect(result).toContain("ID");
    expect(result).toHaveLength(3);
  });

  it("returns unique names when placeholders repeat", () => {
    const result = detectPlaceholders("$NAME said hello to $NAME and $AGE");
    expect(result).toEqual(["NAME", "AGE"]);
  });

  it("detects $ARGUMENTS as a placeholder", () => {
    expect(detectPlaceholders("Process $ARGUMENTS now")).toEqual(["ARGUMENTS"]);
  });

  it("detects underscored names", () => {
    expect(detectPlaceholders("Use $MY_LONG_VARIABLE here")).toEqual(["MY_LONG_VARIABLE"]);
  });

  it("returns empty array when no placeholders exist", () => {
    expect(detectPlaceholders("Just regular text, no variables.")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(detectPlaceholders("")).toEqual([]);
  });

  it("ignores lowercase after $", () => {
    // $lowercase does not match the pattern /\$([A-Z_]+)/g
    expect(detectPlaceholders("This $lowercase is not a placeholder")).toEqual([]);
  });

  it("ignores $ with no following letters", () => {
    expect(detectPlaceholders("Price is $5 or $10")).toEqual([]);
  });

  it("detects placeholders adjacent to punctuation", () => {
    const result = detectPlaceholders("($NAME) and [$ID].");
    expect(result).toContain("NAME");
    expect(result).toContain("ID");
  });

  it("detects placeholder at the very start and end", () => {
    const result = detectPlaceholders("$START middle $END");
    expect(result).toContain("START");
    expect(result).toContain("END");
  });

  it("handles multiline content", () => {
    const content = "Line 1 $FOO\nLine 2 $BAR\nLine 3 $FOO";
    const result = detectPlaceholders(content);
    expect(result).toEqual(["FOO", "BAR"]);
  });
});

describe("substitute", () => {
  it("replaces a single placeholder", () => {
    expect(substitute("Hello $NAME", { NAME: "Alice" })).toBe("Hello Alice");
  });

  it("replaces multiple different placeholders", () => {
    const result = substitute("$GREETING $NAME, age $AGE", {
      GREETING: "Hi",
      NAME: "Bob",
      AGE: "25",
    });
    expect(result).toBe("Hi Bob, age 25");
  });

  it("replaces all occurrences of a repeated placeholder", () => {
    const result = substitute("$NAME met $NAME", { NAME: "Eve" });
    expect(result).toBe("Eve met Eve");
  });

  it("replaces $ARGUMENTS like any other placeholder", () => {
    const result = substitute("Process: $ARGUMENTS", { ARGUMENTS: "foo bar baz" });
    expect(result).toBe("Process: foo bar baz");
  });

  it("leaves unknown placeholders unchanged", () => {
    const result = substitute("$KNOWN and $UNKNOWN", { KNOWN: "yes" });
    expect(result).toBe("yes and $UNKNOWN");
  });

  it("returns content unchanged when values map is empty", () => {
    expect(substitute("$NAME is $AGE", {})).toBe("$NAME is $AGE");
  });

  it("returns content unchanged when there are no placeholders", () => {
    expect(substitute("No placeholders here", { NAME: "Alice" })).toBe("No placeholders here");
  });

  it("handles empty content", () => {
    expect(substitute("", { NAME: "Alice" })).toBe("");
  });

  it("replaces with empty string values", () => {
    expect(substitute("Hello $NAME!", { NAME: "" })).toBe("Hello !");
  });

  it("handles multiline content", () => {
    const content = "Line 1: $A\nLine 2: $B";
    const result = substitute(content, { A: "alpha", B: "beta" });
    expect(result).toBe("Line 1: alpha\nLine 2: beta");
  });

  it("does not affect lowercase $ tokens", () => {
    expect(substitute("$lower $UPPER", { UPPER: "yes" })).toBe("$lower yes");
  });

  it("replaces placeholders adjacent to punctuation", () => {
    expect(substitute("($NAME)", { NAME: "val" })).toBe("(val)");
  });
});
