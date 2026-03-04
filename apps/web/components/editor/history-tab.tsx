"use client";

import { Badge, Button, Separator } from "@uberskillz/ui";
import { ChevronDown, ChevronRight, Clock, History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";

/** Version record returned by the API. */
interface VersionData {
  id: string;
  skillId: string;
  version: number;
  contentSnapshot: string;
  metadataSnapshot: string;
  changeSummary: string;
  createdAt: string;
}

interface HistoryTabProps {
  skillId: string;
}

/** Number of versions shown per page. */
const PAGE_SIZE = 20;

/** Formats a timestamp as a human-readable relative string (e.g. "2 hours ago"). */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

export function HistoryTab({ skillId }: HistoryTabProps) {
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Fetch versions from the API on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchVersions() {
      setLoading(true);
      try {
        const res = await fetch(`/api/skills/${skillId}/versions`);
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { versions: VersionData[] };
        if (!cancelled) {
          setVersions(data.versions);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load version history");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchVersions();
    return () => {
      cancelled = true;
    };
  }, [skillId]);

  // Toggle expanded state for a version row
  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={History}
          title="No version history"
          description="Versions are created automatically when you save changes to this skill."
        />
      </div>
    );
  }

  const visibleVersions = versions.slice(0, visibleCount);
  const hasMore = visibleCount < versions.length;
  // The newest version is the first element (sorted desc by API)
  const latestVersionId = versions[0]?.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-section-heading">Version History</h2>
        <p className="text-sm text-muted-foreground">
          {versions.length} {versions.length === 1 ? "version" : "versions"} recorded.
        </p>
      </div>

      <div className="rounded-md border border-border">
        {visibleVersions.map((version, index) => {
          const isExpanded = expandedId === version.id;
          const isCurrent = version.id === latestVersionId;

          return (
            <div key={version.id}>
              {index > 0 && <Separator />}

              {/* Version row header */}
              <button
                type="button"
                onClick={() => toggleExpanded(version.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                aria-expanded={isExpanded}
                aria-label={`Version ${version.version}${isCurrent ? " (current)" : ""}`}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}

                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="shrink-0 font-mono text-sm font-medium">v{version.version}</span>

                  {isCurrent && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      Current
                    </Badge>
                  )}

                  {version.changeSummary && (
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {version.changeSummary}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>{formatRelativeTime(version.createdAt)}</span>
                </div>
              </button>

              {/* Expanded content snapshot */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-4 py-4">
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 font-mono text-sm leading-relaxed">
                    {version.contentSnapshot}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more button for pagination */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleShowMore}>
            Show more ({versions.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
