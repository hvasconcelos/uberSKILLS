"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uberskillz/ui";
import { Edit, FileText, FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import type { EditorFileData } from "./editor-shell";
import { FileEditorDialog } from "./file-editor-dialog";

interface FilesTabProps {
  skillId: string;
  files: EditorFileData[];
  /** Called after any file mutation so the parent can refresh data from the server. */
  onChanged: () => void;
}

export function FilesTab({ skillId, files, onChanged }: FilesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<EditorFileData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditorFileData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const existingPaths = files.map((f) => f.path);

  // Open dialog in "add" mode
  const handleAdd = useCallback(() => {
    setEditingFile(null);
    setDialogOpen(true);
  }, []);

  // Open dialog in "edit" mode for a specific file
  const handleEdit = useCallback((file: EditorFileData) => {
    setEditingFile(file);
    setDialogOpen(true);
  }, []);

  // Confirm and execute file deletion
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/files/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      toast.success(`Deleted "${deleteTarget.path}"`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, skillId, onChanged]);

  const handleDialogSaved = useCallback(() => {
    toast.success(editingFile ? "File updated" : "File created");
    onChanged();
  }, [editingFile, onChanged]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-heading">Files</h2>
          <p className="text-sm text-muted-foreground">
            Manage additional prompt and resource files for this skill.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add File
        </Button>
      </div>

      {/* File list or empty state */}
      {files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No additional files"
          description="Add prompt files for sub-instructions or resource files for templates, examples, and reference data."
          action={
            <Button size="sm" onClick={handleAdd}>
              <Plus className="size-4" />
              Add File
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-sm">{file.path}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {file.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleEdit(file)}
                        aria-label={`Edit ${file.path}`}
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteTarget(file)}
                        aria-label={`Delete ${file.path}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* File count summary */}
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} {files.length === 1 ? "file" : "files"} &middot;{" "}
          {files.filter((f) => f.type === "prompt").length} prompt,{" "}
          {files.filter((f) => f.type === "resource").length} resource
        </p>
      )}

      {/* Add/Edit dialog */}
      <FileEditorDialog
        skillId={skillId}
        file={editingFile}
        existingPaths={existingPaths}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleDialogSaved}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <code className="rounded bg-muted px-1 py-0.5">{deleteTarget?.path}</code>? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
