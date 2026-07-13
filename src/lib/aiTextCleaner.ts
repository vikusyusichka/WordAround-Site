/* Utilities for parsing AI model output coming back through the Cloudflare
   Worker proxy. The worker returns `{ text }`; that text is whatever the model
   produced — often JSON, often wrapped in Markdown fences, sometimes prefixed
   with prose. These helpers turn that into something safe to `JSON.parse`.
   Web port of iOS Core/Services/AIResponseTextCleaner.swift — pure functions,
   no I/O, no logging. */

/** Removes ```json … ``` or ``` … ``` fences and trims whitespace. Robust to
    fences with or without a language tag. */
export const cleanMarkdownFences = (text: string): string => {
  let s = text.trim();

  if (s.startsWith('```')) {
    const newline = s.indexOf('\n');
    s = newline >= 0 ? s.slice(newline + 1) : s.slice(3);
  }

  if (s.endsWith('```')) {
    s = s.slice(0, -3);
  }

  return s.trim();
};

/** Gemini sometimes returns a JSON string ("\"hello\"") instead of a raw value.
    If the input looks like that, unwrap it once. Returns the original when no
    safe unwrap is possible. */
export const unwrapJSONStringIfNeeded = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length < 2 || !trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return text;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parsed : text;
  } catch {
    return text;
  }
};

/** Scan `text` starting at `from` (or the first `opening`), tracking nested
    brackets to find the matching close. Honors string literals + escape
    sequences so a `}` inside a `"..."` is ignored. */
const extractBalancedSpan = (
  text: string,
  opening: '{' | '[',
  closing: '}' | ']',
  from?: number,
): string | null => {
  const begin = from ?? text.indexOf(opening);
  if (begin < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = begin; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
    } else if (c === opening) {
      depth += 1;
    } else if (c === closing) {
      depth -= 1;
      if (depth === 0) return text.slice(begin, i + 1);
    }
  }

  return null;
};

/** Extract the first balanced JSON object `{...}` or array `[...]` from a
    longer string. Returns the input unchanged when no balanced span is found —
    the caller can attempt to decode and surface a decoding error. */
export const extractFirstJSONObjectOrArray = (text: string): string => {
  const firstObject = text.indexOf('{');
  const firstArray = text.indexOf('[');

  if (firstObject < 0 && firstArray < 0) return text;
  if (firstObject < 0) return extractBalancedSpan(text, '[', ']', firstArray) ?? text;
  if (firstArray < 0) return extractBalancedSpan(text, '{', '}', firstObject) ?? text;

  return firstObject < firstArray
    ? (extractBalancedSpan(text, '{', '}', firstObject) ?? text)
    : (extractBalancedSpan(text, '[', ']', firstArray) ?? text);
};

/** One-shot normalizer used by feature clients. Order matters:
    1. Trim whitespace / collapse fences.
    2. Unwrap a double-encoded JSON string if the text is `"…"`.
    3. Re-strip any fences that were inside the unwrapped string. */
export const normalizedText = (raw: string): string => {
  const stripped = cleanMarkdownFences(raw);
  const unwrapped = unwrapJSONStringIfNeeded(stripped);
  return cleanMarkdownFences(unwrapped);
};

/** For JSON-shaped responses: normalize, then aggressively extract the first
    JSON object/array. Result is safe to feed into `JSON.parse`. */
export const cleanJSONText = (raw: string): string =>
  extractFirstJSONObjectOrArray(normalizedText(raw));
