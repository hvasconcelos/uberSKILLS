"use client";

import { Button } from "@uberskills/ui";
import type { ChatStatus, UIMessage } from "ai";
import { AlertCircle, Key, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

import { ModelSelector } from "@/components/model-selector";

import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

interface ChatPanelProps {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  sendMessage: (message: { text: string }) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  input: string;
  onInputChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  hasApiKey: boolean;
}

/**
 * Left panel of the skill creation page.
 * Contains the model selector, scrollable message list,
 * and the chat input area at the bottom.
 */
export function ChatPanel({
  messages,
  status,
  error,
  sendMessage,
  regenerate,
  stop,
  input,
  onInputChange,
  selectedModel,
  onModelChange,
  hasApiKey,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStreaming = status === "submitted" || status === "streaming";

  // Track the last assistant message text length to auto-scroll during streaming
  const lastAssistantText =
    messages
      .filter((m) => m.role === "assistant")
      .at(-1)
      ?.parts.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: lastAssistantText.length drives auto-scroll during streaming
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, lastAssistantText.length]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    onInputChange("");
    await sendMessage({ text });
  }, [input, onInputChange, sendMessage]);

  const lastMessage = messages.at(-1);
  const canRegenerate = lastMessage?.role === "assistant" && !isStreaming;
  const errorText = resolveErrorText(error);

  if (!hasApiKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <Key className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">API Key Required</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your OpenRouter API key in Settings to use AI-assisted skill creation.
          </p>
        </div>
        <Button asChild variant="default">
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Model selector at top */}
      <div className="shrink-0 border-b border-border p-3">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Model</span>
        <ModelSelector value={selectedModel} onChange={onModelChange} disabled={isStreaming} />
      </div>

      {/* Message list -- scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-sm">Describe the skill you want to create.</p>
            <p className="mt-1 text-xs">
              The AI will generate a SKILL.md file based on your description.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Streaming indicator */}
            {status === "submitted" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Thinking...
              </div>
            )}

            {/* Error display */}
            {errorText && (
              <div
                className="flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
                style={{
                  borderColor: "var(--status-error-text)",
                  color: "var(--status-error-text)",
                }}
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Regenerate button */}
            {canRegenerate && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={regenerate}>
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area at bottom */}
      <div className="shrink-0 border-t border-border p-3">
        {isStreaming ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">AI is responding...</span>
            <Button variant="outline" size="sm" onClick={stop}>
              Stop
            </Button>
          </div>
        ) : (
          <ChatInput
            value={input}
            onChange={onInputChange}
            onSubmit={handleSubmit}
            isStreaming={isStreaming}
            disabled={!selectedModel}
            placeholder={
              selectedModel
                ? "Describe the skill you want to create..."
                : "Select a model above first..."
            }
          />
        )}
      </div>
    </div>
  );
}

function resolveErrorText(error: Error | undefined): string | null {
  if (!error) return null;
  const msg = error.message;

  if (msg.includes("NO_API_KEY") || msg.includes("401")) {
    return "API key is missing or invalid. Check your Settings.";
  }
  if (msg.includes("RATE_LIMITED") || msg.includes("429")) {
    return "Rate limited by the AI provider. Please wait and try again.";
  }
  if (msg.includes("UPSTREAM_ERROR") || msg.includes("502")) {
    return "The AI provider is temporarily unavailable. Please try again.";
  }

  return msg || "An unexpected error occurred.";
}
