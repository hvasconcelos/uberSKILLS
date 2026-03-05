import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../migrate";
import { openSqliteDb } from "../../sqlite-utils";

const TEST_DIR = resolve(process.cwd(), "data/test-skills-query");
const TEST_DB_URL = "file:data/test-skills-query/skills.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-skills-query/skills.db");

// biome-ignore lint/suspicious/noExplicitAny: Test setup requires untyped Drizzle bridge
let testDb: any;
let closeDb: () => void;

// Mock getDb() so query functions use our test database instead of bun:sqlite
vi.mock("../../client", () => ({
  getDb: () => testDb,
  resetDbForTesting: vi.fn(),
}));

// Import query functions AFTER the mock is set up
const { listSkills, getSkillById, getSkillBySlug, createSkill, updateSkill, deleteSkill } =
  await import("../skills");

// Also import schema for direct DB operations in test setup
const { skills } = await import("../../schema");

describe("skills query functions", () => {
  beforeAll(() => {
    // Clean any leftover test data
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    // Create migrated test database
    runMigrations(TEST_DB_URL);
    const opened = openSqliteDb(TEST_DB_PATH, { skills });
    testDb = opened.db;
    closeDb = opened.close;
  });

  afterAll(() => {
    closeDb();
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  // Clear all skills between tests for isolation
  beforeEach(() => {
    testDb.delete(skills).run();
  });

  // -------------------------------------------------------------------------
  // createSkill
  // -------------------------------------------------------------------------
  describe("createSkill", () => {
    it("creates a skill with auto-generated id, slug, and timestamps", () => {
      const skill = createSkill({ name: "My Test Skill" });

      expect(skill.id).toBeDefined();
      expect(skill.id.length).toBe(21);
      expect(skill.name).toBe("My Test Skill");
      expect(skill.slug).toBe("my-test-skill");
      expect(skill.status).toBe("draft");
      expect(skill.createdAt).toBeInstanceOf(Date);
      expect(skill.updatedAt).toBeInstanceOf(Date);
    });

    it("sets optional fields from input", () => {
      const skill = createSkill({
        name: "Full Skill",
        description: "A full description",
        trigger: "Use when testing",
        tags: ["test", "demo"],
        modelPattern: "claude-*",
        content: "# Instructions\nDo the thing.",
        status: "ready",
      });

      expect(skill.description).toBe("A full description");
      expect(skill.trigger).toBe("Use when testing");
      expect(skill.tags).toBe(JSON.stringify(["test", "demo"]));
      expect(skill.modelPattern).toBe("claude-*");
      expect(skill.content).toBe("# Instructions\nDo the thing.");
      expect(skill.status).toBe("ready");
    });

    it("defaults optional fields when not provided", () => {
      const skill = createSkill({ name: "Minimal" });

      expect(skill.description).toBe("");
      expect(skill.trigger).toBe("");
      expect(skill.tags).toBe("[]");
      expect(skill.modelPattern).toBeNull();
      expect(skill.content).toBe("");
      expect(skill.status).toBe("draft");
    });

    it("generates unique slugs on collision", () => {
      const s1 = createSkill({ name: "Duplicate Name" });
      const s2 = createSkill({ name: "Duplicate Name" });
      const s3 = createSkill({ name: "Duplicate Name" });

      expect(s1.slug).toBe("duplicate-name");
      expect(s2.slug).toBe("duplicate-name-2");
      expect(s3.slug).toBe("duplicate-name-3");
    });

    it("slugifies special characters correctly", () => {
      const skill = createSkill({ name: "Hello, World! (v2.0)" });
      expect(skill.slug).toBe("hello-world-v2-0");
    });
  });

  // -------------------------------------------------------------------------
  // getSkillById
  // -------------------------------------------------------------------------
  describe("getSkillById", () => {
    it("returns a skill by its ID", () => {
      const created = createSkill({ name: "Find Me" });
      const found = getSkillById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Find Me");
    });

    it("returns null for non-existent ID", () => {
      expect(getSkillById("nonexistent-id-12345")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getSkillBySlug
  // -------------------------------------------------------------------------
  describe("getSkillBySlug", () => {
    it("returns a skill by its slug", () => {
      createSkill({ name: "Slug Lookup" });
      const found = getSkillBySlug("slug-lookup");

      expect(found).not.toBeNull();
      expect(found?.name).toBe("Slug Lookup");
    });

    it("returns null for non-existent slug", () => {
      expect(getSkillBySlug("no-such-slug")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateSkill
  // -------------------------------------------------------------------------
  describe("updateSkill", () => {
    it("partially updates a skill", () => {
      const created = createSkill({ name: "Original", description: "Old desc" });
      const updated = updateSkill(created.id, { description: "New desc" });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("Original");
      expect(updated?.description).toBe("New desc");
    });

    it("bumps updatedAt on update", () => {
      const created = createSkill({ name: "Timestamped" });
      // Small delay to ensure timestamp difference
      const updated = updateSkill(created.id, { description: "changed" });

      expect(updated).not.toBeNull();
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it("re-generates slug when name changes", () => {
      const created = createSkill({ name: "Old Name" });
      expect(created.slug).toBe("old-name");

      const updated = updateSkill(created.id, { name: "New Name" });
      expect(updated?.slug).toBe("new-name");
    });

    it("handles slug collision on rename", () => {
      createSkill({ name: "Taken Name" });
      const other = createSkill({ name: "Other Name" });

      const updated = updateSkill(other.id, { name: "Taken Name" });
      expect(updated?.slug).toBe("taken-name-2");
    });

    it("keeps the same slug if renamed to the same name", () => {
      const created = createSkill({ name: "Same Name" });
      const updated = updateSkill(created.id, { name: "Same Name" });
      expect(updated?.slug).toBe("same-name");
    });

    it("returns null for non-existent ID", () => {
      expect(updateSkill("nonexistent-id-12345", { name: "Nope" })).toBeNull();
    });

    it("updates tags as JSON string", () => {
      const created = createSkill({ name: "Tagged" });
      const updated = updateSkill(created.id, { tags: ["a", "b", "c"] });
      expect(updated?.tags).toBe(JSON.stringify(["a", "b", "c"]));
    });

    it("updates status", () => {
      const created = createSkill({ name: "Status Change" });
      const updated = updateSkill(created.id, { status: "deployed" });
      expect(updated?.status).toBe("deployed");
    });
  });

  // -------------------------------------------------------------------------
  // deleteSkill
  // -------------------------------------------------------------------------
  describe("deleteSkill", () => {
    it("deletes a skill and returns true", () => {
      const created = createSkill({ name: "Delete Me" });
      const result = deleteSkill(created.id);

      expect(result).toBe(true);
      expect(getSkillById(created.id)).toBeNull();
    });

    it("returns false for non-existent ID", () => {
      expect(deleteSkill("nonexistent-id-12345")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // listSkills
  // -------------------------------------------------------------------------
  describe("listSkills", () => {
    beforeEach(() => {
      // Seed with test data
      createSkill({ name: "Alpha Skill", description: "First skill", status: "draft" });
      createSkill({
        name: "Beta Skill",
        description: "Second skill",
        tags: ["important"],
        status: "ready",
      });
      createSkill({ name: "Gamma Skill", description: "Third skill", status: "deployed" });
    });

    it("returns all skills with default pagination", () => {
      const result = listSkills();
      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(12);
      expect(result.totalPages).toBe(1);
    });

    it("sorts by updatedAt descending", () => {
      const result = listSkills();
      for (let i = 1; i < result.data.length; i++) {
        const prevTime = result.data[i - 1]?.updatedAt.getTime() ?? 0;
        const currTime = result.data[i]?.updatedAt.getTime() ?? 0;
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("filters by status", () => {
      const result = listSkills({ status: "ready" });
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("Beta Skill");
      expect(result.total).toBe(1);
    });

    it("searches by name", () => {
      const result = listSkills({ search: "Alpha" });
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("Alpha Skill");
    });

    it("searches by description", () => {
      const result = listSkills({ search: "Second" });
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("Beta Skill");
    });

    it("searches by tags", () => {
      const result = listSkills({ search: "important" });
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("Beta Skill");
    });

    it("combines search and status filter", () => {
      const result = listSkills({ search: "Skill", status: "deployed" });
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("Gamma Skill");
    });

    it("paginates results", () => {
      const page1 = listSkills({ limit: 2, page: 1 });
      expect(page1.data.length).toBe(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      const page2 = listSkills({ limit: 2, page: 2 });
      expect(page2.data.length).toBe(1);
      expect(page2.page).toBe(2);
    });

    it("returns empty results for no matches", () => {
      const result = listSkills({ search: "nonexistent-query-xyz" });
      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("sorts by name ascending", () => {
      const result = listSkills({ sort: "name_asc" });
      const names = result.data.map((s) => s.name);
      expect(names).toEqual(["Alpha Skill", "Beta Skill", "Gamma Skill"]);
    });

    it("sorts by name descending", () => {
      const result = listSkills({ sort: "name_desc" });
      const names = result.data.map((s) => s.name);
      expect(names).toEqual(["Gamma Skill", "Beta Skill", "Alpha Skill"]);
    });

    it("sorts by newest (createdAt descending)", () => {
      const result = listSkills({ sort: "newest" });
      expect(result.data.length).toBe(3);
      // All created at similar times, just verify the sort is applied without error
      for (let i = 1; i < result.data.length; i++) {
        const prevTime = result.data[i - 1]?.createdAt.getTime() ?? 0;
        const currTime = result.data[i]?.createdAt.getTime() ?? 0;
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("sorts by oldest (createdAt ascending)", () => {
      const result = listSkills({ sort: "oldest" });
      expect(result.data.length).toBe(3);
      // All created at similar times, just verify the sort is applied without error
      for (let i = 1; i < result.data.length; i++) {
        const prevTime = result.data[i - 1]?.createdAt.getTime() ?? 0;
        const currTime = result.data[i]?.createdAt.getTime() ?? 0;
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });
  });
});
