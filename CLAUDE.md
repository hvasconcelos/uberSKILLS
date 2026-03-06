# CLAUDE.md -- UberSkills

> Context file for Claude Code when working on this codebase.

## Project Overview

UberSkills is an open-source web application for designing, testing, and deploying Claude Code Agent Skills. It provides a visual editor with AI-assisted creation, a multi-model testing sandbox, and one-click deployment to `~/.claude/skills/`.

The core workflow: **Create** a skill (manually or via AI chat) → **Edit** metadata, instructions, and files → **Test** with streaming AI responses and metrics → **Export** as zip or **Deploy** to the local filesystem.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Monorepo | Turborepo + Bun | turbo ^2, bun 1.3.10 |
| Framework | Next.js (App Router) | ^15 |
| UI | React + shadcn/ui + Tailwind CSS v4 | react ^19 |
| Language | TypeScript (strict) | ^5.7 |
| Database | SQLite (better-sqlite3) / Turso (@libsql/client) via Drizzle ORM | -- |
| AI | Vercel AI SDK + OpenRouter (@openrouter/ai-sdk-provider) | -- |
| Logging | Pino + pino-pretty | pino ^10, pino-pretty ^13 |
| Linting | Biome | ^2.4.5 |
| Testing | Vitest (unit) + Playwright (E2E) | -- |
| Fonts | Geist Sans + Geist Mono (via next/font) | -- |

## Monorepo Structure

```
uberskills/
├── apps/
│   └── web/                    # Next.js 15 app (App Router)
│       ├── app/                # Routes and API handlers
│       ├── components/         # React components
│       ├── e2e/                # Playwright E2E tests
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities and constants
│       └── styles/             # Global CSS with design tokens
├── packages/
│   ├── types/                  # @uberskills/types -- shared TypeScript interfaces
│   ├── db/                     # @uberskills/db -- Drizzle schema, queries, crypto
│   ├── skill-engine/           # @uberskills/skill-engine -- parser, validator, generator, importer, exporter
│   └── ui/                     # @uberskills/ui -- shadcn/ui components
├── docs/                       # Project documentation
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose service definition
├── CONTRIBUTING.md             # Contribution guidelines
└── LICENSE                     # MIT license
```

### Package Responsibilities

- **@uberskills/types**: All shared interfaces (`Skill`, `SkillFrontmatter`, `SkillFile`, `SkillVersion`, `TestRun`, `AppSettings`, `ValidationError`) and enum types (`SkillStatus`, `TestRunStatus`, `FileType`, `Theme`).
- **@uberskills/db**: Drizzle ORM schema for 5 SQLite tables (`skills`, `skill_files`, `skill_versions`, `test_runs`, `settings`), typed query functions, database client with auto-migration, and AES-256-GCM encryption for API key storage.
- **@uberskills/skill-engine**: SKILL.md parser (YAML frontmatter + markdown body), validator (field presence/length/regex), generator (data → SKILL.md string), argument substitution (`$VARIABLE_NAME` placeholders), importer (zip/directory → parsed skills), exporter (skill → zip/filesystem).
- **@uberskills/ui**: Shared shadcn/ui components (Button, Input, Card, Dialog, Badge, etc.) with the "Vercel Light" design system tokens.

## Common Commands

```bash
bun install          # Install all dependencies
bun dev              # Start Next.js dev server (port 3000)
bun build            # Production build all packages + app
bun lint             # Lint all files with Biome
bun lint:fix         # Auto-fix lintable issues
bun format           # Format all files with Biome
bun typecheck        # TypeScript type checking across all packages
bun test             # Run Vitest unit tests
bun run test:e2e     # Run Playwright E2E tests
bun run db:migrate   # Run database migrations
```

## Coding Conventions

### TypeScript

- **Strict mode** is enabled globally: `strictNullChecks`, `noUncheckedIndexedAccess`, `isolatedModules`.
- Do not use `any` -- Biome enforces `noExplicitAny` as an error.
- Unused variables and imports are errors.
- Use `const` over `let` where possible (enforced by Biome).

### Formatting (Biome)

- **Indent**: 2 spaces
- **Line width**: 100 characters
- **Quotes**: double quotes (`"`)
- **Semicolons**: always
- **Trailing commas**: always (except JSON)

### File Naming

