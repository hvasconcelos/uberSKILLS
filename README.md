# uberSKILLS

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/uberskillsdev/uberskills/ci.yml?branch=master)](https://github.com/uberskillsdev/uberskills/actions)

**Design, test, and deploy Claude Code Agent Skills through a visual, AI-assisted workflow.**

uberSKILLS replaces manual `SKILL.md` authoring with a structured editor, multi-model testing sandbox, and one-click deployment to `~/.claude/skills/`.

## What is uberSKILLS?

Creating [Claude Code Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) today is entirely manual -- authors hand-write YAML frontmatter and markdown instructions, with no built-in way to preview, validate, or test a skill before deploying it.

uberSKILLS is an open-source web application that provides an integrated authoring environment purpose-built for the Claude Code skill format:

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
| Monorepo | Turborepo + pnpm |
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Database | SQLite + Drizzle ORM |
| AI SDK | Vercel AI SDK + OpenRouter provider |
| AI Provider | OpenRouter (Claude, GPT, Gemini, Llama, etc.) |
| Logging | Pino (JSON in production, pino-pretty in development) |
| Language | TypeScript (strict) |
| Testing | Vitest + Playwright |
| Linting | Biome |

## Quickstart

Run uberSKILLS with a single command — no cloning, no setup:

```bash
npx uberskills
```

That's it. On first run it will automatically set up everything (~2 minutes), then start the server at [http://localhost:3000](http://localhost:3000).

Your data is stored at `~/.uberskills/data/` and persists across runs.

### Options

```
--port <number>    Port to run on (default: 3000)
--host <string>    Host to bind to (default: localhost)
--data-dir <path>  Custom data directory (default: ~/.uberskills/data/)
--reset            Delete cached install and re-setup
-d, --debug        Enable debug log level
```

### Prerequisites

- **Node.js** >= 20
- **git** — available in PATH

### Development Setup

If you want to contribute or run from source:

```bash
# Clone the repository
git clone https://github.com/uberskillsdev/uberskills.git
cd uberskills

# Install dependencies (pnpm is enabled via corepack)
corepack enable
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch the app will automatically:

1. Create the `data/` directory and SQLite database
2. Run Drizzle migrations to initialize the schema
3. Generate an encryption secret at `data/.secret`
4. Open the Settings page prompting for an OpenRouter API key

No Docker, no Postgres, no signup required.

## Project Structure

```
uberskills/
├── apps/
│   └── web/                 # Next.js 15 web application
├── packages/
│   ├── types/               # Shared TypeScript interfaces
│   ├── db/                  # Database schema, client, queries (Drizzle + SQLite)
│   ├── skill-engine/        # SKILL.md parser, validator, generator, importer, exporter
│   └── ui/                  # Shared UI components (shadcn/ui)
├── docs/                    # Project documentation
├── turbo.json               # Turborepo pipeline configuration
├── biome.json               # Linter and formatter configuration
└── tsconfig.json            # Base TypeScript configuration
```

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server on port 3000 |
| `pnpm build` | Build all packages and the web app for production |
| `pnpm lint` | Run Biome linting across the entire monorepo |
| `pnpm lint:fix` | Auto-fix lintable issues |
| `pnpm format` | Format all files with Biome |
| `pnpm test` | Run unit tests with Vitest across all packages |
| `pnpm typecheck` | Run TypeScript type checking across all packages |
| `pnpm db:migrate` | Run database migrations |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `file:data/uberskills.db` | SQLite database file path |
| `ENCRYPTION_SECRET` | No | Auto-generated | AES-256 key for encrypting the API key. Generated on first run at `data/.secret` if not set |
| `PORT` | No | `3000` | Development server port |
| `LOG_LEVEL` | No | `info` | Pino log level (`debug`, `info`, `warn`, `error`, `fatal`, `silent`) |
| `NODE_ENV` | No | `development` | Environment mode |

Set these in `apps/web/.env.local` (not committed to version control).

## Detailed Documentation

Full project documentation is available in the [`docs/`](docs/) directory:

- [Getting Started](docs/getting-started.md) -- Installation, setup, and first steps
- [Features Guide](docs/features.md) -- How to use the skills library, editor, testing, import/export
- [Architecture](docs/architecture.md) -- Monorepo structure, package responsibilities, data flow
- [API Reference](docs/api-reference.md) -- REST API endpoints and response formats
- [Database](docs/database.md) -- Schema, Drizzle ORM patterns, queries
- [AI Integration](docs/ai-integration.md) -- OpenRouter, Vercel AI SDK, streaming
- [Skill Engine](docs/skill-engine.md) -- Parser, validator, generator, importer, exporter
- [Security](docs/security.md) -- Encryption, input validation, filesystem safety
- [Deployment](docs/deployment.md) -- Docker, Vercel, self-hosting options

## Docker

Build and run via Docker:

```bash
docker compose up -d
```

The app will be available at [http://localhost:3000](http://localhost:3000). The `data/` directory is mounted as a volume for persistence.

See [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml) for details.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on our development workflow, coding standards, and how to submit pull requests.

## License

[MIT](LICENSE)
