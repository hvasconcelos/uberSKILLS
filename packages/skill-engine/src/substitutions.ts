/** Matches `$VARIABLE_NAME` tokens (uppercase letters and underscores). */
const PLACEHOLDER_RE = /\$([A-Z_]+)/g;

/**
 * Scan `content` and return the unique `$VARIABLE_NAME` placeholder
 * names found (without the leading `$`).
 */
export function detectPlaceholders(content: string): string[] {
  const seen = new Set<string>();

  for (const match of content.matchAll(PLACEHOLDER_RE)) {
    const name = match[1];
    if (name) {
      seen.add(name);
    }
  }

  return [...seen];
}

/**
 * Replace every `$VARIABLE_NAME` occurrence in `content` with the
 * corresponding value from `values`.
 *
 * Placeholders not present in `values` are left unchanged.
 */
export function substitute(content: string, values: Record<string, string>): string {
  return content.replace(PLACEHOLDER_RE, (original, name: string) => {
    return values[name] ?? original;
  });
}
