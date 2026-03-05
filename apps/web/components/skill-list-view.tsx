import type { SkillStatus } from "@uberskills/types";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uberskills/ui";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";

/** Maximum characters shown for the description before truncation. */
const DESCRIPTION_MAX_LENGTH = 80;

/** Minimal skill shape accepted by the list view — mirrors SkillCard's interface. */
interface SkillListData {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: SkillStatus;
  /** Tags as `string[]` (parsed) or JSON string (raw DB row). */
  tags: string[] | string;
  updatedAt: Date;
}

interface SkillListViewProps {
  skills: SkillListData[];
}

/** Normalises tags to an array — handles both parsed arrays and raw JSON strings from the DB. */
function parseTags(tags: string[] | string): string[] {
  if (Array.isArray(tags)) return tags;
  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Displays skills in a compact table format with columns:
 * Name, Description (truncated), Status, Tags, and Updated date.
 * Each row is clickable and navigates to the skill editor.
 */
export function SkillListView({ skills }: SkillListViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Tags</TableHead>
          <TableHead className="hidden sm:table-cell">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {skills.map((skill) => {
          const tags = parseTags(skill.tags);
          const truncatedDescription =
            skill.description && skill.description.length > DESCRIPTION_MAX_LENGTH
              ? `${skill.description.slice(0, DESCRIPTION_MAX_LENGTH)}...`
              : skill.description;

          return (
            <TableRow key={skill.id} className="group">
              <TableCell className="font-medium">
                <Link
                  href={`/skills/${skill.slug}`}
                  className="block hover:underline focus:underline focus:outline-none"
                >
                  {skill.name}
                </Link>
              </TableCell>
              <TableCell className="hidden max-w-xs truncate text-muted-foreground sm:table-cell">
                <Link href={`/skills/${skill.slug}`} className="block" tabIndex={-1}>
                  {truncatedDescription || <span className="italic">No description</span>}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/skills/${skill.slug}`} className="block" tabIndex={-1}>
                  <StatusBadge status={skill.status} />
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Link href={`/skills/${skill.slug}`} className="block" tabIndex={-1}>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-2 py-0 text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                      {tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                <Link href={`/skills/${skill.slug}`} className="block" tabIndex={-1}>
                  {new Date(skill.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
