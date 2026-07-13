/* Helper-toolbar service: translation (MyMemory) + synonyms (Datamuse).
   Web port of iOS EssayAssistanceService.swift. Both APIs are public,
   browser-callable (CORS enabled), no key. All functions throw
   AssistanceError on failure. */
import { apiCodeFor, type EssayAssistanceItem, type GrammarLanguage } from '@/lib/essayTypes';

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
const DATAMUSE_ENDPOINT = 'https://api.datamuse.com/words';
const TIMEOUT_MS = 20_000;

export type AssistanceErrorCode =
  | 'assist/empty'
  | 'assist/same-language'
  | 'assist/network'
  | 'assist/server-error'
  | 'assist/no-result'
  | 'assist/timeout';

export interface AssistanceError extends Error {
  code: AssistanceErrorCode;
  status?: number;
}

const makeError = (code: AssistanceErrorCode, message: string, status?: number): AssistanceError =>
  Object.assign(new Error(message), { code, status }) as AssistanceError;

const withTimeout = <T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        onTimeout();
        reject(makeError('assist/timeout', `Request timed out after ${ms}ms`));
      }, ms),
    ),
  ]);

const getJSON = async (url: string, signal?: AbortSignal): Promise<unknown> => {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await withTimeout(
      fetch(url, { signal: controller.signal }),
      TIMEOUT_MS,
      () => controller.abort(),
    );
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e) throw e as AssistanceError;
    throw makeError('assist/network', e instanceof Error ? e.message : 'Network error');
  }

  if (!response.ok) {
    throw makeError('assist/server-error', `Server returned ${response.status}`, response.status);
  }

  try {
    return await response.json();
  } catch {
    throw makeError('assist/server-error', 'Response was not valid JSON');
  }
};

/* MARK: - Translation (MyMemory) */

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
  responseStatus?: number;
}

/** Reject echoes, 1-word→>2-word blowups, and results containing digits.
    Mirrors iOS validateTranslationResult. Returns null when invalid. */
const validateTranslation = (result: string, original: string): string | null => {
  const trimmed = result.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.toLowerCase() === original.trim().toLowerCase()) return null;

  const inputWords = original.trim().split(/\s+/).filter(Boolean).length;
  const resultWords = trimmed.split(/\s+/).filter(Boolean).length;
  if (inputWords === 1 && resultWords > 2) return null;

  if (/\d/.test(trimmed)) return null;
  return trimmed;
};

const myMemoryRequest = async (
  text: string,
  sourceCode: string,
  targetCode: string,
  signal?: AbortSignal,
): Promise<string> => {
  if (sourceCode === targetCode) throw makeError('assist/same-language', 'Same language');
  const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(
    `${sourceCode}|${targetCode}`,
  )}`;
  const data = (await getJSON(url, signal)) as MyMemoryResponse;
  if (data.responseStatus !== undefined && data.responseStatus !== 200) {
    throw makeError('assist/server-error', `MyMemory status ${data.responseStatus}`, data.responseStatus);
  }
  const translated = data.responseData?.translatedText?.trim() ?? '';
  if (translated.length === 0) throw makeError('assist/no-result', 'Empty translation');
  return translated;
};

export const translate = async (
  text: string,
  source: GrammarLanguage,
  target: GrammarLanguage,
  signal?: AbortSignal,
): Promise<string> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw makeError('assist/empty', 'Text is empty');
  if (source.id === target.id) throw makeError('assist/same-language', 'Same language');

  const raw = await myMemoryRequest(trimmed, apiCodeFor(source), apiCodeFor(target), signal);
  const validated = validateTranslation(raw, trimmed);
  if (validated === null) throw makeError('assist/no-result', 'No usable translation');
  return validated;
};

/* MARK: - Synonyms (Datamuse) */

interface DatamuseWord {
  word: string;
}

const datamuseRequest = async (
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<string[]> => {
  const query = new URLSearchParams(params).toString();
  const data = (await getJSON(`${DATAMUSE_ENDPOINT}?${query}`, signal)) as DatamuseWord[];
  return data.map((w) => w.word.trim()).filter((w) => w.length > 0);
};

const dedupeSort = (words: string[]): string[] => {
  const seen = new Set<string>();
  return words
    .map((w) => w.trim())
    .filter((w) => {
      const key = w.toLowerCase();
      if (w.length === 0 || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
};

export const findSynonyms = async (
  word: string,
  source: GrammarLanguage,
  target: GrammarLanguage,
  signal?: AbortSignal,
): Promise<EssayAssistanceItem[]> => {
  const trimmed = word.trim();
  if (trimmed.length === 0) throw makeError('assist/empty', 'Word is empty');

  let englishSynonyms: string[];
  if (source.id === 'english') {
    englishSynonyms = await datamuseRequest({ rel_syn: trimmed, max: '12' }, signal);
  } else {
    // Datamuse "means-like" first; if empty, bridge through English.
    const meansLike = await datamuseRequest({ ml: trimmed, max: '12' }, signal).catch(() => []);
    if (meansLike.length > 0) {
      englishSynonyms = meansLike;
    } else {
      const englishWord = await myMemoryRequest(trimmed, apiCodeFor(source), 'en', signal);
      const validated = validateTranslation(englishWord, trimmed) ?? englishWord;
      englishSynonyms = await datamuseRequest({ rel_syn: validated, max: '12' }, signal);
    }
  }

  let finalResults: string[];
  if (target.id === 'english') {
    finalResults = englishSynonyms;
  } else {
    const targetCode = apiCodeFor(target);
    const settled = await Promise.allSettled(
      englishSynonyms.slice(0, 8).map((syn) => myMemoryRequest(syn, 'en', targetCode, signal)),
    );
    finalResults = settled
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  const unique = dedupeSort(finalResults);
  if (unique.length === 0) throw makeError('assist/no-result', 'No synonyms found');

  return unique.map((result) => ({ id: crypto.randomUUID(), word: trimmed, result, detail: null }));
};
