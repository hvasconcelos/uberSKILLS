import { runMigrations } from "./migrate";
import { skills } from "./schema";
import { DEFAULT_DATABASE_URL, openSqliteDb, resolveFileUrl } from "./sqlite-utils";

/**
 * Sample skills for development and testing.
 * Each entry mirrors the `skills` table columns (minus auto-generated id/timestamps).
 */
const SAMPLE_SKILLS = [
  {
    name: "Code Reviewer",
    slug: "code-reviewer",
    description: "Reviews pull requests for code quality, bugs, and best practices.",
    trigger: "Use when the user asks to review code, a pull request, or says 'review my code'.",
    tags: JSON.stringify(["code-review", "quality"]),
    modelPattern: "claude-*",
    content:
      "You are a senior code reviewer. Analyze the provided code for:\n\n- Bugs and logic errors\n- Security vulnerabilities\n- Performance issues\n- Code style and readability\n\nProvide actionable feedback with specific line references.",
    status: "ready" as const,
  },
  {
    name: "Test Generator",
    slug: "test-generator",
    description: "Generates unit and integration tests for provided source code.",
    trigger: "Use when the user asks to generate tests or says 'write tests for this'.",
    tags: JSON.stringify(["testing", "automation"]),
    content:
      "You are a testing expert. Given source code, generate comprehensive tests that cover:\n\n- Happy path scenarios\n- Edge cases and boundary conditions\n- Error handling\n- Integration points\n\nUse the testing framework already present in the project.",
    status: "draft" as const,
  },
  {
    name: "Documentation Writer",
    slug: "documentation-writer",
    description: "Creates clear, well-structured documentation for code and APIs.",
    trigger: "Use when the user asks to document code, write docs, or says 'add documentation'.",
    tags: JSON.stringify(["docs", "documentation"]),
    content:
      "You are a technical writer. Create documentation that includes:\n\n- Overview and purpose\n- Usage examples with code snippets\n- Parameter descriptions\n- Return value explanations\n- Common pitfalls and notes",
    status: "draft" as const,
  },
  {
    name: "SQL Query Builder",
    slug: "sql-query-builder",
    description: "Helps write and optimize SQL queries for various databases.",
    trigger: "Use when the user asks for help with SQL queries or database operations.",
    tags: JSON.stringify(["sql", "database", "optimization"]),
    modelPattern: "claude-*",
    content:
      "You are a database expert. Help the user write SQL queries by:\n\n- Understanding their data model\n- Writing efficient queries with proper indexing hints\n- Explaining query execution plans\n- Suggesting optimizations for slow queries",
    status: "ready" as const,
  },
  {
    name: "Git Commit Helper",
    slug: "git-commit-helper",
    description: "Generates conventional commit messages from staged changes.",
    trigger: "Use when the user asks to create a commit message or says 'commit'.",
    tags: JSON.stringify(["git", "commit"]),
    content:
      "You are a commit message expert following the Conventional Commits specification.\n\nAnalyze the staged changes and generate a commit message with:\n\n- Type: feat, fix, docs, style, refactor, test, chore\n- Scope: the affected module or component\n- Description: concise summary of the change\n- Body: detailed explanation if needed",
    status: "deployed" as const,
  },
];

/**
 * Seeds the database with sample skills for development.
 *
 * Runs migrations first to ensure tables exist, then inserts sample data.
 * Skips seeding if skills already exist to avoid duplicates on repeated runs.
 */
export async function seed(databaseUrl?: string): Promise<void> {
  const url = databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  if (!url.startsWith("file:")) {
    console.warn(`Skipping seed: only file: URLs are supported (got "${url}").`);
    return;
  }

  runMigrations(url);

  const absolutePath = resolveFileUrl(url);
  const { db, close } = openSqliteDb(absolutePath, { skills });

  const existing = db.select().from(skills).limit(1).all();
  if (existing.length > 0) {
    console.log("Database already contains skills — skipping seed.");
    close();
    return;
  }

  db.insert(skills).values(SAMPLE_SKILLS).run();
  console.log(`Seeded ${SAMPLE_SKILLS.length} sample skills.`);

  close();
}

// Allow running as a standalone script: `bun run packages/db/src/seed.ts`
if (import.meta.main) {
  seed();
}