- **Files**: `kebab-case.ts`, `kebab-case.tsx`
- **React components**: `PascalCase` exports in `kebab-case.tsx` files
- **Test files**: `__tests__/module-name.test.ts` colocated in `src/`
- **E2E tests**: `apps/web/e2e/*.spec.ts`

### Imports

- Use workspace package names: `import { Skill } from "@uberskills/types";`
- Use path aliases in the web app: `import { NavBar } from "@/components/nav-bar";`
- Group imports: external packages first, then workspace packages, then relative imports.

## Database Patterns

### Drizzle ORM

- Schema defined in `packages/db/src/schema.ts` using Drizzle's SQLite API.
- All tables use `text("id")` primary keys with `nanoid()` as `$defaultFn`.
- Timestamp columns use `integer("column", { mode: "timestamp" })` with `$defaultFn(() => new Date())`.
- Enum columns use `text("column", { enum: ["value1", "value2"] })`.
- Arrays (tags, arguments) stored as JSON strings in `text` columns -- parse with `JSON.parse()`, serialize with `JSON.stringify()`.

### ID Generation

- Use `nanoid()` for all entity IDs (21-char alphanumeric string).
- Slugs are auto-generated from skill names: lowercase, hyphenated, unique (append numeric suffix on collision).

### Query Functions

- Located in `packages/db/src/queries/*.ts`.
- Each file exports typed CRUD functions (e.g., `listSkills()`, `createSkill()`, `updateSkill()`).
- Queries use Drizzle's typed query builder -- never raw SQL strings.
- Search uses SQLite `LIKE` operator on name, description, and tags fields.

### Connection

- `DATABASE_URL` env var determines driver: `file:` prefix → `better-sqlite3`, `libsql://` prefix → `@libsql/client`.
- Default: `file:data/uberskills.db` (local SQLite file).
- Singleton pattern: one connection per process.
- Auto-creates `data/` directory and runs migrations on first connection.

## API Route Patterns

### Next.js App Router

