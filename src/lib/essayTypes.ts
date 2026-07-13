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

/* MARK: - AI hints (4C2) */

export type EssayHintCategory = 'content' | 'grammar' | 'vocabulary' | 'structure';

export const ESSAY_HINT_CATEGORIES: EssayHintCategory[] = [
  'content', 'grammar', 'vocabulary', 'structure',
];

export interface EssayGeneratedHint {
  id: string;
  text: string;
  category: EssayHintCategory;
}

/** Max hints per session, keyed by CEFR difficulty. Ports the extension in
    iOS EssayDifficulty. Native = 0 = feature effectively disabled. */
export const HINTS_LIMIT: Record<EssayDifficulty, number> = {
  A1: 15, A2: 12, B1: 7, B2: 5, C1: 3, Native: 0,
};

/** Cap hint text at 12 words (iOS "at most 12 words" rule). */
const clampHintText = (text: string): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 12).join(' ');
};

export const sanitizeHint = (
  raw: Partial<EssayGeneratedHint> & { category?: string },
): EssayGeneratedHint => {
  const text = clampHintText(raw.text ?? '') || 'Add one clear supporting example.';
  const category: EssayHintCategory =
    (ESSAY_HINT_CATEGORIES as string[]).includes(raw.category ?? '')
      ? (raw.category as EssayHintCategory)
      : 'content';
  return { id: raw.id ?? crypto.randomUUID(), text, category };
};

/* MARK: - Grammar issues (4C2) */

export type GrammarIssueCategory = 'grammar' | 'vocabulary' | 'style';

export interface GrammarIssue {
  id: string;
  message: string;
  incorrectText: string;
  suggestedCorrection: string | null;
  offset: number;
  length: number;
  category: GrammarIssueCategory;
}

/** LanguageTool language codes for the 8-language subset shipped in 4C1.
    Verbatim from iOS GrammarLanguage.languageToolCode for these ids. */
export const LANGUAGE_TOOL_CODE: Record<string, string> = {
  english: 'en-US',
  spanish: 'es',
  french: 'fr',
  german: 'de-DE',
  italian: 'it',
  ukrainian: 'uk-UA',
  polish: 'pl-PL',
  russian: 'ru-RU',
};

/* MARK: - Essay score (4C2) */

export type EssayCEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type EssayQualityLabel = 'Needs work' | 'Good' | 'Very good' | 'Excellent';

export interface EssayScore {
  total: number;         // 0..100
  grammar: number;
  vocabulary: number;
  length: number;
  complexity: number;
  relevance: number;
  independence: number;
  cefrLevel: EssayCEFRLevel;
  qualityLabel: EssayQualityLabel;
}

/* MARK: - Helper toolbar (4C3) — translate + synonyms */

export interface EssayAssistanceItem {
  id: string;
  /** The queried word/phrase. */
  word: string;
  /** The translation or synonym returned. */
  result: string;
  detail: string | null;
}

/** Per-CEFR translation budgets. Verbatim from iOS EssayDifficulty
    extension. Native = 0 = feature disabled. */
export const TRANSLATION_LIMIT: Record<EssayDifficulty, number> = {
  A1: 20, A2: 15, B1: 10, B2: 6, C1: 3, Native: 0,
};

/** Per-CEFR synonym budgets. Verbatim from iOS. */
export const SYNONYM_LIMIT: Record<EssayDifficulty, number> = {
  A1: 10, A2: 8, B1: 6, B2: 5, C1: 3, Native: 0,
};

/** MyMemory / Datamuse API language code = ISO-639-1 lowercase, which
    matches our GrammarLanguage.shortTitle lowercased (EN→en, UK→uk, …).
    Mirrors iOS GrammarLanguage.apiCode. */
export const apiCodeFor = (language: GrammarLanguage): string =>
  language.shortTitle.toLowerCase();
