/* Speed Reading — web port of the SpeedReading submodule: configuration
   (targets / timer styles / lengths), text chunking, pacing metrics and
   ratings, the AI prompt (task `speed_reading`), and the pure session
   reducer (countdown → chunked reading → questions → results). All magic
   numbers are iOS-verbatim. */
import { generateText } from '@/lib/aiClient';
import { normalizeReadingText, readingWordCount } from '@/lib/readingTextAnalyzer';
import { isReadingAnswerCorrect } from '@/lib/readingScoring';
import type { ReadingQuestion } from '@/lib/readingQuestionService';

/* --- Configuration --- */

export type SpeedTarget = 'relaxed' | 'balanced' | 'fast' | 'challenge';
export type SpeedTimerMode = 'noTimer' | 'soft' | 'strict';
export type SpeedLength = 'two' | 'five' | 'ten';

export const SPEED_TARGETS: SpeedTarget[] = ['relaxed', 'balanced', 'fast', 'challenge'];
export const SPEED_TIMER_MODES: SpeedTimerMode[] = ['noTimer', 'soft', 'strict'];
export const SPEED_LENGTHS: SpeedLength[] = ['two', 'five', 'ten'];

export const TARGET_META: Record<
  SpeedTarget,
  { wpmTarget: number; wpmRange: [number, number]; wordsPerChunk: number }
> = {
  relaxed: { wpmTarget: 180, wpmRange: [120, 160], wordsPerChunk: 55 },
  balanced: { wpmTarget: 240, wpmRange: [180, 240], wordsPerChunk: 75 },
  fast: { wpmTarget: 320, wpmRange: [250, 320], wordsPerChunk: 95 },
  challenge: { wpmTarget: 400, wpmRange: [350, 450], wordsPerChunk: 120 },
};

export const TIMER_META: Record<
  SpeedTimerMode,
  { enforcesPace: boolean; locksChunkOnExpire: boolean; penalisesViolations: boolean; perChunkMultiplier: number }
> = {
  noTimer: { enforcesPace: false, locksChunkOnExpire: false, penalisesViolations: false, perChunkMultiplier: 0 },
  soft: { enforcesPace: true, locksChunkOnExpire: false, penalisesViolations: false, perChunkMultiplier: 1.4 },
  strict: { enforcesPace: true, locksChunkOnExpire: true, penalisesViolations: true, perChunkMultiplier: 1.0 },
};

export const LENGTH_META: Record<
  SpeedLength,
  { minutes: number; wordCountRange: [number, number]; questionTarget: number }
> = {
  two: { minutes: 2, wordCountRange: [250, 450], questionTarget: 3 },
  five: { minutes: 5, wordCountRange: [600, 1000], questionTarget: 5 },
  ten: { minutes: 10, wordCountRange: [1200, 1800], questionTarget: 8 },
};

export interface SpeedConfiguration {
  target: SpeedTarget;
  timer: SpeedTimerMode;
  length: SpeedLength;
}

export const targetWordCount = (config: SpeedConfiguration): number => {
  const [lo, hi] = LENGTH_META[config.length].wordCountRange;
  return Math.floor((lo + hi) / 2);
};

/** Seconds per chunk (0 when the timer doesn't enforce pace). */
export const chunkSeconds = (config: SpeedConfiguration): number => {
  const timer = TIMER_META[config.timer];
  if (!timer.enforcesPace) return 0;
  const { wordsPerChunk, wpmTarget } = TARGET_META[config.target];
  return Math.max(6, Math.round((wordsPerChunk / wpmTarget) * 60 * timer.perChunkMultiplier));
};

/* --- Chunking (SpeedReadingGenerationService.makeChunks) --- */

export const makeChunks = (text: string, wordsPerChunk: number): string[] => {
  const target = Math.max(20, wordsPerChunk);
  const paragraphs = text.split('\n\n').map((p) => p.trim()).filter((p) => p.length > 0);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentCount = 0;

  const flush = () => {
    if (current.length > 0) {
      chunks.push(current.join(' '));
      current = [];
      currentCount = 0;
    }
  };

  for (const paragraph of paragraphs) {
    const words = readingWordCount(paragraph);
    if (words >= target * 1.6) {
      /* Break an oversized paragraph by sentences. */
      flush();
      let sentenceChunk: string[] = [];
      let count = 0;
      for (const sentence of paragraph.split(/(?<=[.!?…])\s+/)) {
        const sWords = readingWordCount(sentence);
        if (count + sWords > target && sentenceChunk.length > 0) {
          chunks.push(sentenceChunk.join(' '));
          sentenceChunk = [];
          count = 0;
        }
        sentenceChunk.push(sentence);
        count += sWords;
      }
      if (sentenceChunk.length > 0) chunks.push(sentenceChunk.join(' '));
      continue;
    }
    current.push(paragraph);
    currentCount += words;
    if (currentCount >= target * 1.4) flush();
  }
  flush();
  return chunks.length > 0 ? chunks : [text.trim()].filter((c) => c.length > 0);
};

