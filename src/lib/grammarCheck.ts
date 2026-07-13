/* LanguageTool grammar-check client. Public API at
   https://api.languagetool.org/v2/check accepts POST with
   application/x-www-form-urlencoded and returns JSON matches. CORS is
   enabled server-side, so browser calls work without a proxy.
   Free tier: 20 requests/min, 20 KB text per request. We cap at 6000 chars
   to stay comfortably under the limit (mirrors iOS default). */
import { LANGUAGE_TOOL_CODE, type GrammarIssue, type GrammarIssueCategory, type GrammarLanguage } from '@/lib/essayTypes';

const ENDPOINT = 'https://api.languagetool.org/v2/check';
const MAX_CHARS = 6000;
const TIMEOUT_MS = 20_000;

export type GrammarCheckErrorCode =
  | 'grammar/empty'
  | 'grammar/too-long'
  | 'grammar/unsupported-language'
  | 'grammar/network'
  | 'grammar/server-error'
  | 'grammar/timeout'
  | 'grammar/malformed';

export interface GrammarCheckError extends Error {
  code: GrammarCheckErrorCode;
  status?: number;
}

const makeError = (
  code: GrammarCheckErrorCode,
  message: string,
  status?: number,
): GrammarCheckError =>
  Object.assign(new Error(message), { code, status }) as GrammarCheckError;

interface LanguageToolMatch {
  message: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  rule: { category: { id: string } };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

const mapCategory = (raw: string): GrammarIssueCategory => {
  const normalized = raw.toLowerCase();
  if (
    normalized.includes('typography') ||
    normalized.includes('style') ||
    normalized.includes('misc')
  ) {
    return 'style';
  }
  if (
    normalized.includes('vocabulary') ||
    normalized.includes('confused_words') ||
    normalized.includes('wordiness')
  ) {
    return 'vocabulary';
  }
  return 'grammar';
};

/** UTF-16-safe substring (LanguageTool offsets are UTF-16 code units). */
const safeSubstring = (source: string, offset: number, length: number): string | null => {
  if (offset < 0 || length < 0) return null;
  if (offset + length > source.length) return null;
  return source.slice(offset, offset + length);
};

const withTimeout = <T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        onTimeout();
        reject(makeError('grammar/timeout', `Grammar check timed out after ${ms}ms`));
      }, ms),
    ),
  ]);

/** Run grammar check on `text` in `language`. Throws GrammarCheckError on
    any failure — never returns partial results. */
export const checkGrammar = async (
  text: string,
  language: GrammarLanguage,
  signal?: AbortSignal,
): Promise<GrammarIssue[]> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw makeError('grammar/empty', 'Text is empty');
  if (trimmed.length > MAX_CHARS) {
    throw makeError('grammar/too-long', `Text exceeds ${MAX_CHARS} chars`);
  }

  const ltCode = LANGUAGE_TOOL_CODE[language.id];
  if (!ltCode) throw makeError('grammar/unsupported-language', `No LanguageTool code for ${language.id}`);

  const body = new URLSearchParams({ text: trimmed, language: ltCode }).toString();

  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  const fetchPromise = fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body,
    signal: controller.signal,
  });

  let response: Response;
  try {
    response = await withTimeout(fetchPromise, TIMEOUT_MS, () => controller.abort());
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e) throw e as GrammarCheckError;
    throw makeError('grammar/network', e instanceof Error ? e.message : 'Network error');
  }

  if (!response.ok) {
    throw makeError('grammar/server-error', `Server returned ${response.status}`, response.status);
  }

  let parsed: LanguageToolResponse;
  try {
    parsed = (await response.json()) as LanguageToolResponse;
  } catch {
    throw makeError('grammar/malformed', 'Server response was not valid JSON');
  }

  return parsed.matches
    .map((match): GrammarIssue | null => {
      const incorrectText = safeSubstring(trimmed, match.offset, match.length);
      if (incorrectText === null) return null;
      return {
        id: crypto.randomUUID(),
        message: match.message,
        incorrectText,
        suggestedCorrection: match.replacements[0]?.value ?? null,
        offset: match.offset,
        length: match.length,
        category: mapCategory(match.rule.category.id),
      };
    })
    .filter((i): i is GrammarIssue => i !== null);
};
