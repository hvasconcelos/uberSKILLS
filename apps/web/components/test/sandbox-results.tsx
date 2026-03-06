"use client";

import type { SandboxFileEntry, SandboxToolCall } from "@uberskills/types";
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@uberskills/ui";
import { Download, File, FileText, FolderArchive, Terminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface SandboxResultsProps {
  testRunId: string;
  sandboxStateId: string;
}

interface SandboxResultData {
  outputFileIndex: SandboxFileEntry[];
  toolCalls: SandboxToolCall[];
}

type FileStatus = "added" | "modified" | "deleted" | "unchanged";

interface FileChange {
  path: string;
  status: FileStatus;
  isText: boolean;
}

/**
 * Sandbox results panel shown below the response panel when a test run used a sandbox.
 *
 * Displays:
 * - File tree with status badges (added/modified/deleted/unchanged)
 * - Side-by-side text diff for selected text files
 * - Tool call log (all bash commands executed)
 * - Download buttons for input and output zips
 */
export function SandboxResults({ testRunId, sandboxStateId }: SandboxResultsProps) {
  const [result, setResult] = useState<SandboxResultData | null>(null);
  const [inputFiles, setInputFiles] = useState<SandboxFileEntry[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sandbox result metadata and input file index
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [resultRes, inputRes] = await Promise.all([
          fetch(`/api/test/${testRunId}/sandbox`),
          fetch(`/api/sandbox/${sandboxStateId}`),
        ]);

        if (resultRes.ok) {
          const data = (await resultRes.json()) as SandboxResultData;
          setResult(data);
        }

        if (inputRes.ok) {
          const data = (await inputRes.json()) as { fileIndex: SandboxFileEntry[] };
          setInputFiles(data.fileIndex);
        }
      } catch {
        // Fail silently
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [testRunId, sandboxStateId]);

  // Compute file changes when data is available
  useEffect(() => {
    if (!result) return;

    const inputSet = new Map(inputFiles.map((f) => [f.path, f]));
    const outputSet = new Map(result.outputFileIndex.map((f) => [f.path, f]));
    const changes: FileChange[] = [];

    // Check output files (added or modified)
    for (const [path, outFile] of outputSet) {
      const inFile = inputSet.get(path);
      if (!inFile) {
        changes.push({ path, status: "added", isText: outFile.isText });
      } else if (inFile.size !== outFile.size) {
        changes.push({ path, status: "modified", isText: outFile.isText });
      } else {
        changes.push({ path, status: "unchanged", isText: outFile.isText });
      }
    }

    // Check deleted files (in input but not output)
    for (const [path, inFile] of inputSet) {
      if (!outputSet.has(path)) {
        changes.push({ path, status: "deleted", isText: inFile.isText });
      }
    }

    // Sort: modified first, then added, deleted, unchanged
    const order: Record<FileStatus, number> = { modified: 0, added: 1, deleted: 2, unchanged: 3 };
    changes.sort((a, b) => order[a.status] - order[b.status] || a.path.localeCompare(b.path));
    setFileChanges(changes);
  }, [result, inputFiles]);

  // Load diff content for a selected file
  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      setDiffContent({ before: null, after: null });

      const [beforeRes, afterRes] = await Promise.all([
        fetch(`/api/sandbox/${sandboxStateId}/file?path=${encodeURIComponent(path)}`).catch(
          () => null,
        ),
        fetch(`/api/test/${testRunId}/sandbox?file=${encodeURIComponent(path)}`).catch(() => null),
      ]);

      const before = beforeRes?.ok
        ? ((await beforeRes.json()) as { content: string }).content
        : null;
      const after = afterRes?.ok ? ((await afterRes.json()) as { content: string }).content : null;

      setDiffContent({ before, after });
    },
    [sandboxStateId, testRunId],
  );

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Loading sandbox results...
      </div>
    );
  }

  if (!result) return null;

  const changedCount = fileChanges.filter((f) => f.status !== "unchanged").length;

  return (
    <div className="mt-4 rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FolderArchive className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Sandbox Results</h3>
        {changedCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {changedCount} changed
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/sandbox/${sandboxStateId}/download`, "_blank")}
          >
            <Download className="size-3.5" />
            Input Zip
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/test/${testRunId}/sandbox?download=true`, "_blank")}
          >
            <Download className="size-3.5" />
            Output Zip
          </Button>
        </div>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger value="files" className="gap-1.5">
            <FileText className="size-3.5" />
            File Changes
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <Terminal className="size-3.5" />
            Tool Log ({result.toolCalls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-0">
          <div className="flex min-h-[300px]">
            {/* File tree sidebar */}
            <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
              {fileChanges.map((fc) => (
                <button
                  key={fc.path}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted ${
                    selectedFile === fc.path ? "bg-muted" : ""
                  }`}
                  onClick={() => fc.isText && handleFileSelect(fc.path)}
                  disabled={!fc.isText}
                >
                  <File className="size-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-mono">{fc.path}</span>
                  <StatusBadge status={fc.status} />
                </button>
              ))}
              {fileChanges.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">No files in sandbox</p>
              )}
            </div>

            {/* Diff viewer */}
            <div className="flex-1 overflow-auto p-4">
              {!selectedFile && (
                <p className="text-center text-sm text-muted-foreground">
                  Select a text file to view changes
                </p>
              )}
              {selectedFile && (
                <div className="space-y-3">
                  <h4 className="font-mono text-xs font-medium">{selectedFile}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
                      <pre className="max-h-[400px] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                        {diffContent.before ?? "(file did not exist)"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
                      <pre className="max-h-[400px] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                        {diffContent.after ?? "(file was deleted)"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="log" className="mt-0 max-h-[400px] overflow-y-auto">
          <div className="divide-y divide-border">
            {result.toolCalls.map((tc, i) => (
              <div key={`${tc.timestamp}-${tc.command}`} className="p-3">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    [{i + 1}]
                  </span>
                  <code className="text-xs font-semibold">{tc.command}</code>
                  <span className="ml-auto text-xs text-muted-foreground">{tc.durationMs}ms</span>
                </div>
                {tc.output && tc.output !== "(no output)" && (
                  <pre className="mt-1.5 overflow-x-auto rounded bg-muted/50 p-2 font-mono text-xs leading-relaxed text-muted-foreground">
                    {tc.output}
                  </pre>
                )}
              </div>
            ))}
            {result.toolCalls.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No bash commands were executed
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const config: Record<FileStatus, { label: string; className: string }> = {
    added: {
      label: "A",
      className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    modified: {
      label: "M",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    },
    deleted: { label: "D", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    unchanged: {
      label: "U",
      className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex size-4 items-center justify-center rounded text-[10px] font-bold ${className}`}
    >
      {label}
    </span>
  );
}
