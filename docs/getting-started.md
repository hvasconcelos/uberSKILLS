# Getting Started

UberSkills is a local-first web application for creating, testing, and deploying Claude Code Agent Skills. No signup, no external services required (except an AI provider for chat/testing features).

## Prerequisites

- [Bun](https://bun.sh) v1.3.10 or later
- [Node.js](https://nodejs.org) v18+ (for Next.js runtime)

## Installation

```bash
git clone https://github.com/<org>/uberskills.git
cd uberskills
bun install
```

## Start the Development Server

```bash
bun dev
```

The app is now running at [http://localhost:3000](http://localhost:3000).

On first launch, UberSkills will automatically:

1. Create the `data/` directory for the SQLite database.
2. Run database migrations to initialize the schema.
3. Generate an encryption secret at `data/.secret` for API key storage.

## Configure Your API Key

1. Navigate to **Settings** in the sidebar.
2. Enter your [OpenRouter](https://openrouter.ai) API key.
3. Click **Test** to verify the connection.

The API key is encrypted at rest using AES-256-GCM and never exposed to the client.

## Core Workflow

1. **Create** a skill -- manually or via AI chat at `/skills/new`.
2. **Edit** metadata, instructions, and files in the skill editor.
3. **Test** the skill against any AI model available on OpenRouter.
4. **Export** as a zip file or **Deploy** directly to `~/.claude/skills/`.

## Environment Variables

All environment variables are optional. Set them in `apps/web/.env.local`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:data/uberskills.db` | SQLite file path or Turso connection string |
| `ENCRYPTION_SECRET` | Auto-generated | AES-256-GCM key for API key encryption |
| `PORT` | `3000` | Development server port |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error`, `fatal`, `silent` |
| `NODE_ENV` | `development` | Environment mode |

## Common Commands

```bash
bun install          # Install all dependencies
bun dev              # Start dev server (port 3000)
bun build            # Production build
bun lint             # Lint with Biome
bun lint:fix         # Auto-fix lint issues
bun format           # Format with Biome
bun typecheck        # TypeScript type checking
bun test             # Run unit tests (Vitest)
bun run test:e2e     # Run E2E tests (Playwright)
bun run db:migrate   # Run database migrations
```

## Next Steps

- [Features Guide](features.md) -- Learn about all the features
- [Deployment](deployment.md) -- Deploy with Docker or to the cloud
