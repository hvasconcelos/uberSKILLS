"use client";

import type { SandboxFileEntry } from "@uberskills/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@uberskills/ui";
import { FolderArchive, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Shape of a sandbox state returned by the API. */
export interface SandboxStateItem {
  id: string;
  name: string;
  fileIndex: SandboxFileEntry[];
  createdAt: string;
}

interface SandboxUploadProps {
  skillId: string;
  /** Currently selected sandbox state ID, or null if none. */
  selectedId: string | null;
  /** Called when the user selects or deselects a sandbox. */
  onSelect: (sandboxState: SandboxStateItem | null) => void;
  disabled?: boolean;
}

/**
 * Sandbox state selector + zip upload component.
 *
 * Allows users to:
 * - Upload a new zip to create a sandbox state
 * - Select an existing sandbox state from a dropdown
 * - Remove the sandbox selection (run without sandbox)
 */
export function SandboxUpload({
  skillId,
  selectedId,
  onSelect,
  disabled = false,
}: SandboxUploadProps) {
  const [sandboxStates, setSandboxStates] = useState<SandboxStateItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStates = useCallback(async () => {
    try {
      const res = await fetch(`/api/sandbox?skillId=${skillId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { sandboxStates: SandboxStateItem[] };
      setSandboxStates(data.sandboxStates);
    } catch {
      // Silently fail
    }
  }, [skillId]);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!uploadName.trim()) {
        toast.error("Please enter a name for the sandbox state");
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("skillId", skillId);
        formData.append("name", uploadName.trim());

        const res = await fetch("/api/sandbox", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          toast.error(data.error ?? "Failed to upload sandbox");
          return;
        }

        const newState = (await res.json()) as SandboxStateItem;
        toast.success(`Sandbox "${newState.name}" created with ${newState.fileIndex.length} files`);
        await fetchStates();
        onSelect(newState);
        setDialogOpen(false);
        setUploadName("");
      } catch {
        toast.error("Failed to upload sandbox zip");
      } finally {
        setIsUploading(false);
      }
    },
    [skillId, uploadName, onSelect, fetchStates],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleUpload],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/sandbox/${id}`, { method: "DELETE" });
        if (!res.ok) return;
        toast.success("Sandbox state deleted");
        if (selectedId === id) onSelect(null);
        await fetchStates();
      } catch {
        toast.error("Failed to delete sandbox state");
      }
    },
    [selectedId, onSelect, fetchStates],
  );

  const handleSelectChange = useCallback(
    (value: string) => {
      if (value === "none") {
        onSelect(null);
      } else {
        const state = sandboxStates.find((s) => s.id === value);
        if (state) onSelect(state);
      }
    },
    [sandboxStates, onSelect],
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Sandbox</Label>
      <div className="flex items-center gap-2">
        <Select value={selectedId ?? "none"} onValueChange={handleSelectChange} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="No sandbox (text-only test)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No sandbox</SelectItem>
            {sandboxStates.map((state) => (
              <SelectItem key={state.id} value={state.id}>
                <span className="flex items-center gap-2">
                  <FolderArchive className="size-3.5 text-muted-foreground" />
                  {state.name}
                  <span className="text-xs text-muted-foreground">
                    ({state.fileIndex.length} files)
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedId && (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(selectedId)}
            disabled={disabled}
            title="Delete sandbox state"
          >
            <Trash2 className="size-4" />
          </Button>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={disabled}
              title="Upload new sandbox zip"
            >
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Sandbox Zip</DialogTitle>
              <DialogDescription>
                Upload a zip file containing the project files for sandboxed testing. The AI will
                have bash access to read and modify these files.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sandbox-name">Name</Label>
                <Input
                  id="sandbox-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Node.js project with bug"
                  disabled={isUploading}
                />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !uploadName.trim()}
                >
                  {isUploading ? (
                    "Uploading..."
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Choose Zip File
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Max 10 MB, up to 200 files. Supports any project structure.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedId && (
        <p className="text-xs text-muted-foreground">
          The AI will have a <code className="rounded bg-muted px-1">bash</code> tool to run
          commands in the sandbox directory.
        </p>
      )}
    </div>
  );
}
