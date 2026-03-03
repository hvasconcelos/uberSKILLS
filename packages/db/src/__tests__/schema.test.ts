import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { settings, skillFiles, skills, skillVersions, testRuns } from "../schema";

describe("schema", () => {
  describe("skills table", () => {
    const config = getTableConfig(skills);

    it("has the correct table name", () => {
      expect(getTableName(skills)).toBe("skills");
    });

    it("defines all required columns", () => {
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toEqual([
        "id",
        "name",
        "slug",
        "description",
        "trigger",
        "tags",
        "model_pattern",
        "content",
        "status",
        "created_at",
        "updated_at",
      ]);
    });

    it("has 3 indexes (slug unique, status, updated_at)", () => {
      expect(config.indexes).toHaveLength(3);
      const indexNames = config.indexes.map((i) => i.config.name);
      expect(indexNames).toContain("idx_skills_slug");
      expect(indexNames).toContain("idx_skills_status");
      expect(indexNames).toContain("idx_skills_updated_at");
    });

    it("slug index is unique", () => {
      const slugIdx = config.indexes.find((i) => i.config.name === "idx_skills_slug");
      expect(slugIdx?.config.unique).toBe(true);
    });

    it("status column uses enum constraint", () => {
      const statusCol = config.columns.find((c) => c.name === "status");
      expect(statusCol?.enumValues).toEqual(["draft", "ready", "deployed"]);
    });
  });

  describe("skill_files table", () => {
    const config = getTableConfig(skillFiles);

    it("has the correct table name", () => {
      expect(getTableName(skillFiles)).toBe("skill_files");
    });

    it("defines all required columns", () => {
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toEqual([
        "id",
        "skill_id",
        "path",
        "content",
        "type",
        "created_at",
        "updated_at",
      ]);
    });

    it("has skill_id index", () => {
      const indexNames = config.indexes.map((i) => i.config.name);
      expect(indexNames).toContain("idx_skill_files_skill_id");
    });

    it("has cascade foreign key on skill_id", () => {
      expect(config.foreignKeys).toHaveLength(1);
      expect(config.foreignKeys[0]?.onDelete).toBe("cascade");
    });

    it("type column uses enum constraint", () => {
      const typeCol = config.columns.find((c) => c.name === "type");
      expect(typeCol?.enumValues).toEqual(["prompt", "resource"]);
    });
  });

  describe("skill_versions table", () => {
    const config = getTableConfig(skillVersions);

    it("has the correct table name", () => {
      expect(getTableName(skillVersions)).toBe("skill_versions");
    });

    it("defines all required columns", () => {
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toEqual([
        "id",
        "skill_id",
        "version",
        "content_snapshot",
        "metadata_snapshot",
        "change_summary",
        "created_at",
      ]);
    });

    it("has composite index on skill_id + version", () => {
      const idx = config.indexes.find(
        (i) => i.config.name === "idx_skill_versions_skill_id_version",
      );
      expect(idx).toBeDefined();
      expect(idx?.config.columns).toHaveLength(2);
    });

    it("has cascade foreign key on skill_id", () => {
      expect(config.foreignKeys).toHaveLength(1);
      expect(config.foreignKeys[0]?.onDelete).toBe("cascade");
    });
  });

  describe("test_runs table", () => {
    const config = getTableConfig(testRuns);

    it("has the correct table name", () => {
      expect(getTableName(testRuns)).toBe("test_runs");
    });

    it("defines all required columns", () => {
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toEqual([
        "id",
        "skill_id",
        "model",
        "system_prompt",
        "user_message",
        "assistant_response",
        "arguments",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "latency_ms",
        "ttft_ms",
        "status",
        "error",
        "created_at",
      ]);
    });

    it("has 2 indexes (skill_id, created_at)", () => {
      expect(config.indexes).toHaveLength(2);
      const indexNames = config.indexes.map((i) => i.config.name);
      expect(indexNames).toContain("idx_test_runs_skill_id");
      expect(indexNames).toContain("idx_test_runs_created_at");
    });

    it("has cascade foreign key on skill_id", () => {
      expect(config.foreignKeys).toHaveLength(1);
      expect(config.foreignKeys[0]?.onDelete).toBe("cascade");
    });

    it("status column uses enum constraint", () => {
      const statusCol = config.columns.find((c) => c.name === "status");
      expect(statusCol?.enumValues).toEqual(["running", "completed", "error"]);
    });

    it("nullable columns are not marked notNull", () => {
      const nullable = [
        "assistant_response",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "latency_ms",
        "ttft_ms",
        "error",
      ];
      for (const name of nullable) {
        const col = config.columns.find((c) => c.name === name);
        expect(col?.notNull, `${name} should be nullable`).toBe(false);
      }
    });
  });

  describe("settings table", () => {
    const config = getTableConfig(settings);

    it("has the correct table name", () => {
      expect(getTableName(settings)).toBe("settings");
    });

    it("defines all required columns", () => {
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toEqual(["key", "value", "encrypted", "updated_at"]);
    });

    it("key is the primary key (no nanoid)", () => {
      const keyCol = config.columns.find((c) => c.name === "key");
      expect(keyCol?.primary).toBe(true);
    });

    it("has no foreign keys or indexes", () => {
      expect(config.foreignKeys).toHaveLength(0);
      expect(config.indexes).toHaveLength(0);
    });
  });
});
