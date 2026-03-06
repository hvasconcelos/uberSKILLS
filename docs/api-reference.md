# API Reference

All API routes are in `apps/web/app/api/`. They use Next.js App Router conventions with `NextRequest` and `NextResponse`.

## Error Response Format

All errors follow this format:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

### Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Validation error |
| `401` | Missing or invalid API key |
| `404` | Resource not found |
| `409` | Conflict (slug collision, version conflict) |
| `429` | Rate limited (OpenRouter) |
| `500` | Internal server error |
| `502` | Upstream error (OpenRouter) |

## Skills

### List Skills

```
GET /api/skills
```

Query parameters:

- `search` -- Filter by name, description, or tags
- `status` -- Filter by `draft`, `ready`, or `deployed`
- `page` -- Page number (default: 1)
- `limit` -- Items per page (default: 12)
- `sort` -- Sort field: `updated_at`, `name`, `created_at`
- `order` -- Sort direction: `asc`, `desc`

### Create Skill

```
POST /api/skills
Content-Type: application/json

{
  "name": "PR Reviewer",
  "description": "Reviews pull requests",
  "trigger": "When user asks to review a PR",
  "tags": ["review", "pr"],
  "content": "## Instructions\n..."
}
```

### Get Skill

```
GET /api/skills/[id]
```

### Update Skill

```
PUT /api/skills/[id]
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  ...
}
```

### Delete Skill

```
DELETE /api/skills/[id]
```

Cascades to skill_files, skill_versions, and test_runs.

## AI Chat

### Stream Chat Response

```
POST /api/chat
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "Create a skill that..." }],
  "model": "anthropic/claude-sonnet-4"
}
```

Returns a streaming response (Server-Sent Events) via Vercel AI SDK's `toDataStreamResponse()`. Used with the `useChat()` hook on the client.

## Skill Testing

### Run Test

```
POST /api/test
Content-Type: application/json

{
  "skillId": "abc123",
  "model": "anthropic/claude-sonnet-4",
  "userMessage": "Review this PR",
  "arguments": { "FILE_PATH": "/src/index.ts" }
}
```

Returns a streaming response. On completion, a `test_runs` row is saved with token usage and latency metrics.

## Export and Deploy

### Export as Zip

```
POST /api/export
Content-Type: application/json

{
  "skillId": "abc123"
}
```

Returns a `.zip` file download containing the skill directory structure.

### Deploy to Filesystem

```
POST /api/export/deploy
Content-Type: application/json

{
  "skillId": "abc123"
}
```

Writes the skill to `~/.claude/skills/<slug>/`. Returns the deployed path.

## Import

### Import Skills

```
POST /api/import
Content-Type: multipart/form-data

# Upload a .zip file, or:
Content-Type: application/json

{
  "directory": "~/.claude/skills/"
}
```

Returns a list of discovered skills with validation results.

## Settings

### Get Settings

```
GET /api/settings
```

Returns app settings. The API key value is never included in the response.

### Update Settings

```
PUT /api/settings
Content-Type: application/json

{
  "openrouterApiKey": "sk-or-...",
  "defaultModel": "anthropic/claude-sonnet-4",
  "theme": "dark"
}
```

The API key is encrypted before storage.

## Models

### List Models

```
GET /api/models
```

Returns available AI models from OpenRouter. Results are cached in the database.
