# Contributing to UberSkills

Thank you for your interest in contributing to UberSkills! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/uberskills.git
   cd uberskills
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Start the dev server**:
   ```bash
   bun dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) to verify everything works.

## Development Workflow

### Branch Naming

Create a feature branch from `master`:

```bash
git checkout -b feat/short-description
# or
git checkout -b fix/short-description
```

### Making Changes

1. Make your changes in the appropriate package or app
2. Write or update tests as needed
3. Ensure all checks pass before committing:
   ```bash
   bun lint        # Linting (Biome)
   bun typecheck   # TypeScript type checking
   bun test        # Unit tests (Vitest)
   bun build       # Production build
   ```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add skill duplication feature
fix: resolve slug collision on import
docs: update environment variables table
refactor: simplify database client initialization
test: add parser edge case tests
```

### Pull Requests

1. Push your branch to your fork
2. Open a PR against `master` on the upstream repository
3. Fill in the PR template with:
   - A clear description of what changed and why
   - How to test the changes
   - Screenshots if applicable (for UI changes)
4. Wait for CI checks to pass
5. Address any review feedback

## Coding Standards

### TypeScript

- Strict mode is enabled -- no `any` types, no unused variables
- Use `const` over `let` where possible
- Prefer explicit return types on exported functions

### Formatting

Biome handles all formatting. Run `bun format` to auto-format, or configure your editor to format on save. Key rules:

- 2-space indentation
- 100-character line width
- Double quotes
- Semicolons always
- Trailing commas

### File Naming

- Files: `kebab-case.ts` / `kebab-case.tsx`
- React components: `PascalCase` exports in `kebab-case.tsx` files
- Tests: `src/__tests__/module-name.test.ts`

### Imports

Order imports as:
1. External packages (`react`, `next/server`, etc.)
2. Workspace packages (`@uberskills/types`, `@uberskills/db`)
3. Relative imports (`./utils`, `../components`)

## Project Structure

| Directory | Purpose |
|---|---|
| `apps/web/` | Next.js 15 web application |
| `packages/types/` | Shared TypeScript interfaces and enums |
| `packages/db/` | Database schema, client, queries, encryption |
| `packages/skill-engine/` | SKILL.md parser, validator, generator, importer, exporter |
| `packages/ui/` | Shared shadcn/ui components |
| `docs/` | Project documentation |

## Testing

- **Unit tests**: Vitest, colocated in `src/__tests__/`. Use in-memory SQLite for database tests.
- **E2E tests**: Playwright, in `apps/web/e2e/`. Mock external API calls.
- Never call real external APIs (OpenRouter) in tests.

## Reporting Issues

Use [GitHub Issues](https://github.com/uberskills/uberskills/issues) to report bugs or request features. Include:

- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, Bun version, browser)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
