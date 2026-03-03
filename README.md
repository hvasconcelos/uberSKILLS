# UberSkillz

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/uberskillz/uberskillsz/ci.yml?branch=main)](https://github.com/uberskillz/uberskillsz/actions)

**Design, test, and deploy Claude Code Agent Skills through a visual, AI-assisted workflow.**

UberSkillz replaces manual `SKILL.md` authoring with a structured editor, multi-model testing sandbox, and one-click deployment to `~/.claude/skills/`.

## What is UberSkillz?

Creating [Claude Code Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) today is entirely manual -- authors hand-write YAML frontmatter and markdown instructions, with no built-in way to preview, validate, or test a skill before deploying it.

UberSkillz is an open-source web application that provides an integrated authoring environment purpose-built for the Claude Code skill format:

- **Skills Library** -- Browse, search, filter, and manage all your skills in one place
- **AI-Assisted Creation** -- Describe what you want in natural language; get a complete SKILL.md draft
- **Structured Editor** -- Edit metadata, instructions, and files with real-time validation and auto-save
- **Multi-Model Testing** -- Test skills against any model on OpenRouter with streaming responses and metrics
- **Export & Deploy** -- One-click deploy to `~/.claude/skills/` or export as zip
- **Import** -- Bulk-import existing skills from directories or zip archives
- **Version History** -- Every change is versioned; browse and compare past versions

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Database | SQLite + Drizzle ORM |
| AI SDK | Vercel AI SDK + OpenRouter provider |
| AI Provider | OpenRouter (Claude, GPT, Gemini, Llama, etc.) |
| Language | TypeScript (strict) |
| Testing | Vitest + Playwright |
| Linting | Biome |

## Quickstart

```bash
# Clone the repository
git clone https://github.com/uberskillz/uberskillsz.git
cd uberskillsz

# Install dependencies
bun install

# Start the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch the app will automatically:

1. Create the `data/` directory and SQLite database
2. Run Drizzle migrations to initialize the schema
3. Generate an encryption secret at `data/.secret`
4. Open the Settings page prompting for an OpenRouter API key

No Docker, no Postgres, no signup required.

## Project Structure

```
uberskillsz/
├── apps/
│   └── web/                 # Next.js 15 web application
├── packages/
│   ├── types/               # Shared TypeScript interfaces
│   ├── db/                  # Database schema, client, queries (Drizzle + SQLite)
│   ├── skill-engine/        # SKILL.md parser, validator, generator, importer, exporter
│   └── ui/                  # Shared UI components (shadcn/ui)
├── specs/                   # Project specifications and documentation
├── turbo.json               # Turborepo pipeline configuration
├── biome.json               # Linter and formatter configuration
└── tsconfig.json            # Base TypeScript configuration
```

## Available Scripts

| Command | Description |
|---|---|
| `bun dev` | Start the development server on port 3000 |
| `bun build` | Build all packages and the web app for production |
| `bun lint` | Run Biome linting across the entire monorepo |
| `bun lint:fix` | Auto-fix lintable issues |
| `bun format` | Format all files with Biome |
| `bun test` | Run unit tests with Vitest across all packages |
| `bun typecheck` | Run TypeScript type checking across all packages |
| `bun db:migrate` | Run database migrations |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `file:data/uberskillz.db` | SQLite database file path |
| `ENCRYPTION_SECRET` | No | Auto-generated | AES-256 key for encrypting the API key. Generated on first run at `data/.secret` if not set |
| `PORT` | No | `3000` | Development server port |
| `NODE_ENV` | No | `development` | Environment mode |

Set these in `apps/web/.env.local` (not committed to version control).

## Detailed Documentation

Full project specifications are available in the [`specs/`](specs/) directory:

- [01 -- Project Overview](specs/01-overview/README.md) -- vision, design principles, color system
- [02 -- Architecture](specs/02-architecture/README.md) -- monorepo structure, API routes, data flow
- [03 -- Data Models](specs/03-data-models/README.md) -- SQLite schema, Drizzle definitions
- [04 -- Functional Requirements](specs/04-functional-requirements/README.md) -- feature specifications (FR1-FR7)
- [05 -- Non-Functional Requirements](specs/05-non-functional-requirements/README.md) -- performance, accessibility
- [06 -- Integrations](specs/06-integrations/README.md) -- OpenRouter, AI models
- [07 -- Deployment](specs/07-deployment/README.md) -- Docker, environment setup

## License

[MIT](LICENSE)
