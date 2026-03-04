"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@uberskillz/ui";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { EditorFileData } from "./editor-shell";

type FileType = "prompt" | "resource";

interface FileEditorDialogProps {
  /** Skill ID the file belongs to. */
  skillId: string;
  /** When set, the dialog is in edit mode for this file; otherwise it creates a new file. */
  file: EditorFileData | null;
  /** All existing file paths for duplicate detection. */
  existingPaths: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create or update so the parent can refresh. */
  onSaved: () => void;
}

const PATH_TRAVERSAL_PATTERN = /(?:^|\/)\.\.(?:\/|$)/;

/** Prefix hint shown before the path input based on file type. */
const TYPE_PREFIX: Record<FileType, string> = {
  prompt: "prompts/",
  resource: "resources/",
};

export function FileEditorDialog({
  skillId,
  file,
  existingPaths,
  open,
  onOpenChange,
  onSaved,
}: FileEditorDialogProps) {
  const isEditing = file !== null;

  const [path, setPath] = useState("");
  const [type, setType] = useState<FileType>("prompt");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens or file changes
  useEffect(() => {
    if (open) {
      if (file) {
        setPath(file.path);
        setType(file.type);
        setContent(file.content);
      } else {
        setPath("");
        setType("prompt");
        setContent("");
      }
      setError(null);
    }
  }, [open, file]);

  const validate = useCallback((): string | null => {
    const trimmed = path.trim();

    if (!trimmed) {
      return "File path is required";
    }

    if (trimmed.startsWith("/")) {
      return "Path must be relative (no leading /)";
    }

    if (PATH_TRAVERSAL_PATTERN.test(trimmed)) {
      return "Path must not contain '..'";
    }

    // Check for duplicate paths, excluding the current file if editing
    const isDuplicate = existingPaths.some(
      (existing) => existing === trimmed && (!isEditing || existing !== file?.path),
    );
    if (isDuplicate) {
      return `A file with path "${trimmed}" already exists`;
    }

    return null;
  }, [path, existingPaths, isEditing, file?.path]);

  const handleSave = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const trimmedPath = path.trim();

      if (isEditing && file) {
        // Update existing file
        const res = await fetch(`/api/skills/${skillId}/files/${file.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: trimmedPath, content, type }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
      } else {
        // Create new file
        const res = await fetch(`/api/skills/${skillId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: trimmedPath, content, type }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSaving(false);
    }
  }, [validate, path, content, type, isEditing, file, skillId, onSaved, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit File" : "Add File"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File type selector */}
          <div className="space-y-2">
            <Label htmlFor="file-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FileType)}>
              <SelectTrigger id="file-type" aria-label="File type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prompt">Prompt</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {type === "prompt"
                ? "Prompt files contain additional instructions or sub-prompts."
                : "Resource files contain reference data, templates, or examples."}
            </p>
          </div>

          {/* File path input */}
          <div className="space-y-2">
            <Label htmlFor="file-path">
              Path <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-0">
              <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                {TYPE_PREFIX[type]}
              </span>
              <Input
                id="file-path"
                value={
                  path.startsWith(TYPE_PREFIX[type]) ? path.slice(TYPE_PREFIX[type].length) : path
                }
                onChange={(e) => setPath(`${TYPE_PREFIX[type]}${e.target.value}`)}
                placeholder="example.md"
                className="rounded-l-none"
                aria-invalid={!!error}
                aria-describedby={error ? "file-path-error" : undefined}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Full path: <code className="rounded bg-muted px-1 py-0.5">{path || "..."}</code>
            </p>
          </div>

          {/* Content editor */}
          <div className="space-y-2">
            <Label htmlFor="file-content">Content</Label>
            <textarea
              id="file-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter file content..."
              spellCheck={false}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ minHeight: "200px", maxHeight: "40vh", resize: "vertical" }}
              aria-label="File content"
            />
            <p className="text-xs text-muted-foreground">{content.length} characters</p>
          </div>

          {/* Error message */}
          {error && (
            <p id="file-path-error" className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
