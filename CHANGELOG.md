# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2026-03-07

### Added

- **CLI Entry Point**
  - `npx uberskills` command for running the app directly (#62)

- **Documentation**
  - Documentation page with usage guide
  - Project documentation added to `docs/` directory, replacing `specs/` references
  - README updated to reference `docs/` instead of `specs/`

- **UI**
  - Sticky footer with author attribution
  - Progressive disclosure for skill files in test system prompt (#60)

### Changed

- **Monorepo & Tooling**
  - Migrated from Bun to Node.js with pnpm as package manager (#61)
  - Rebranded display titles from UberSkills to uberSKILLS

- **Skill Engine**
  - Aligned skill engine with Anthropic's official skill guide

### Fixed

- Granted `nextjs` user write access to `.next/cache` directory in Docker
- Added `python3` and build tools to Dockerfile deps stage for `better-sqlite3`
- Used `groupadd`/`useradd` in Dockerfile for Debian-based image
- Corrected deploy test expectation to match mock file path
- Surfaced `SyncError` in models route and updated tests
- Added models table to migration test expectations
- Resolved Biome lint errors in sidebar and chat panel
- Resolved Biome formatting in models route
- Fixed broken links in documentation

## [0.9.0] - 2026-03-06

### Added

- **Monorepo & Tooling**
  - Turborepo monorepo with Bun package manager
  - Biome for linting and formatting
  - Vitest for unit testing
  - Playwright for E2E testing
  - GitHub Actions CI/CD pipeline

- **Core Packages**
  - `@uberskills/types` -- shared TypeScript interfaces and enums
  - `@uberskills/db` -- Drizzle ORM schema, typed CRUD queries, SQLite/Turso support, AES-256-GCM API key encryption
  - `@uberskills/skill-engine` -- SKILL.md parser, validator, generator, argument substitution, importer, and exporter
  - `@uberskills/ui` -- shadcn/ui component library

- **Database**
  - SQLite schema with 5 tables: skills, skill_files, skill_versions, test_runs, settings
  - Database migrations and seed data
  - Database backup and restore functionality
  - OpenRouter model caching in DB with searchable selector

- **UI & Design**
  - Indigo Craft design system with light/dark mode support
  - Collapsible left sidebar with sections, external links, and skill count badge
  - Custom app icon in sidebar header
  - Dashboard home page
  - Shared page components (StatusBadge, SkillCard)

- **Settings**
  - Settings API route and page
  - API key management with encrypted storage
  - User preferences and data management

- **Skills Library**
  - Skills CRUD API routes
  - Skills library page with grid and list view toggle
  - Search, pagination, and sorting

- **Skill Editor**
  - Tabbed editor with vertical sidebar layout (Metadata, Instructions, Files, Preview, History)
  - Metadata form with validation
  - Markdown editor for instructions
  - File management tab
  - SKILL.md preview with generation and copy
  - Version history with content snapshots
  - Auto-save with debounce
  - Real-time validation feedback
  - Skill delete with confirmation dialog

- **AI-Assisted Creation**
  - AI chat API route with streaming via OpenRouter and Vercel AI SDK
  - AI skill creation page with chat panel and preview panel
  - Reusable model selector component

- **Skill Testing**
  - Skill test API route with streaming and metrics
  - Testing page with configuration panel
  - Response panel with formatted markdown rendering
  - Resolved system prompt dialog
  - Test history table

- **Import / Export / Deploy**
  - Skill exporter (zip file generation)
  - Skill importer (zip/directory parsing)
  - Export and deploy API routes
  - Export and deploy buttons in editor
  - Import page for uploading skills
  - One-click deploy to `~/.claude/skills/`

- **Logging**
  - Structured logging with Pino across all API routes
  - Configurable log level via `LOG_LEVEL` environment variable
  - Sensitive field redaction (API keys, authorization headers)

- **Deployment**
  - Multi-stage Dockerfile with Bun
  - Docker Compose service definition
  - Volume mount for data persistence

### Fixed

- Model passed to chat transport via ref to avoid stale closure
- Skill editor uses slug instead of ID in tab and test link URLs
- Run Test button disabled immediately on click to prevent double submissions
- Truncated skill descriptions in list view to prevent column overflow
- Active sidebar tab uses bold font instead of gray background
- Send button aligned with chat input field
- Sidebar separator placed inside content to fix overflow
- Consistent padding on instructions tab content
- Tab content max-width adjusted for balanced padding

[0.9.1]: https://github.com/hvasconcelos/uberskills/releases/tag/v0.9.1
[0.9.0]: https://github.com/hvasconcelos/uberskills/releases/tag/v0.9.0
