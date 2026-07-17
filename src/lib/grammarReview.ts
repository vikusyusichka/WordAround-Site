/* Spaced-review core — web port of GrammarReviewItem.applying(result:) and
   GrammarReviewResult.nextInterval. Fixed intervals (no SM-2 ease factor):
   forgot 4h · hard 1d · good 3d · easy 7d. */
import type { GrammarReviewItem, GrammarReviewResult, GrammarReviewSourceType } from '@/lib/models';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const REVIEW_INTERVAL_MS: Record<GrammarReviewResult, number> = {
  forgot: 4 * HOUR,
  hard: 1 * DAY,
  good: 3 * DAY,
  easy: 7 * DAY,
};

export const REVIEW_RESULTS: GrammarReviewResult[] = ['forgot', 'hard', 'good', 'easy'];

export const isCorrectResult = (result: GrammarReviewResult) =>
  result === 'easy' || result === 'good';

/* Deterministic ids so re-adding the same source upserts instead of duping. */
export const reviewItemIdForNote = (topicId: string, noteId: string) =>
  `note_${topicId}_${noteId}`;
export const reviewItemIdForMistake = (topicId: string, noteId: string) =>
  `mistake_${topicId}_${noteId}`;
export const reviewItemIdForQuiz = (topicId: string, noteId: string, quizId: string) =>
  `quiz_${topicId}_${noteId}_${quizId}`;

/** Next item state after a rating (iOS `applying(result:at:)`). Note the
    asymmetry: `hard` bumps incorrectStreak but does NOT reset correctStreak;
    only `forgot` resets it (and counts a mistake). */
export const applyReviewResult = (
  item: GrammarReviewItem,
  result: GrammarReviewResult,
  now: number = Date.now(),
): GrammarReviewItem => {
  const next: GrammarReviewItem = {
    ...item,
    lastReviewedAt: now,
    updatedAt: now,
    reviewCount: item.reviewCount + 1,
    nextReviewAt: now + REVIEW_INTERVAL_MS[result],
    dueAt: now + REVIEW_INTERVAL_MS[result],
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
