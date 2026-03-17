# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.9] - 2026-03-17

### Changed

- **AI Skill Creation**
  - Switched AI output format from YAML frontmatter to structured JSON code block with explicit required fields (`name`, `description`, `trigger`, `content`), making skill generation more consistent and reliable
  - Enforced stricter metadata constraints in system prompt: name ≤ 100 chars, description ≤ 500 chars
  - Reduced `MAX_DESCRIPTION_LENGTH` from 1024 to 500 characters in the skill validator

### Fixed

- Resolved issue where skill name was sometimes missing from AI-generated output, preventing the preview panel from parsing the skill
- Fixed lint issues in documentation page

## [0.9.8] - 2026-03-13

### Added

- **Deploy Targets**
  - Added deploy targets for Antigravity, Cursor, Gemini CLI, GitHub Copilot, and Windsurf — now supports 8 agent tools with correct filesystem paths

- **Import**
  - Inline import results card replacing the results dialog
  - Agent selector dropdown for directory scanning on the import page
  - Tilde expansion and symlink support in the skill importer
  - Filter out skills without names during import

### Changed

- Updated supported agents list across landing page, README, FAQ, feature cards, how-it-works, meta descriptions, JSON-LD structured data, and in-app documentation
- Replaced removed OpenClaw target and corrected Codex path to `~/.agents/skills/`

## [0.9.7] - 2026-03-13

### Added

- **Landing Page SEO**
  - OpenGraph meta tags, sitemap, and robots.txt for landing page
  - JSON-LD structured data for improved search engine visibility
  - Umami analytics integration for privacy-friendly usage tracking

### Changed

- Updated `npx` install command to scoped package name `npx @uberskillsdev/uberskills` across README, landing page, and CHANGELOG

### Fixed

- Resolved Biome lint errors in landing page JSON-LD structured data
- Corrected CLI entry point command in CHANGELOG v0.9.1 to match scoped package name

## [0.9.6] - 2026-03-10

### Added

- **Landing Page**
  - Separated landing page into standalone app (`apps/landing/`)
  - FAQ section
  - Feature cards: Skills Library, Structured Editor, Import & Share, Version History, SKILL.md Standard
  - Demo video in hero section with poster image for faster perceived loading
  - Agent Skills Standard link in README and landing footer

- **UI**
  - Welcome modal with OpenRouter API key setup video for first-time users (cookie-based, shows once)
  - Consistent skeleton loaders across all pages
  - Sidebar icon visible when collapsed

- **Deployment**
  - Multi-agent deploy target selector (Claude Code, OpenCode)
  - Separate Dockerfiles for web and landing apps
  - Railway deployment config for web and landing apps

- **Documentation**
  - Brand identity and color palette added to CLAUDE.md

### Changed

- Rebranded to "Agent Skills" with multi-agent deploy target support
- Replaced lucide icons with emojis on landing page feature cards
- Landing page feature cards use 4-column grid layout
- Removed dead portal links from landing page
- Simplified logger transport configuration

### Fixed

- Deferred skill preview parsing until stream completes to prevent partial render
- Prevented AI skill creation output from being truncated
- Resolved lint issues in chat-panel formatting and dependencies
- Used brand colors for feature card icons instead of colored variants

## [0.9.5] - 2026-03-07

### Changed

- Replaced custom inline spinner with `ora` package for polished animated progress during CLI setup steps
- Switched from blocking `execSync` to async `spawn`-based command runner so spinner animates during long-running commands

### Fixed

- Used `Number.isNaN` instead of global `isNaN` in CLI port validation
- Used template literal instead of string concatenation in banner output
- Removed unused `run()` function

## [0.9.4] - 2026-03-07

### Changed

- Replaced verbose `stdio: "inherit"` output during first-run setup with a clean animated spinner per step (clone, corepack, install, build), surfacing errors only on failure

## [0.9.3] - 2026-03-07

### Fixed

- Prevented ASCII startup banner from printing multiple times during build and dev by guarding with a `globalThis` flag

## [0.9.2] - 2026-03-07

### Changed

- **Branding**
  - Regenerated app icons from new SVG logo
  - Replaced sidebar title with theme-aware watermark logos
  - Updated dark theme to use brand colors: `#171414` (warm black) background and `#6A6A6A` (medium gray) for primary actions, focus rings, and accents
  - Aligned light theme with brand colors: neutral tones replacing indigo-tinted palette, `#171414` as primary action color
  - Updated sidebar skill counter badge from hardcoded blue to brand-aligned design tokens

- **Monorepo & Tooling**
  - Renamed package to `@uberskillsdev/uberskills` and updated GitHub org references

### Fixed

- Lowercased Docker image name in release workflow
- Added `registry-url` to `setup-node` in release workflow for npm authentication
- Corrected scoped package tarball name in release publish step

## [0.9.1] - 2026-03-07

### Added

- **CLI Entry Point**
  - `npx @uberskillsdev/uberskills` command for running the app directly (#62)

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

[0.9.9]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.9
[0.9.8]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.8
[0.9.7]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.7
[0.9.6]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.6
[0.9.5]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.5
[0.9.4]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.4
[0.9.3]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.3
[0.9.2]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.2
[0.9.1]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.1
[0.9.0]: https://github.com/uberskillsdev/uberskills/releases/tag/v0.9.0
