"use client";

import type { SkillStatus } from "@uberskillz/types";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uberskillz/ui";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Rocket,
  Save,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { type SaveStatus, type SkillSnapshot, useAutoSave } from "@/hooks/use-auto-save";
import { useValidation } from "@/hooks/use-validation";
import { FilesTab } from "./files-tab";
import { HistoryTab } from "./history-tab";
import { InstructionsTab } from "./instructions-tab";
import { MetadataTab } from "./metadata-tab";
import { PreviewTab } from "./preview-tab";

/** Skill data serialised for client consumption (Date fields as ISO strings). */
export interface EditorSkillData {
  id: string;
  name: string;
  slug: string;
  description: string;
  trigger: string;
  tags: string[];
  modelPattern: string | null;
  content: string;
  status: SkillStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EditorFileData {
  id: string;
  skillId: string;
  path: string;
  content: string;
  type: "prompt" | "resource";
  createdAt: string;
  updatedAt: string;
}

interface EditorShellProps {
  skill: EditorSkillData;
  files: EditorFileData[];
}

const TABS = [
  { value: "metadata", label: "Metadata", icon: Settings2 },
  { value: "instructions", label: "Instructions", icon: Pencil },
  { value: "files", label: "Files", icon: FileText },
  { value: "preview", label: "Preview", icon: Play },
  { value: "history", label: "History", icon: History },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const VALID_TAB_VALUES = new Set<string>(TABS.map((t) => t.value));

/** Sends a JSON request and throws with the server error message on failure. */
async function apiFetch(
  url: string,
  method: "PUT" | "POST",
  body: Record<string, unknown>,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return res;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** Triggers a browser file download from a Blob. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function EditorShell({ skill, files }: EditorShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const initialTab: TabValue =
    tabParam && VALID_TAB_VALUES.has(tabParam) ? (tabParam as TabValue) : "metadata";

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [status, setStatus] = useState<SkillStatus>(skill.status);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ------- Mutable working copy of the skill's auto-saveable fields -------
  const [workingName, setWorkingName] = useState(skill.name);
  const [workingDescription, setWorkingDescription] = useState(skill.description);
  const [workingTrigger, setWorkingTrigger] = useState(skill.trigger);
  const [workingTags, setWorkingTags] = useState<string[]>(skill.tags);
  const [workingModelPattern, setWorkingModelPattern] = useState<string | null>(skill.modelPattern);
  const [workingContent, setWorkingContent] = useState(skill.content);

  // Snapshot of the current working copy for auto-save comparison
  const currentSnapshot: SkillSnapshot = useMemo(
    () => ({
      name: workingName,
      description: workingDescription,
      trigger: workingTrigger,
      tags: workingTags,
      modelPattern: workingModelPattern,
      content: workingContent,
    }),
    [
      workingName,
      workingDescription,
      workingTrigger,
      workingTags,
      workingModelPattern,
      workingContent,
    ],
  );

  // Snapshot of the last-persisted state from the server
  const savedSnapshot: SkillSnapshot = useMemo(
    () => ({
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      tags: skill.tags,
      modelPattern: skill.modelPattern,
      content: skill.content,
    }),
    [skill.name, skill.description, skill.trigger, skill.tags, skill.modelPattern, skill.content],
  );

  const {
    status: saveStatus,
    saveNow,
    isDirty,
  } = useAutoSave({
    skillId: skill.id,
    current: currentSnapshot,
    saved: savedSnapshot,
    onSaved: () => router.refresh(),
  });

  // Run validation on current working state
  const validation = useValidation({
    name: workingName,
    description: workingDescription,
    trigger: workingTrigger,
    modelPattern: workingModelPattern,
    content: workingContent,
  });

  // Build a composite EditorSkillData from the working copy for child components
  const workingSkill: EditorSkillData = useMemo(
    () => ({
      ...skill,
      name: workingName,
      description: workingDescription,
      trigger: workingTrigger,
      tags: workingTags,
      modelPattern: workingModelPattern,
      content: workingContent,
      status,
    }),
    [
      skill,
      workingName,
      workingDescription,
      workingTrigger,
      workingTags,
      workingModelPattern,
      workingContent,
      status,
    ],
  );

  // ------- Tab navigation -------
  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as TabValue;
      setActiveTab(tab);

      const params = new URLSearchParams(searchParams.toString());
      if (tab === "metadata") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(`/skills/${skill.id}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, searchParams, skill.id],
  );

  // ------- Inline name editing (separate from auto-save — has its own UX) -------
  const saveSkillName = useCallback(async () => {
    const trimmed = workingName.trim();

    if (!trimmed || trimmed === skill.name) {
      setWorkingName(skill.name);
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      await apiFetch(`/api/skills/${skill.id}`, "PUT", { name: trimmed });
      toast.success("Skill renamed");
      router.refresh();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to rename skill"));
      setWorkingName(skill.name);
    } finally {
      setSavingName(false);
      setIsEditingName(false);
    }
  }, [workingName, skill.name, skill.id, router]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveSkillName();
      } else if (e.key === "Escape") {
        setWorkingName(skill.name);
        setIsEditingName(false);
      }
    },
    [saveSkillName, skill.name],
  );

  const startEditingName = useCallback(() => {
    setIsEditingName(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  }, []);

  // ------- Status change (separate from auto-save) -------
  const handleStatusChange = useCallback(
    async (value: string) => {
      const newStatus = value as SkillStatus;

      // Block setting "ready" or "deployed" when there are validation errors
      if ((newStatus === "ready" || newStatus === "deployed") && !validation.isValid) {
        toast.error("Cannot set status — fix validation errors first");
        return;
      }

      const previousStatus = status;
      setStatus(newStatus);
      setSavingStatus(true);

      try {
        await apiFetch(`/api/skills/${skill.id}`, "PUT", { status: newStatus });
        toast.success(`Status changed to ${newStatus}`);
      } catch (err) {
        setStatus(previousStatus);
        toast.error(toErrorMessage(err, "Failed to update status"));
      } finally {
        setSavingStatus(false);
      }
    },
    [status, skill.id, validation.isValid],
  );

  // ------- Export / Deploy -------
  const handleExport = useCallback(async () => {
    try {
      const res = await apiFetch("/api/export", "POST", { skillId: skill.id });
      const blob = await res.blob();

      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? `${skill.slug}.zip`;

      triggerDownload(blob, filename);
      toast.success("Skill exported");
    } catch (err) {
      toast.error(toErrorMessage(err, "Export failed"));
    }
  }, [skill.id, skill.slug]);

  const handleDeploy = useCallback(async () => {
    try {
      const res = await apiFetch("/api/export/deploy", "POST", { skillId: skill.id });
      const data = (await res.json()) as { path: string };
      toast.success(`Deployed to ${data.path}`);
      setStatus("deployed");
      router.refresh();
    } catch (err) {
      toast.error(toErrorMessage(err, "Deploy failed"));
    }
  }, [skill.id, router]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/skills">
          <ArrowLeft className="size-4" />
          Back to Library
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={workingName}
                onChange={(e) => setWorkingName(e.target.value)}
                onBlur={saveSkillName}
                onKeyDown={handleNameKeyDown}
                className="h-9 rounded-md border border-input bg-background px-3 text-page-title tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Skill name"
                disabled={savingName}
              />
              {savingName && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingName}
              className="group flex items-center gap-2 text-page-title tracking-tight hover:text-muted-foreground transition-colors"
              aria-label={`Edit skill name: ${workingName}`}
            >
              <h1>{workingName}</h1>
              <Pencil className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
            <SelectTrigger className="w-[130px]" aria-label="Skill status">
              <SelectValue>
                <StatusBadge status={status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <StatusBadge status="draft" />
              </SelectItem>
              <SelectItem value="ready">
                <StatusBadge status="ready" />
              </SelectItem>
              <SelectItem value="deployed">
                <StatusBadge status="deployed" />
              </SelectItem>
            </SelectContent>
          </Select>

          {savingStatus && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex items-center gap-2">
          {/* Validation summary badge */}
          <ValidationBadge
            errorCount={validation.errorCount}
            warningCount={validation.warningCount}
          />

          {/* Auto-save status indicator */}
          <SaveStatusIndicator status={saveStatus} isDirty={isDirty} onRetry={saveNow} />

          {/* Manual save button */}
          <Button variant="outline" size="sm" onClick={saveNow} disabled={!isDirty}>
            <Save className="size-4" />
            Save
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/skills/${skill.id}/test`}>
              <Play className="size-4" />
              Test
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeploy}>
            <Rocket className="size-4" />
            Deploy
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="w-full justify-start">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="metadata" className="mt-6">
          <MetadataTab
            skill={workingSkill}
            validationErrors={validation.errors}
            onFieldChange={(field, value) => {
              switch (field) {
                case "name":
                  setWorkingName(value as string);
                  break;
                case "description":
                  setWorkingDescription(value as string);
                  break;
                case "trigger":
                  setWorkingTrigger(value as string);
                  break;
                case "tags":
                  setWorkingTags(value as string[]);
                  break;
                case "modelPattern":
                  setWorkingModelPattern(value as string | null);
                  break;
              }
            }}
          />
        </TabsContent>

        <TabsContent value="instructions" className="mt-6">
          <InstructionsTab skill={workingSkill} onContentChange={setWorkingContent} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesTab skillId={skill.id} files={files} onChanged={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <PreviewTab skill={workingSkill} files={files} validationErrors={validation.errors} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab skillId={skill.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation badge – shows error/warning count in the editor header
// ---------------------------------------------------------------------------

interface ValidationBadgeProps {
  errorCount: number;
  warningCount: number;
}

function ValidationBadge({ errorCount, warningCount }: ValidationBadgeProps) {
  if (errorCount === 0 && warningCount === 0) return null;

  if (errorCount > 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
        <AlertCircle className="size-3.5" />
        {errorCount} {errorCount === 1 ? "error" : "errors"}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
      <AlertTriangle className="size-3.5" />
      {warningCount} {warningCount === 1 ? "warning" : "warnings"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Save status indicator component
// ---------------------------------------------------------------------------

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  isDirty: boolean;
  onRetry: () => void;
}

function SaveStatusIndicator({ status, isDirty, onRetry }: SaveStatusIndicatorProps) {
  switch (status) {
    case "saving":
      return (
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 animate-spin" />
          Saving…
        </span>
      );
    case "saved":
      return (
        <span
          className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"
          aria-live="polite"
        >
          <Check className="size-3.5" />
          Saved
        </span>
      );
    case "error":
      return (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
          aria-live="assertive"
        >
          <AlertCircle className="size-3.5" />
          Error saving — retry
        </button>
      );
    case "conflict":
      return (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
          aria-live="assertive"
        >
          <RefreshCw className="size-3.5" />
          Conflict — reload
        </button>
      );
    default:
      // "idle" — show nothing unless there are unsaved changes
      return isDirty ? (
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Unsaved changes
        </span>
      ) : null;
  }
}
