# AI Integration

UberSkills uses [OpenRouter](https://openrouter.ai) as its AI provider, accessed through the [Vercel AI SDK](https://sdk.vercel.ai) with the `@openrouter/ai-sdk-provider` bridge.

## Overview

```
Client (useChat)  -->  API Route (streamText)  -->  OpenRouter  -->  AI Model
                  <--  SSE stream              <--             <--
```

All AI calls are server-side. The OpenRouter API key is decrypted from the database only in API route handlers and never exposed to the client.

## OpenRouter

### API Key

- Stored encrypted (AES-256-GCM) in the `settings` table.
- Decrypted server-side in API route handlers.
- Never logged, never included in error messages, never sent to the client.

### Models Endpoint

```
GET https://openrouter.ai/api/v1/models
```

Used to populate model selector dropdowns. Results are cached in the database.

### Chat Completions

```
POST https://openrouter.ai/api/v1/chat/completions
```

Used for skill creation and testing. Responses are streamed via SSE. Token usage is returned in the final chunk.

### Required Headers

All requests to OpenRouter include:

```
HTTP-Referer: http://localhost:3000
X-Title: UberSkills
```

## Vercel AI SDK

### Server-Side -- `streamText()`

Used in `/api/chat` and `/api/test` route handlers:

```typescript
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export async function POST(req: Request) {
  const { messages, model } = await req.json();
  const apiKey = await getDecryptedApiKey();

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter(model),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Client-Side -- `useChat()`

Used in React components for chat and testing interfaces:

```typescript
import { useChat } from "ai/react";

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: "/api/chat",
  body: { model: selectedModel },
});
```

### Key Features Used

| Feature | Usage |
|---|---|
| `streamText()` | Server-side streaming in API routes |
| `useChat()` | Client-side chat hook with automatic streaming |
| `toDataStreamResponse()` | Convert stream to Next.js-compatible Response |
| `onFinish` callback | Capture token usage and save to `test_runs` |

## System Prompts

### Skill Creation

When using AI-assisted creation, the system prompt instructs the model to generate valid SKILL.md output with:

- YAML frontmatter containing `name`, `description`, and `trigger` fields
- Clear, actionable markdown instructions
- Example trigger scenarios

### Skill Testing

The resolved skill content itself serves as the system prompt. Any `$ARGUMENTS` or `$VARIABLE_NAME` placeholders are substituted with user-provided values before sending.
