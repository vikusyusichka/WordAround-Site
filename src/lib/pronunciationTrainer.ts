/* Pronunciation Trainer content — web port of
   CloudflarePronunciationContentClient + PronunciationItem models. */
import { env } from '@/lib/env';
import { findLanguage } from '@/lib/essayTypes';

export const PRONUNCIATION_CONTENT_PATH = '/api/pronunciation/content';
const TIMEOUT_MS = 25_000;

export type PronunciationItemType = 'word' | 'minimalPair' | 'phrase' | 'sound';

export const ITEM_TYPE_LABEL: Record<PronunciationItemType, string> = {
  word: 'Word',
  minimalPair: 'Minimal pair',
  phrase: 'Phrase',
  sound: 'Sound',
};

export const ITEM_TYPE_ICON: Record<PronunciationItemType, string> = {
  word: 'textformat',
  minimalPair: 'arrow.left.arrow.right',
  phrase: 'text.quote',
  sound: 'waveform',
};

export type PronunciationDifficulty = 'easy' | 'balanced' | 'hard';
export const PRONUNCIATION_DIFFICULTIES: PronunciationDifficulty[] = ['easy', 'balanced', 'hard'];

export type PronunciationFocus =
  | 'vowels'
  | 'consonants'
  | 'minimalPairs'
  | 'difficultWords'
  | 'mixed';

export interface PronunciationFocusDef {
  id: PronunciationFocus;
  title: string;
  /** Sent to the Worker verbatim (iOS `focus.promptValue`). */
  promptValue: string;
  iconSystemName: string;
}

export const PRONUNCIATION_FOCUSES: PronunciationFocusDef[] = [
  { id: 'vowels', title: 'Vowels', promptValue: 'vowel sounds', iconSystemName: 'textformat' },
  { id: 'consonants', title: 'Consonants', promptValue: 'consonant sounds', iconSystemName: 'textformat' },
  { id: 'minimalPairs', title: 'Minimal pairs', promptValue: 'minimal pairs', iconSystemName: 'arrow.left.arrow.right' },
  { id: 'difficultWords', title: 'Difficult words', promptValue: 'difficult words', iconSystemName: 'character.book.closed.fill' },
  { id: 'mixed', title: 'Mixed', promptValue: 'mixed', iconSystemName: 'shuffle' },
];

export const pronunciationFocus = (id: PronunciationFocus): PronunciationFocusDef =>
  PRONUNCIATION_FOCUSES.find((f) => f.id === id) ?? PRONUNCIATION_FOCUSES[4];

export interface PronunciationItem {
  id: string;
  type: PronunciationItemType;
  text: string;
  translation: string | null;
  languageCode: string;
  level: string;
  difficulty: PronunciationDifficulty;
  focusSound: string | null;
  tip: string | null;
  example: string | null;
}

export type PronunciationErrorCode = 'network' | 'server-error' | 'invalid-response' | 'empty';

export interface PronunciationError extends Error {
  code: PronunciationErrorCode;
  status?: number;
}

const makeError = (
  code: PronunciationErrorCode,
  message: string,
  status?: number,
): PronunciationError => Object.assign(new Error(message), { code, status }) as PronunciationError;

interface ItemDTO {
  id?: string;
  type?: string;
  text?: string;
  translation?: string;
  languageCode?: string;
  level?: string;
  difficulty?: string;
  focusSound?: string;
  tip?: string;
  example?: string;
}

const clean = (v: string | undefined): string | null => {
  const t = v?.trim() ?? '';
  return t.length > 0 ? t : null;
};

const VALID_TYPES: PronunciationItemType[] = ['word', 'minimalPair', 'phrase', 'sound'];

/** Unknown/missing item types fall back to `word` rather than dropping the item. */
export const parseItemType = (raw: string | undefined): PronunciationItemType => {
  const v = raw?.trim() ?? '';
  return (VALID_TYPES as string[]).includes(v) ? (v as PronunciationItemType) : 'word';
};

export const fetchPronunciationItems = async (params: {
  languageId: string;
  level: string;
  focus: PronunciationFocus;
  difficulty: PronunciationDifficulty;
  count: number;
  signal?: AbortSignal;
}): Promise<PronunciationItem[]> => {
  const language = findLanguage(params.languageId);
  const code = language.shortTitle.toLowerCase();
  const focus = pronunciationFocus(params.focus);

  const controller = new AbortController();
  if (params.signal) {
    params.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.aiWorkerUrl}${PRONUNCIATION_CONTENT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        language: language.title,
        languageCode: code,
        level: params.level,
        focus: focus.promptValue,
        difficulty: params.difficulty,
        count: params.count,
        seed: `${Math.random().toString(36).slice(2, 10)}-${Date.now()}`,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw makeError('network', e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  let dto: { items?: ItemDTO[]; error?: string };
  try {
    dto = (await response.json()) as typeof dto;
  } catch {
    throw makeError('invalid-response', 'The content service returned an unexpected response.');
  }

  if (!response.ok) {
    throw makeError(
      'server-error',
      dto.error?.trim() || `Content service error (${response.status}).`,
      response.status,
    );
  }

  const items: PronunciationItem[] = (dto.items ?? [])
    .map((it, i) => {
      const text = clean(it.text);
      if (!text) return null;
      return {
        id: clean(it.id) ?? `item-${i}-${Date.now()}`,
        type: parseItemType(it.type),
        text,
        translation: clean(it.translation),
        languageCode: clean(it.languageCode) ?? code,
        level: clean(it.level) ?? params.level,
        difficulty: params.difficulty,
        focusSound: clean(it.focusSound),
        tip: clean(it.tip),
        example: clean(it.example),
      } satisfies PronunciationItem;
    })
    .filter((it): it is PronunciationItem => it !== null);

  if (items.length === 0) throw makeError('empty', 'No items were returned. Please try again.');
  return items;
};
