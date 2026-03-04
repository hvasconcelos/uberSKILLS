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
  ArrowLeft,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Play,
  Rocket,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { FilesTab } from "./files-tab";
import { InstructionsTab } from "./instructions-tab";
import { MetadataTab } from "./metadata-tab";

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
  const [skillName, setSkillName] = useState(skill.name);
  const [status, setStatus] = useState<SkillStatus>(skill.status);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  const saveSkillName = useCallback(async () => {
    const trimmed = skillName.trim();

    if (!trimmed || trimmed === skill.name) {
      setSkillName(skill.name);
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
      setSkillName(skill.name);
    } finally {
      setSavingName(false);
      setIsEditingName(false);
    }
  }, [skillName, skill.name, skill.id, router]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveSkillName();
      } else if (e.key === "Escape") {
        setSkillName(skill.name);
        setIsEditingName(false);
      }
    },
    [saveSkillName, skill.name],
  );

  const startEditingName = useCallback(() => {
    setIsEditingName(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  }, []);

  const handleStatusChange = useCallback(
    async (value: string) => {
      const newStatus = value as SkillStatus;
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
    [status, skill.id],
  );

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
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
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
              aria-label={`Edit skill name: ${skillName}`}
            >
              <h1>{skillName}</h1>
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
          <MetadataTab skill={skill} onSaved={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="instructions" className="mt-6">
          <InstructionsTab skill={skill} onSaved={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesTab skillId={skill.id} files={files} onChanged={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <TabPlaceholder
            title="Preview"
            description="See the generated SKILL.md as it will be exported."
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <TabPlaceholder title="History" description="Browse past versions of this skill." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TabPlaceholderProps {
  title: string;
  description: string;
  fileCount?: number;
}

function TabPlaceholder({ title, description, fileCount }: TabPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
      <h2 className="text-section-heading">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {fileCount !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          {fileCount} {fileCount === 1 ? "file" : "files"} attached
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  );
}
