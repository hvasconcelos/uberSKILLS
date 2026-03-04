"use client";

import { validateSkill } from "@uberskillz/skill-engine";
import type { SkillFrontmatter, ValidationError } from "@uberskillz/types";
import { useMemo } from "react";

/** Aggregated validation state for the editor. */
export interface ValidationState {
  /** All validation issues (errors + warnings). */
  errors: ValidationError[];
  /** Number of error-severity issues. */
  errorCount: number;
  /** Number of warning-severity issues. */
  warningCount: number;
  /** True when no error-severity issues exist. */
  isValid: boolean;
  /** Look up validation issues for a specific field. */
  getFieldErrors: (field: string) => ValidationError[];
}

interface UseValidationOptions {
  name: string;
  description: string;
  trigger: string;
  modelPattern: string | null;
  content: string;
}

/**
 * Runs `validateSkill()` from skill-engine on the current editor state.
 *
 * Recomputes whenever any input field changes (via useMemo). This runs
 * synchronously since the validator is pure CPU — no debounce needed.
 */
export function useValidation({
  name,
  description,
  trigger,
  modelPattern,
  content,
}: UseValidationOptions): ValidationState {
  return useMemo(() => {
    const frontmatter: SkillFrontmatter = {
      name,
      description,
      trigger,
      model_pattern: modelPattern ?? undefined,
    };

    const result = validateSkill(frontmatter, content);

    const errorCount = result.errors.filter((e) => e.severity === "error").length;
    const warningCount = result.errors.filter((e) => e.severity === "warning").length;

    const getFieldErrors = (field: string): ValidationError[] =>
      result.errors.filter((e) => e.field === field);

    return {
      errors: result.errors,
      errorCount,
      warningCount,
      isValid: result.valid,
      getFieldErrors,
    };
  }, [name, description, trigger, modelPattern, content]);
}
