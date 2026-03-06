# Database

UberSkills uses SQLite accessed via Drizzle ORM. The database file is stored locally at `data/uberskills.db` (configurable via `DATABASE_URL`).

## Connection

The `DATABASE_URL` environment variable determines the driver:

- `file:` prefix -- uses `better-sqlite3` (local SQLite)
- `libsql://` prefix -- uses `@libsql/client` (Turso, for cloud deployment)

Default: `file:data/uberskills.db`

The database uses a singleton connection pattern. On first connection, it auto-creates the `data/` directory and runs migrations.

## Schema

There are 5 tables: `skills`, `skill_files`, `skill_versions`, `test_runs`, and `settings`.

### Entity Relationships

```
skills (1) --> (N) skill_files
skills (1) --> (N) skill_versions
skills (1) --> (N) test_runs
settings (standalone key-value store)
```

All child tables use `onDelete: "cascade"` -- deleting a skill removes all associated files, versions, and test runs.

### skills

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | nanoid |
| `name` | text | Human-readable skill name |
| `slug` | text (unique) | URL-safe identifier, auto-generated from name |
| `description` | text | Skill description |
| `trigger` | text | When the skill should activate |
| `tags` | text | JSON array of tag strings |
| `model_pattern` | text | Optional regex for model matching |
| `content` | text | SKILL.md markdown body (instructions) |
| `status` | text | `draft` / `ready` / `deployed` |
| `created_at` | integer (timestamp) | Creation date |
| `updated_at` | integer (timestamp) | Last modification date |

### skill_files

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | nanoid |
| `skill_id` | text (FK) | References `skills.id` |
| `path` | text | Relative path, e.g. `prompts/setup.md` |
| `content` | text | File content |
| `type` | text | `prompt` / `resource` |
| `created_at` | integer (timestamp) | Creation date |
| `updated_at` | integer (timestamp) | Last modification date |

### skill_versions

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | nanoid |
| `skill_id` | text (FK) | References `skills.id` |
| `version` | integer | Auto-incremented per skill |
| `content_snapshot` | text | Full SKILL.md at this version |
| `metadata_snapshot` | text | JSON of frontmatter at this version |
| `change_summary` | text | Description of changes |
| `created_at` | integer (timestamp) | Creation date |

### test_runs

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | nanoid |
| `skill_id` | text (FK) | References `skills.id` |
| `model` | text | Model ID, e.g. `anthropic/claude-sonnet-4` |
| `system_prompt` | text | Resolved system prompt sent to model |
| `user_message` | text | User's test message |
| `assistant_response` | text | AI response (null while streaming) |
| `arguments` | text | JSON of substituted arguments |
| `prompt_tokens` | integer | Input token count |
| `completion_tokens` | integer | Output token count |
| `total_tokens` | integer | Total token count |
| `latency_ms` | integer | Total response time |
| `ttft_ms` | integer | Time to first token |
| `status` | text | `running` / `completed` / `error` |
| `error` | text | Error message if status is `error` |
| `created_at` | integer (timestamp) | Creation date |

### settings

| Column | Type | Description |
|---|---|---|
| `key` | text (PK) | Setting key |
| `value` | text | Setting value |
| `encrypted` | integer (boolean) | Whether the value is encrypted |
| `updated_at` | integer (timestamp) | Last modification date |

**Known keys:**

| Key | Encrypted | Description |
|---|---|---|
| `openrouter_api_key` | Yes | OpenRouter API key |
| `default_model` | No | Default model ID for testing |
| `theme` | No | UI theme: `light` / `dark` / `system` |

## Conventions

### IDs

All entities use `nanoid()` for primary keys (21-character alphanumeric string). Slugs are auto-generated from skill names (lowercase, hyphenated, with numeric suffix on collision).

### Timestamps

Timestamp columns use `integer("column", { mode: "timestamp" })` with `$defaultFn(() => new Date())`.

### JSON Fields

Arrays and objects (tags, arguments) are stored as JSON strings in `text` columns. Parse with `JSON.parse()`, serialize with `JSON.stringify()`.

### Queries

Query functions are in `packages/db/src/queries/*.ts`. Each file exports typed CRUD functions. All queries use Drizzle's typed query builder -- never raw SQL. Search uses SQLite `LIKE` on name, description, and tags fields.
