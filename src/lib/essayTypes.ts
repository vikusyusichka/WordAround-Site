/* Domain types + static config for the Essays feature. Everything here is
   language-and-worker-agnostic: prompt builders and services import from
   these types, not vice versa. Web port of iOS
   Features/Writing/Essays/Models/*.swift (narrower — 4C1 ships only what the
   editor + topic card need; scoring/hints/helper types land in later slices). */

export type EssayDifficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'Native';

export const ESSAY_DIFFICULTIES: EssayDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'Native'];

export type EssayTopicMode = 'suggested' | 'custom';

export type EssayValidation = 'empty' | 'belowMinimum' | 'valid' | 'aboveMaximum';

export interface GrammarLanguage {
  /** Stable id used by the AI prompt (English name — matches iOS
      GrammarLanguage.title, since prompts are always English-instruction). */
  id: string;
  /** Display name in i18n-neutral form (English) — will be shown as-is. */
  title: string;
  /** 2-letter code shown in the collapsed picker chip. */
  shortTitle: string;
}

/* 4C1 ships 8 languages to keep the picker readable; the iOS list has 30 and
   will port when a proper searchable picker is warranted. */
export const ESSAY_LANGUAGES: GrammarLanguage[] = [
  { id: 'english', title: 'English', shortTitle: 'EN' },
  { id: 'spanish', title: 'Spanish', shortTitle: 'ES' },
  { id: 'french', title: 'French', shortTitle: 'FR' },
  { id: 'german', title: 'German', shortTitle: 'DE' },
  { id: 'italian', title: 'Italian', shortTitle: 'IT' },
  { id: 'ukrainian', title: 'Ukrainian', shortTitle: 'UK' },
  { id: 'polish', title: 'Polish', shortTitle: 'PL' },
  { id: 'russian', title: 'Russian', shortTitle: 'RU' },
];

export const DEFAULT_LANGUAGE: GrammarLanguage = ESSAY_LANGUAGES[0];
export const DEFAULT_DIFFICULTY: EssayDifficulty = 'B1';

export interface GeneratedEssayTask {
  id: string;
  title: string;
  task: string;
  detectedLevel: EssayDifficulty;
  estimatedTimeMinutes: number;
  wordLimitMin: number;
  wordLimitMax: number;
  /** Exactly 3 tips after sanitization. */
  quickTips: string[];
}

/* MARK: - Pure helpers */

/** Word count = split on any Unicode whitespace, filter empty. Matches the
    iOS definition used by EssayPracticeViewModel.updateWordCount. */
export const computeWordCount = (text: string): number => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter((w) => w.length > 0).length;
};

export const evaluateValidation = (
  count: number,
  min: number,
  max: number,
): EssayValidation => {
  if (count === 0) return 'empty';
  if (count < min) return 'belowMinimum';
  if (count > max) return 'aboveMaximum';
  return 'valid';
};

/* Fallback data used when the AI response is missing fields or gives values
   outside sane ranges. Values from iOS EssayGenerationService.sanitize. */
const FALLBACK_TIPS = ['Plan your ideas', 'Use clear examples', 'Check verb forms'];
const MIN_TASK_TIME = 5;
const MAX_TASK_TIME = 60;
const MIN_WORDS = 30;
const MAX_WORDS = 800;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Sanitize a raw AI response into a usable GeneratedEssayTask.
    Ports EssayGenerationService.sanitize(_:GeneratedEssayTask). */
export const sanitizeTask = (
  raw: Partial<GeneratedEssayTask> & { detectedLevel?: string },
): GeneratedEssayTask => {
  const title = raw.title?.trim() || 'Essay practice task';
  const task = raw.task?.trim() || 'Write a short essay about this topic.';

  const level: EssayDifficulty =
    (ESSAY_DIFFICULTIES as string[]).includes(raw.detectedLevel ?? '')
      ? (raw.detectedLevel as EssayDifficulty)
      : 'B1';

  const time = clamp(
    Math.round(raw.estimatedTimeMinutes ?? 12),
    MIN_TASK_TIME,
    MAX_TASK_TIME,
  );

  let min = clamp(Math.round(raw.wordLimitMin ?? 90), MIN_WORDS, MAX_WORDS);
  let max = clamp(Math.round(raw.wordLimitMax ?? 150), MIN_WORDS, MAX_WORDS);
  if (min > max) [min, max] = [max, min];

  const cleanedTips = (raw.quickTips ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const quickTips = [...cleanedTips, ...FALLBACK_TIPS].slice(0, 3);

  return {
    id: raw.id ?? crypto.randomUUID(),
    title,
    task,
    detectedLevel: level,
    estimatedTimeMinutes: time,
    wordLimitMin: min,
    wordLimitMax: max,
    quickTips,
  };
};

export const findLanguage = (id: string): GrammarLanguage =>
  ESSAY_LANGUAGES.find((l) => l.id === id) ?? DEFAULT_LANGUAGE;
