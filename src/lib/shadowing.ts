/* Shadowing phrases — web port of CloudflareShadowingPhraseClient +
   ShadowingRecentPhraseStore. The Gemini key lives only in the Worker. */
import { env } from '@/lib/env';
import { findLanguage } from '@/lib/essayTypes';

export const SHADOWING_PHRASES_PATH = '/api/shadowing/phrases';
const TIMEOUT_MS = 25_000;
const RECENT_CAP = 20;

export type ShadowingCategoryId =
  | 'daily'
  | 'travel'
  | 'cafe'
  | 'interview'
  | 'academic'
  | 'pronunciation';

export interface ShadowingCategoryDef {
  id: ShadowingCategoryId;
  /** Sent to the Worker verbatim (iOS `category.title`). */
  title: string;
  iconSystemName: string;
}

/* iOS ShadowingCategory.selectableCases (fromVideo is not user-selectable). */
export const SHADOWING_CATEGORIES: ShadowingCategoryDef[] = [
  { id: 'daily', title: 'Daily phrases', iconSystemName: 'sun.max.fill' },
  { id: 'travel', title: 'Travel', iconSystemName: 'airplane' },
  { id: 'cafe', title: 'Cafe', iconSystemName: 'fork.knife' },
  { id: 'interview', title: 'Interview', iconSystemName: 'briefcase.fill' },
  { id: 'academic', title: 'Academic', iconSystemName: 'book.pages.fill' },
  { id: 'pronunciation', title: 'Pronunciation', iconSystemName: 'waveform' },
];

export const shadowingCategory = (id: ShadowingCategoryId): ShadowingCategoryDef =>
  SHADOWING_CATEGORIES.find((c) => c.id === id) ?? SHADOWING_CATEGORIES[0];

export interface ShadowingPhrase {
  id: string;
  text: string;
  translation: string | null;
  languageCode: string;
  level: string;
  category: ShadowingCategoryId;
  tip: string | null;
}

export type ShadowingErrorCode = 'network' | 'server-error' | 'invalid-response' | 'empty';

export interface ShadowingError extends Error {
  code: ShadowingErrorCode;
  status?: number;
}

const makeError = (code: ShadowingErrorCode, message: string, status?: number): ShadowingError =>
  Object.assign(new Error(message), { code, status }) as ShadowingError;

interface PhraseDTO {
  id?: string;
  text?: string;
  translation?: string;
  languageCode?: string;
  level?: string;
  category?: string;
  tip?: string;
}

const clean = (v: string | undefined): string | null => {
  const t = v?.trim() ?? '';
  return t.length > 0 ? t : null;
};

export const fetchShadowingPhrases = async (params: {
  languageId: string;
  level: string;
  category: ShadowingCategoryId;
  count: number;
  avoidPhrases?: string[];
  signal?: AbortSignal;
}): Promise<ShadowingPhrase[]> => {
  const language = findLanguage(params.languageId);
  const code = language.shortTitle.toLowerCase();
  const category = shadowingCategory(params.category);

  const controller = new AbortController();
  if (params.signal) {
    params.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.aiWorkerUrl}${SHADOWING_PHRASES_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        language: language.title,
        languageCode: code,
        level: params.level,
        category: category.title,
        count: params.count,
        /* iOS sends only the last 30 to keep the prompt small. */
        avoidPhrases: (params.avoidPhrases ?? []).slice(-30),
        seed: `${Math.random().toString(36).slice(2, 10)}-${Date.now()}`,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw makeError('network', e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  let dto: { phrases?: PhraseDTO[]; error?: string };
  try {
    dto = (await response.json()) as typeof dto;
  } catch {
    throw makeError('invalid-response', 'The phrase service returned an unexpected response.');
  }

  if (!response.ok) {
    throw makeError(
      'server-error',
      dto.error?.trim() || `Phrase service error (${response.status}).`,
      response.status,
    );
  }

  const phrases: ShadowingPhrase[] = (dto.phrases ?? [])
    .map((p, i) => {
      const text = clean(p.text);
      if (!text) return null;
      return {
        id: clean(p.id) ?? `phrase-${i}-${Date.now()}`,
        text,
        translation: clean(p.translation),
        languageCode: clean(p.languageCode) ?? code,
        level: clean(p.level) ?? params.level,
        category: params.category,
        tip: clean(p.tip),
      } satisfies ShadowingPhrase;
    })
    .filter((p): p is ShadowingPhrase => p !== null);

  if (phrases.length === 0) throw makeError('empty', 'No phrases were returned. Please try again.');
  return phrases;
};

/* --- Recent-phrase store (localStorage; iOS UserDefaults bucket per lang/level/category) --- */

const bucketKey = (languageId: string, level: string, category: ShadowingCategoryId): string =>
  `wa.shadowing.recentPhrases.${languageId}.${level}.${category}`;

export const recentShadowingPhrases = (
  languageId: string,
  level: string,
  category: ShadowingCategoryId,
): string[] => {
  try {
    const raw = localStorage.getItem(bucketKey(languageId, level, category));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

/** Appends newest-last (iOS order), dropping case-insensitive duplicates and
    trimming the bucket to RECENT_CAP. */
export const rememberShadowingPhrases = (
  languageId: string,
  level: string,
  category: ShadowingCategoryId,
  texts: string[],
): void => {
  try {
    let stored = recentShadowingPhrases(languageId, level, category);
    for (const raw of texts) {
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      stored = stored.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      stored.push(trimmed);
    }
    if (stored.length > RECENT_CAP) stored = stored.slice(stored.length - RECENT_CAP);
    localStorage.setItem(bucketKey(languageId, level, category), JSON.stringify(stored));
  } catch {
    /* private mode / quota — recents are a nicety, never fail the session */
  }
};
