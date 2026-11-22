/* Spaced-review core — FSRS-4.5 scheduling for grammar-note review items.

   The iOS port used fixed intervals (forgot 4h · hard 1d · good 3d · easy 7d),
   so "Easy" meant "next week" for ever and nothing a learner knew ever drifted
   further away. FSRS keeps two numbers per item instead:

   - stability S: days until the chance of remembering drops to 90%;
   - difficulty D: 1–10, how hard this item is for this learner.

   Each rating updates both from how much of the memory was left at review
   time (retrievability R), and the next interval is the time until R falls to
   the desired retention. Default FSRS-4.5 weights — no per-user training.

   Compatibility: stability/difficulty are extra fields. iOS ignores them and
   keeps writing dueAt with its fixed intervals; when the web next sees such an
   item, memoryStateOf() recovers S from the interval it was actually given. */
import type { GrammarReviewItem, GrammarReviewResult, GrammarReviewSourceType } from '@/lib/models';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** FSRS-4.5 default parameters (w0…w16). */
export const FSRS_W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461,
  2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const;

const DECAY = -0.5;
const FACTOR = 19 / 81;

export const DEFAULT_RETENTION = 0.9;
export const MAX_INTERVAL_DAYS = 365;
/** A forgotten item comes back in the same sitting, not tomorrow. */
export const RELEARN_DELAY_MS = 10 * MINUTE;

export const REVIEW_RESULTS: GrammarReviewResult[] = ['forgot', 'hard', 'good', 'easy'];

const GRADE: Record<GrammarReviewResult, 1 | 2 | 3 | 4> = {
  forgot: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

/* When a note enrols itself on save. A day, not the +1h that mistakes and
   failed quizzes use: those name something the learner just got wrong, while
   a note they just wrote is still fresh — asking an hour later tests nothing
   but short-term memory. */
export const FIRST_REVIEW_INTERVAL_MS = DAY;

export const isCorrectResult = (result: GrammarReviewResult) =>
  result === 'easy' || result === 'good';

/* Deterministic ids so re-adding the same source upserts instead of duping. */
export const reviewItemIdForNote = (topicId: string, noteId: string) =>
  `note_${topicId}_${noteId}`;
export const reviewItemIdForMistake = (topicId: string, noteId: string) =>
  `mistake_${topicId}_${noteId}`;
export const reviewItemIdForQuiz = (topicId: string, noteId: string, quizId: string) =>
  `quiz_${topicId}_${noteId}_${quizId}`;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const clampD = (d: number) => clamp(d, 1, 10);

export interface MemoryState {
  stability: number;
  difficulty: number;
}

const initialStability = (grade: number) => FSRS_W[grade - 1];
const initialDifficulty = (grade: number) => clampD(FSRS_W[4] - (grade - 3) * FSRS_W[5]);

/** Chance (0–1) the learner still remembers, `elapsedDays` after the last
    review, for a memory of stability `stability` days. */
export const forgettingCurve = (elapsedDays: number, stability: number): number =>
  Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / Math.max(stability, 0.01), DECAY);

/** Days until retrievability falls to `retention`. Equals S at 90%. */
export const intervalForStability = (stability: number, retention = DEFAULT_RETENTION): number =>
  (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);

/** The item's memory state, or null for an item never rated. Items rated
    before FSRS (or on iOS) carry no stability, so it is recovered from the
    interval they were last given; difficulty from their streaks. */
export const memoryStateOf = (item: GrammarReviewItem): MemoryState | null => {
  if (typeof item.stability === 'number' && item.stability > 0) {
    return {
      stability: item.stability,
      difficulty: clampD(typeof item.difficulty === 'number' ? item.difficulty : 5),
    };
  }
  if (item.reviewCount === 0 || item.lastReviewedAt === undefined) return null;
  const scheduled = (item.nextReviewAt ?? item.dueAt) - item.lastReviewedAt;
  const stability = scheduled > 0 ? Math.max(scheduled / DAY, 0.1) : FSRS_W[2];
  const difficulty = clampD(5 + item.incorrectStreak - Math.min(item.correctStreak, 3) * 0.5);
  return { stability, difficulty };
};

/** Current chance of remembering; 0 for an item never rated (it has to be
    learned, not recalled), 1 right after a review. */
export const retrievabilityOf = (item: GrammarReviewItem, now: number = Date.now()): number => {
  const state = memoryStateOf(item);
  if (!state || item.lastReviewedAt === undefined) return 0;
  return forgettingCurve((now - item.lastReviewedAt) / DAY, state.stability);
};

const nextDifficulty = (d: number, grade: number) =>
  clampD(FSRS_W[7] * initialDifficulty(3) + (1 - FSRS_W[7]) * (d - FSRS_W[6] * (grade - 3)));

