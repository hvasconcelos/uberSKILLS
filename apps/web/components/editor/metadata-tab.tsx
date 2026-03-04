"use client";

import type { ValidationError } from "@uberskillz/types";
import { Input, Label, Textarea } from "@uberskillz/ui";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { EditorSkillData } from "./editor-shell";
import { TagInput } from "./tag-input";

/** Fields that the metadata tab can change. */
export type MetadataField = "name" | "description" | "trigger" | "tags" | "modelPattern";

interface MetadataTabProps {
  skill: EditorSkillData;
  /** Validation errors from the skill-engine validator, passed down from editor-shell. */
  validationErrors: ValidationError[];
  /** Called when a metadata field changes. The parent (editor-shell) updates its working copy
   *  and the auto-save hook takes care of persisting the change after a debounce. */
  onFieldChange: (field: MetadataField, value: string | string[] | null) => void;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  ) as T;
}

export function MetadataTab({ skill, validationErrors, onFieldChange }: MetadataTabProps) {
  const [slug, setSlug] = useState(skill.slug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [slugError, setSlugError] = useState<string>();
  const [checkingSlug, setCheckingSlug] = useState(false);

  const slugCheckRef = useRef(0);

  const fieldMessage = useCallback(
    (field: string, severity: "error" | "warning"): string | undefined => {
      const mappedField = field === "modelPattern" ? "model_pattern" : field;
      return validationErrors.find((e) => e.field === mappedField && e.severity === severity)
        ?.message;
    },
    [validationErrors],
  );

  const handleNameChange = useCallback(
    (value: string) => {
      onFieldChange("name", value);
      if (!slugManuallyEdited) {
        setSlug(slugify(value));
      }
    },
    [slugManuallyEdited, onFieldChange],
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+/, ""),
    );
  }, []);

  // Debounced slug uniqueness check
  const checkSlugUniqueness = useDebouncedCallback(async (slugValue: string) => {
    if (!slugValue) return;

    const checkId = ++slugCheckRef.current;
    setCheckingSlug(true);

    try {
      const res = await fetch(
        `/api/skills/check-slug?slug=${encodeURIComponent(slugValue)}&excludeId=${skill.id}`,
      );
      const data = (await res.json()) as { available: boolean };

      if (checkId === slugCheckRef.current) {
        setSlugError(data.available ? undefined : "This slug is already taken");
      }
    } catch {
      // Network errors should not block the user
    } finally {
      if (checkId === slugCheckRef.current) {
        setCheckingSlug(false);
      }
    }
  }, 400);

  useEffect(() => {
    if (slug) {
      checkSlugUniqueness(slug);
    }
  }, [slug, checkSlugUniqueness]);

  const nameError = fieldMessage("name", "error");
  const descriptionError = fieldMessage("description", "error");
  const descriptionWarning = fieldMessage("description", "warning");
  const triggerError = fieldMessage("trigger", "error");
  const modelPatternError = fieldMessage("modelPattern", "error");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FormField label="Name" required htmlFor="metadata-name" error={nameError}>
        <Input
          id="metadata-name"
          value={skill.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. PR Reviewer"
          maxLength={100}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "metadata-name-error" : undefined}
        />
      </FormField>

      <FormField
        label="Slug"
        htmlFor="metadata-slug"
        error={slugError}
        hint="URL-safe identifier. Auto-generated from name, but you can edit it."
      >
        <div className="relative">
          <Input
            id="metadata-slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="e.g. pr-reviewer"
            aria-invalid={!!slugError}
            aria-describedby={slugError ? "metadata-slug-error" : "metadata-slug-hint"}
          />
          {checkingSlug && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </FormField>

      <FormField
        label="Description"
        htmlFor="metadata-description"
        error={descriptionError}
        warning={descriptionWarning}
      >
        <Textarea
          id="metadata-description"
          value={skill.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="A brief description of what this skill does"
          maxLength={500}
          aria-invalid={!!descriptionError}
          aria-describedby={descriptionError ? "metadata-description-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">{skill.description.length}/500 characters</p>
      </FormField>

      <FormField label="Trigger" required htmlFor="metadata-trigger" error={triggerError}>
        <Textarea
          id="metadata-trigger"
          value={skill.trigger}
          onChange={(e) => onFieldChange("trigger", e.target.value)}
          placeholder="Describe when this skill should activate, e.g. 'When the user asks to review a pull request'"
          aria-invalid={!!triggerError}
          aria-describedby={triggerError ? "metadata-trigger-error" : undefined}
        />
      </FormField>

      <FormField label="Tags" htmlFor="metadata-tags">
        <TagInput
          id="metadata-tags"
          tags={skill.tags}
          onChange={(newTags) => onFieldChange("tags", newTags)}
        />
      </FormField>

      <FormField
        label="Model Pattern"
        htmlFor="metadata-model-pattern"
        error={modelPatternError}
        hint="Optional regex to restrict which AI models this skill targets."
      >
        <Input
          id="metadata-model-pattern"
          value={skill.modelPattern ?? ""}
          onChange={(e) => onFieldChange("modelPattern", e.target.value || null)}
          placeholder="e.g. claude-.*"
          aria-invalid={!!modelPatternError}
          aria-describedby={
            modelPatternError ? "metadata-model-pattern-error" : "metadata-model-pattern-hint"
          }
        />
      </FormField>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  warning?: string;
  hint?: string;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, required, error, warning, hint, children }: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const warningId = `${htmlFor}-warning`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && !warning && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {warning && !error && (
        <p id={warningId} className="text-xs text-yellow-600 dark:text-yellow-400">
          {warning}
        </p>
      )}
    </div>
  );
}