/* --- Prompt (SpeedReadingPromptBuilder, verbatim; task `speed_reading`) --- */

export const buildSpeedReadingPrompt = (config: SpeedConfiguration, languageTitle: string): string => {
  const [lo, hi] = LENGTH_META[config.length].wordCountRange;
  return [
    `Write a self-contained non-fiction reading passage in ${languageTitle} for a speed-reading practice session.`,
    `Target length: about ${targetWordCount(config)} words (between ${lo} and ${hi}).`,
    'Pick an engaging everyday topic — science, culture, history, technology, nature, or daily life.',
    'Use clear paragraphs separated by a blank line. Avoid lists, headings, dialogue, and quoted speech.',
    'Aim for clean, even sentence rhythm so the reader can sustain pace.',
    `Use vocabulary appropriate for an upper-intermediate learner of ${languageTitle}.`,
    '',
    'Formatting rules — follow exactly:',
    '- Return only the passage.',
    '- No markdown, no bold, no italics, no headings, no bullet points.',
    '- Do not write a title.',
    '- Do not include intros, outros, or notes to the reader.',
  ].join('\n');
};

export interface SpeedGenerated {
  text: string;
  chunks: string[];
}

export const generateSpeedReadingText = async (
  config: SpeedConfiguration,
  languageTitle: string,
  signal?: AbortSignal,
): Promise<SpeedGenerated> => {
  const raw = await generateText(
    { prompt: buildSpeedReadingPrompt(config, languageTitle), task: 'speed_reading' },
    signal,
  );
  const text = normalizeReadingText(raw);
  if (text.trim().length === 0) throw new Error('Empty generation result');
  return { text, chunks: makeChunks(text, TARGET_META[config.target].wordsPerChunk) };
};

/* --- Metrics (SpeedReadingMetricsService / SpeedTarget.rating) --- */

export const speedWPM = (wordsRead: number, seconds: number): number => {
  if (seconds <= 0 || wordsRead <= 0) return 0;
  return Math.round(wordsRead / Math.max(seconds / 60, 1 / 60));
};

export type SpeedRating = 'excellent' | 'balanced' | 'fast' | 'tooSlow';

export const ratingFor = (achievedWPM: number, target: SpeedTarget): SpeedRating => {
  const [lo, hi] = TARGET_META[target].wpmRange;
  if (achievedWPM >= hi + 40) return 'excellent';
  if (achievedWPM >= lo) return 'balanced';
  if (achievedWPM >= lo - 30) return 'fast';
  return 'tooSlow';
};

/** Strict-only: chunks that took longer than the allowed chunk time. */
export const timerViolations = (chunkTimes: number[], config: SpeedConfiguration): number => {
  if (!TIMER_META[config.timer].penalisesViolations) return 0;
  const limit = Math.max(1, chunkSeconds(config));
  return chunkTimes.filter((t) => t > limit).length;
};

export interface SpeedResult {
  wpm: number;
  targetWPM: number;
  rating: SpeedRating;
  comprehensionPercent: number;
  correctCount: number;
  totalQuestions: number;
  readingTimeSeconds: number;
  timerViolations: number;
  completedAt: number;
}

/* --- Session reducer --- */

export type SpeedPhase = 'countdown' | 'reading' | 'questions' | 'results';

export interface SpeedSessionState {
  phase: SpeedPhase;
  config: SpeedConfiguration;
  chunks: string[];
  questions: ReadingQuestion[];
  countdownValue: number;
  chunkIndex: number;
  chunkElapsedSeconds: number;
  elapsedSeconds: number;
  chunkTimes: number[];
  paused: boolean;
  fontScale: number;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  result: SpeedResult | null;
}

export type SpeedSessionAction =
  | { type: 'START'; config: SpeedConfiguration; chunks: string[]; questions: ReadingQuestion[] }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'TICK' }
  | { type: 'ADVANCE_CHUNK' }
  | { type: 'PREVIOUS_CHUNK' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'FONT_DELTA'; delta: number }
  | { type: 'SELECT_ANSWER'; answer: string }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH' };

