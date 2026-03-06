# Architecture

UberSkills is a Turborepo monorepo built with Bun, Next.js 15 (App Router), and SQLite.

## Monorepo Structure

```
uberskills/
├── apps/
│   └── web/                    # Next.js 15 application (App Router)
│       ├── app/                # Routes, pages, and API handlers
│       ├── components/         # React components
│       ├── e2e/                # Playwright E2E tests
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities, constants, logger
│       └── styles/             # Global CSS with design tokens
├── packages/
│   ├── types/                  # @uberskills/types
│   ├── db/                     # @uberskills/db
│   ├── skill-engine/           # @uberskills/skill-engine
│   └── ui/                     # @uberskills/ui
├── docs/                       # Documentation
├── turbo.json                  # Turborepo pipeline config
├── biome.json                  # Linter/formatter config
└── tsconfig.json               # Base TypeScript config
```

## Package Responsibilities

| Package | Description |
|---|---|
| `@uberskills/types` | Shared TypeScript interfaces (`Skill`, `SkillFile`, `SkillVersion`, `TestRun`, `AppSettings`) and enums (`SkillStatus`, `TestRunStatus`, `FileType`, `Theme`) |
| `@uberskills/db` | Drizzle ORM schema for 5 SQLite tables, typed CRUD query functions, database client with auto-migration, AES-256-GCM encryption for API key storage |
| `@uberskills/skill-engine` | SKILL.md parser (YAML frontmatter + markdown), validator, generator, argument substitution (`$VARIABLE_NAME`), importer (zip/directory), exporter (zip/filesystem) |
| `@uberskills/ui` | Shared shadcn/ui components (Button, Input, Card, Dialog, Badge, etc.) |

## Package Dependency Graph

```
apps/web
  ├── @uberskills/ui
  ├── @uberskills/db
  ├── @uberskills/skill-engine
  └── @uberskills/types

@uberskills/ui
  └── @uberskills/types

@uberskills/db
  └── @uberskills/types

@uberskills/skill-engine
  ├── @uberskills/types
  └── @uberskills/db
```

## Routes

| Route | Description |
|---|---|
| `/` | Dashboard -- overview with recent skills and quick stats |
| `/skills` | Skills library -- browse, search, filter skills |
| `/skills/new` | AI-assisted skill creation |
| `/skills/[id]` | Skill editor -- metadata, instructions, files, preview, history |
| `/skills/[id]/test` | Skill testing sandbox |
| `/import` | Import skills from zip or directory |
| `/settings` | API key, preferences, data management |

## Data Flow -- Skill Lifecycle

```
Create  -->  Edit  -->  Test  -->  Export  -->  Deploy
  │            │          │          │            │
  v            v          v          v            v
skills DB   skills DB   test_runs  .zip file   ~/.claude/
row         + versions  row        generated   skills/<name>/
created     row                                SKILL.md
```

## AI Integration Flow

```
Browser (useChat)  -->  /api/chat or /api/test  -->  Vercel AI SDK (streamText)
                   <--  SSE stream              <--  OpenRouter API
                                                     --> AI Model (Claude/GPT/Gemini)
```

1. Client sends messages + selected model via `useChat()`.
2. API route decrypts the OpenRouter API key from the settings table.
3. `streamText()` calls OpenRouter with the selected model and system prompt.
4. Response streams back to the client via Server-Sent Events.

## Filesystem Layout on Deploy

```
~/.claude/skills/<skill-name>/
├── SKILL.md          # YAML frontmatter + markdown instructions
├── prompts/          # Additional prompt files (optional)
└── resources/        # Reference files (optional)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 15 (App Router) |
| UI | React 19 + shadcn/ui + Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Database | SQLite (better-sqlite3) / Turso (@libsql/client) via Drizzle ORM |
| AI | Vercel AI SDK + @openrouter/ai-sdk-provider |
| Logging | Pino + pino-pretty |
| Linting | Biome |
| Testing | Vitest (unit) + Playwright (E2E) |