- Routes in `apps/web/app/api/*/route.ts`.
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`.
- Use `NextRequest` and `NextResponse` from `next/server`.

### Error Responses

Always return errors in this format:

```typescript
return NextResponse.json({ error: "Human-readable message", code: "ERROR_CODE" }, { status: 4xx });
```

### Common Status Codes

- `200` -- success
- `201` -- created
- `400` -- validation error
- `401` -- missing/invalid API key
- `404` -- resource not found
- `409` -- conflict (e.g., slug collision, version conflict)
- `429` -- rate limited (OpenRouter)
- `500` -- internal server error
- `502` -- upstream error (OpenRouter)

## Component Patterns

### shadcn/ui

- Components live in `packages/ui/src/components/`.
- Install via `bunx shadcn@latest add <component>` from the `packages/ui/` directory.
- Use the `cn()` utility from `@uberskills/ui` for conditional class merging (clsx + tailwind-merge).

### Design System ("Vercel Light" Theme)

- Colors defined as CSS custom properties in `apps/web/styles/globals.css`.
- Light mode tokens on `:root`, dark mode tokens on `.dark`.
- Theme switching via `<html class="dark">` (Tailwind class strategy).
- System preference via `matchMedia("(prefers-color-scheme: dark)")`.

### Key Design Tokens

- **Cards**: no box-shadow, 1px border, `rounded-lg`.
- **Buttons**: primary (black bg), secondary (white bg + border), ghost, destructive.
- **Badges**: pill shape (`rounded-full`), status-specific colors (draft=gray, ready=green, deployed=blue).
- **Inputs**: 1px border, `h-10`, `rounded-md`, focus ring.
- **Navigation**: 64px height (`h-16`), full-width with `max-w-6xl` centered content.
- **Page layout**: `max-w-6xl`, `px-6` horizontal padding.
- **Transitions**: `transition-colors duration-150` default, respect `prefers-reduced-motion`.

### React Patterns

- Use React Server Components (RSC) for data fetching where possible.
- Client components marked with `"use client"` directive only when needed (interactivity, hooks, browser APIs).
- Use `usePathname()` from `next/navigation` for active route detection.
- Use Vercel AI SDK's `useChat()` hook for streaming chat UIs.

## Testing Patterns

### Vitest (Unit Tests)

- Config at root `vitest.config.ts` or per-package.
- Use in-memory SQLite for database tests.
- Test files colocated: `src/__tests__/module.test.ts`.
- Mock external services (OpenRouter) -- never call real APIs in tests.

### Playwright (E2E Tests)

- Config at `apps/web/playwright.config.ts`.
- Tests in `apps/web/e2e/*.spec.ts`.
- Auto-starts dev server on `http://localhost:3000`.
- Uses test database (not production data).
- AI-dependent tests use mocked API responses.

## AI Integration

### OpenRouter

- All AI calls go through OpenRouter via `@openrouter/ai-sdk-provider`.
- API key stored encrypted (AES-256-GCM) in the `settings` table.
- Server-side proxy routes decrypt the key -- never expose it to the client.
- Set headers: `HTTP-Referer` and `X-Title: UberSkills` on all requests.

### Vercel AI SDK

- Server: `streamText()` for streaming API route responses.
- Client: `useChat()` for chat UIs with streaming.
- Response format: `result.toDataStreamResponse()`.

## Logging

### Pino

- Logger singleton in `apps/web/lib/logger.ts` with ASCII startup banner.
- `routeLogger(method, path)` factory returns a child logger with `{ route: "METHOD /path" }` pre-bound.
- Use `.child({ skillId, fileId, testRunId })` for entity-scoped context in routes with URL params.
- Log level controlled by `LOG_LEVEL` env var (default: `info`). In development, pino-pretty renders single-line colored output.
- Production output is JSON (no pino-pretty transport).
- Sensitive fields (`apiKey`, `openrouterApiKey`, `authorization`) are redacted via pino's `redact` config.

### Log Level Conventions

- `log.info` -- successful outcomes: "skill created", "models synced", "test run completed" + relevant IDs/counts/metrics.
- `log.debug` -- request detail: query params, parsed body fields (non-sensitive), "stream initiated".
- `log.warn` -- recoverable client errors: validation failures, not found, missing API key, rate limits.
- `log.error({ err }, "message")` -- caught exceptions in catch blocks, streaming onError callbacks.

### What Must Never Be Logged

- API key values (redact config is safety net; primary defense is not passing them to the logger).
- Settings PUT: log `updatedKeys` array only, never values.
- Full system prompts (log `skillId` instead).
- Authorization header values.

## Security Reminders

- **Never** log or expose API keys in client-side code, error messages, or console output.
- **Always** use parameterized queries via Drizzle ORM -- never interpolate user input into SQL.
- **Always** encrypt the OpenRouter API key before storing (AES-256-GCM via `packages/db/src/crypto.ts`).
- **Validate** all user input on API routes before processing.
- **Restrict** filesystem access to `~/.claude/skills/` for deploy operations -- prevent path traversal.
- **Sanitize** markdown rendering to prevent XSS.
- **Never** follow symlinks outside the source directory during import operations.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:data/uberskills.db` | SQLite file path or Turso connection string |
| `ENCRYPTION_SECRET` | Auto-generated at `data/.secret` | AES-256-GCM key for API key encryption |
| `PORT` | `3000` | Web server port |
| `LOG_LEVEL` | `info` | Pino log level (`debug`, `info`, `warn`, `error`, `fatal`, `silent`) |
| `NODE_ENV` | `development` | Environment mode |

## Docker Deployment

- `Dockerfile` -- multi-stage build using `oven/bun:1` base image (deps → builder → runner stages).
- `docker-compose.yml` -- service definition with volume mount for `data/` persistence.
- `.dockerignore` -- excludes `node_modules`, `.git`, `data/`, `.env*`.
- Production runs as non-root user (`nextjs:nodejs`), exposes port 3000.
- Build and run: `docker compose up -d`.

## Documentation Reference

Project documentation is in the `docs/` directory:

- `docs/getting-started.md` -- Installation, setup, and first steps
- `docs/features.md` -- Feature guide for users
- `docs/architecture.md` -- Monorepo structure, packages, data flow
- `docs/database.md` -- SQLite schema, Drizzle ORM patterns
- `docs/api-reference.md` -- REST API endpoints and response formats
- `docs/ai-integration.md` -- OpenRouter, Vercel AI SDK, streaming
- `docs/skill-engine.md` -- Parser, validator, generator, importer, exporter
- `docs/deployment.md` -- Docker, Vercel, self-hosting options
- `docs/security.md` -- Encryption, input validation, filesystem safety