export const initialSpeedSessionState = (config: SpeedConfiguration): SpeedSessionState => ({
  phase: 'countdown',
  config,
  chunks: [],
  questions: [],
  countdownValue: 3,
  chunkIndex: 0,
  chunkElapsedSeconds: 0,
  elapsedSeconds: 0,
  chunkTimes: [],
  paused: false,
  fontScale: 1,
  currentQuestionIndex: 0,
  answers: {},
  result: null,
});

/** Words in completed chunks + the current chunk (iOS wordsRead). */
export const wordsRead = (s: SpeedSessionState): number =>
  s.chunks
    .slice(0, Math.min(s.chunkIndex + 1, s.chunks.length))
    .reduce((sum, chunk) => sum + readingWordCount(chunk), 0);

const finishReading = (s: SpeedSessionState): SpeedSessionState => {
  const chunkTimes = [...s.chunkTimes, s.chunkElapsedSeconds];
  const next = { ...s, chunkTimes, chunkElapsedSeconds: 0 };
  if (s.questions.length > 0) return { ...next, phase: 'questions' };
  return buildResult(next);
};

const buildResult = (s: SpeedSessionState): SpeedSessionState => {
  const total = s.questions.length;
  const correct = s.questions.filter((q) => isReadingAnswerCorrect(q, s.answers[q.id])).length;
  const wpm = speedWPM(wordsRead(s), s.elapsedSeconds);
  const result: SpeedResult = {
    wpm,
    targetWPM: TARGET_META[s.config.target].wpmTarget,
    rating: ratingFor(wpm, s.config.target),
    comprehensionPercent: total > 0 ? (correct / total) * 100 : 0,
    correctCount: correct,
    totalQuestions: total,
    readingTimeSeconds: s.elapsedSeconds,
    timerViolations: timerViolations(s.chunkTimes, s.config),
    completedAt: Date.now(),
  };
  return { ...s, phase: 'results', result };
};

export const speedSessionReducer = (
  s: SpeedSessionState,
  action: SpeedSessionAction,
): SpeedSessionState => {
  switch (action.type) {
    case 'START':
      return {
        ...initialSpeedSessionState(action.config),
        chunks: action.chunks,
        questions: action.questions,
      };
    case 'COUNTDOWN_TICK': {
      if (s.phase !== 'countdown') return s;
      if (s.countdownValue > 1) return { ...s, countdownValue: s.countdownValue - 1 };
      return { ...s, phase: 'reading' };
    }
    case 'TICK': {
      if (s.phase !== 'reading' || s.paused) return s;
      const next = {
        ...s,
        elapsedSeconds: s.elapsedSeconds + 1,
        chunkElapsedSeconds: s.chunkElapsedSeconds + 1,
      };
      /* Strict mode auto-advances when the chunk time expires. */
      const limit = chunkSeconds(s.config);
      if (
        TIMER_META[s.config.timer].locksChunkOnExpire &&
        limit > 0 &&
        next.chunkElapsedSeconds >= limit
      ) {
        return speedSessionReducer(next, { type: 'ADVANCE_CHUNK' });
      }
      return next;
    }
    case 'ADVANCE_CHUNK': {
      if (s.phase !== 'reading') return s;
      if (s.chunkIndex >= s.chunks.length - 1) return finishReading(s);
      return {
        ...s,
        chunkIndex: s.chunkIndex + 1,
        chunkTimes: [...s.chunkTimes, s.chunkElapsedSeconds],
        chunkElapsedSeconds: 0,
      };
    }
    case 'PREVIOUS_CHUNK': {
      if (s.phase !== 'reading' || s.chunkIndex === 0) return s;
      return {
        ...s,
        chunkIndex: s.chunkIndex - 1,
        chunkTimes: s.chunkTimes.slice(0, -1),
        chunkElapsedSeconds: 0,
      };
    }
    case 'TOGGLE_PAUSE':
      return s.phase === 'reading' ? { ...s, paused: !s.paused } : s;
    case 'FONT_DELTA':
      return {
        ...s,
        fontScale: Math.min(1.4, Math.max(0.8, Math.round((s.fontScale + action.delta) * 10) / 10)),
      };
    case 'SELECT_ANSWER': {
      const q = s.questions[s.currentQuestionIndex];
      if (!q || s.phase !== 'questions') return s;
      return { ...s, answers: { ...s.answers, [q.id]: action.answer } };
    }
    case 'NEXT_QUESTION': {
      if (s.phase !== 'questions' || s.currentQuestionIndex >= s.questions.length - 1) return s;
      return { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 };
    }
    case 'FINISH':
      return s.phase === 'questions' || s.phase === 'reading' ? buildResult(s) : s;
    default:
      return s;
  }
};
