"use client";

import { Input, Label, Textarea } from "@uberskillz/ui";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { EditorSkillData } from "./editor-shell";
import { TagInput } from "./tag-input";

interface MetadataTabProps {
  skill: EditorSkillData;
  onSaved?: () => void;
}

interface FieldErrors {
  name?: string;
  trigger?: string;
  slug?: string;
  description?: string;
  modelPattern?: string;
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

/** Calls PUT /api/skills/:id and throws on failure. */
async function updateSkillApi(skillId: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/skills/${skillId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
}

export function MetadataTab({ skill, onSaved }: MetadataTabProps) {
  const [name, setName] = useState(skill.name);
  const [slug, setSlug] = useState(skill.slug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState(skill.description);
  const [trigger, setTrigger] = useState(skill.trigger);
  const [tags, setTags] = useState<string[]>(skill.tags);
  const [modelPattern, setModelPattern] = useState(skill.modelPattern ?? "");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const slugCheckRef = useRef(0);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!slugManuallyEdited) {
        setSlug(slugify(value));
      }
    },
    [slugManuallyEdited],
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
        setErrors((prev) => ({
          ...prev,
          slug: data.available ? undefined : "This slug is already taken",
        }));
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

  const validate = useCallback((): boolean => {
    const next: FieldErrors = {};

    if (!name.trim()) {
      next.name = "Name is required";
    } else if (name.length > 100) {
      next.name = "Name must be at most 100 characters";
    }

    if (!trigger.trim()) {
      next.trigger = "Trigger is required";
    }

    if (description.length > 500) {
      next.description = "Description must be at most 500 characters";
    }

    if (modelPattern) {
      try {
        new RegExp(modelPattern);
      } catch {
        next.modelPattern = "Must be a valid regular expression";
      }
    }

    if (errors.slug) {
      next.slug = errors.slug;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, trigger, description, modelPattern, errors.slug]);

  const save = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await updateSkillApi(skill.id, {
        name: name.trim(),
        description,
        trigger,
        tags,
        modelPattern: modelPattern || null,
      });
      onSaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save metadata";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [validate, skill.id, name, description, trigger, tags, modelPattern, onSaved]);

  const handleTagsChange = useCallback(
    async (newTags: string[]) => {
      setTags(newTags);
      setSaving(true);
      try {
        await updateSkillApi(skill.id, { tags: newTags });
        onSaved?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save tags";
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [skill.id, onSaved],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FormField label="Name" required htmlFor="metadata-name" error={errors.name}>
        <Input
          id="metadata-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={save}
          placeholder="e.g. PR Reviewer"
          maxLength={100}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "metadata-name-error" : undefined}
        />
      </FormField>

      <FormField
        label="Slug"
        htmlFor="metadata-slug"
        error={errors.slug}
        hint="URL-safe identifier. Auto-generated from name, but you can edit it."
      >
        <div className="relative">
          <Input
            id="metadata-slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            onBlur={save}
            placeholder="e.g. pr-reviewer"
            aria-invalid={!!errors.slug}
            aria-describedby={errors.slug ? "metadata-slug-error" : "metadata-slug-hint"}
          />
          {checkingSlug && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </FormField>

      <FormField label="Description" htmlFor="metadata-description" error={errors.description}>
        <Textarea
          id="metadata-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          placeholder="A brief description of what this skill does"
          maxLength={500}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "metadata-description-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
      </FormField>

      <FormField label="Trigger" required htmlFor="metadata-trigger" error={errors.trigger}>
        <Textarea
          id="metadata-trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          onBlur={save}
          placeholder="Describe when this skill should activate, e.g. 'When the user asks to review a pull request'"
          aria-invalid={!!errors.trigger}
          aria-describedby={errors.trigger ? "metadata-trigger-error" : undefined}
        />
      </FormField>

      <FormField label="Tags" htmlFor="metadata-tags">
        <TagInput id="metadata-tags" tags={tags} onChange={handleTagsChange} />
      </FormField>

      <FormField
        label="Model Pattern"
        htmlFor="metadata-model-pattern"
        error={errors.modelPattern}
        hint="Optional regex to restrict which AI models this skill targets."
      >
        <Input
          id="metadata-model-pattern"
          value={modelPattern}
          onChange={(e) => setModelPattern(e.target.value)}
          onBlur={save}
          placeholder="e.g. claude-.*"
          aria-invalid={!!errors.modelPattern}
          aria-describedby={
            errors.modelPattern ? "metadata-model-pattern-error" : "metadata-model-pattern-hint"
          }
        />
      </FormField>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </div>
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, required, error, hint, children }: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
