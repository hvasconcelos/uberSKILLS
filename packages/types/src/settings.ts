/** UI theme preference. */
export type Theme = "light" | "dark" | "system";

/** Application-wide settings stored in the database. */
export interface AppSettings {
  /** OpenRouter API key; encrypted at rest, null if not configured. */
  openrouterApiKey: string | null;
  /** Default model identifier for testing, e.g. "anthropic/claude-sonnet-4". */
  defaultModel: string;
  theme: Theme;
}

/** A validation issue found during skill parsing or form validation. */
export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}