const recallStability = (d: number, s: number, r: number, grade: number) => {
  const hardPenalty = grade === 2 ? FSRS_W[15] : 1;
  const easyBonus = grade === 4 ? FSRS_W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(FSRS_W[8]) *
        (11 - d) *
        Math.pow(s, -FSRS_W[9]) *
        (Math.exp(FSRS_W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
};

const forgetStability = (d: number, s: number, r: number) =>
  Math.min(
    s,
    FSRS_W[11] *
      Math.pow(d, -FSRS_W[12]) *
      (Math.pow(s + 1, FSRS_W[13]) - 1) *
      Math.exp(FSRS_W[14] * (1 - r)),
  );

/** Memory state after a rating at `now`. */
export const nextMemoryState = (
  item: GrammarReviewItem,
  result: GrammarReviewResult,
  now: number,
): MemoryState => {
  const grade = GRADE[result];
  const prev = memoryStateOf(item);
  if (!prev) {
    return { stability: initialStability(grade), difficulty: initialDifficulty(grade) };
  }
  const elapsed = item.lastReviewedAt !== undefined ? (now - item.lastReviewedAt) / DAY : 0;
  const r = forgettingCurve(elapsed, prev.stability);
  const difficulty = nextDifficulty(prev.difficulty, grade);
  const stability =
    grade === 1
      ? forgetStability(prev.difficulty, prev.stability, r)
      : recallStability(prev.difficulty, prev.stability, r, grade);
  return { stability: Math.max(stability, 0.1), difficulty };
};

/* ±5% jitter so a batch of notes enrolled together does not stay a batch for
   ever. Seeded from the item, so the button preview and the saved schedule
   agree, and tests are stable. */
const fuzzFactor = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return 0.95 + ((h >>> 0) % 1001) / 10000;
};

/** Next interval in ms for every rating, ordered so that a better rating is
    never sooner than a worse one. What the rating buttons show. */
export const previewIntervals = (
  item: GrammarReviewItem,
  now: number = Date.now(),
  retention: number = DEFAULT_RETENTION,
): Record<GrammarReviewResult, number> => {
  const days = (result: GrammarReviewResult) => {
    const s = nextMemoryState(item, result, now).stability;
    const raw = intervalForStability(s, retention);
    const fuzzed = raw >= 3 ? raw * fuzzFactor(`${item.id}:${item.reviewCount}:${result}`) : raw;
    return clamp(Math.round(fuzzed), 1, MAX_INTERVAL_DAYS);
  };
  const hard = days('hard');
  const good = Math.max(days('good'), hard + 1);
  const easy = Math.max(days('easy'), good + 1);
  return {
    forgot: RELEARN_DELAY_MS,
    hard: hard * DAY,
    good: Math.min(good, MAX_INTERVAL_DAYS) * DAY,
    easy: Math.min(easy, MAX_INTERVAL_DAYS) * DAY,
  };
};

/** Next item state after a rating. Counters keep the iOS semantics (iOS
    still reads them): `hard` bumps incorrectStreak but does NOT reset
    correctStreak; only `forgot` resets it and counts a mistake. */
export const applyReviewResult = (
  item: GrammarReviewItem,
  result: GrammarReviewResult,
  now: number = Date.now(),
  retention: number = DEFAULT_RETENTION,
): GrammarReviewItem => {
  const state = nextMemoryState(item, result, now);
  const interval = previewIntervals(item, now, retention)[result];
  const next: GrammarReviewItem = {
    ...item,
    lastReviewedAt: now,
    updatedAt: now,
    reviewCount: item.reviewCount + 1,
    nextReviewAt: now + interval,
    dueAt: now + interval,
    stability: state.stability,
    difficulty: state.difficulty,
  };
  switch (result) {
    case 'easy':
    case 'good':
      next.correctStreak = item.correctStreak + 1;
      next.incorrectStreak = 0;
      break;
    case 'hard':
      next.incorrectStreak = item.incorrectStreak + 1;
      break;
    case 'forgot':
      next.incorrectStreak = item.incorrectStreak + 1;
      next.correctStreak = 0;
      next.mistakeCount = item.mistakeCount + 1;
      break;
  }
  return next;
};

/** Fresh review item with zeroed counters (used by quiz low-score + mistake
    save hooks; upsert preserves history for existing ids). */
export const makeReviewItem = (params: {
  id: string;
  ownerUID: string;
  sourceType: GrammarReviewSourceType;
  topicId: string;
  noteId?: string;
  quizId?: string;
  title: string;
  previewText: string;
  priority?: GrammarReviewItem['priority'];
  dueAt?: number;
  now?: number;
}): GrammarReviewItem => {
  const now = params.now ?? Date.now();
  return {
    id: params.id,
    ownerUID: params.ownerUID,
    sourceType: params.sourceType,
    topicId: params.topicId,
    noteId: params.noteId,
    quizId: params.quizId,
    title: params.title,
    previewText: params.previewText,
    priority: params.priority ?? 'normal',
    dueAt: params.dueAt ?? now,
    reviewCount: 0,
    correctStreak: 0,
    incorrectStreak: 0,
    mistakeCount: 0,
    createdAt: now,
    updatedAt: now,
  };
};
