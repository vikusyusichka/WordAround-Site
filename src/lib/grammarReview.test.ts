import { describe, expect, it } from 'vitest';

import {
  applyReviewResult,
  makeReviewItem,
  REVIEW_INTERVAL_MS,
  reviewItemIdForMistake,
  reviewItemIdForNote,
  reviewItemIdForQuiz,
} from './grammarReview';

const base = makeReviewItem({
  id: 'note_t_n',
  ownerUID: 'u',
  sourceType: 'note',
  topicId: 't',
  noteId: 'n',
  title: 'T',
  previewText: 'P',
  now: 1_000,
});

describe('review intervals (fixed, iOS)', () => {
  it('4h / 1d / 3d / 7d', () => {
    expect(REVIEW_INTERVAL_MS.forgot).toBe(4 * 3600 * 1000);
    expect(REVIEW_INTERVAL_MS.hard).toBe(24 * 3600 * 1000);
    expect(REVIEW_INTERVAL_MS.good).toBe(3 * 24 * 3600 * 1000);
    expect(REVIEW_INTERVAL_MS.easy).toBe(7 * 24 * 3600 * 1000);
  });
});

describe('deterministic ids', () => {
  it('note/mistake/quiz formats', () => {
    expect(reviewItemIdForNote('t1', 'n1')).toBe('note_t1_n1');
    expect(reviewItemIdForMistake('t1', 'n1')).toBe('mistake_t1_n1');
    expect(reviewItemIdForQuiz('t1', 'n1', 'q1')).toBe('quiz_t1_n1_q1');
  });
});

describe('applyReviewResult', () => {
  const NOW = 10_000;

  it('good/easy: correctStreak +1, incorrectStreak reset, dueAt advanced', () => {
    const seeded = { ...base, correctStreak: 2, incorrectStreak: 3 };
    const good = applyReviewResult(seeded, 'good', NOW);
    expect(good.reviewCount).toBe(1);
    expect(good.correctStreak).toBe(3);
    expect(good.incorrectStreak).toBe(0);
    expect(good.dueAt).toBe(NOW + REVIEW_INTERVAL_MS.good);
    expect(good.nextReviewAt).toBe(good.dueAt);
    expect(good.lastReviewedAt).toBe(NOW);

    const easy = applyReviewResult(seeded, 'easy', NOW);
    expect(easy.correctStreak).toBe(3);
    expect(easy.dueAt).toBe(NOW + REVIEW_INTERVAL_MS.easy);
  });

  it('hard: incorrectStreak +1 but correctStreak KEPT (iOS asymmetry)', () => {
    const seeded = { ...base, correctStreak: 4, incorrectStreak: 1 };
    const hard = applyReviewResult(seeded, 'hard', NOW);
    expect(hard.correctStreak).toBe(4);
    expect(hard.incorrectStreak).toBe(2);
    expect(hard.mistakeCount).toBe(0);
  });

  it('forgot: resets correctStreak and counts a mistake', () => {
    const seeded = { ...base, correctStreak: 4, mistakeCount: 1 };
    const forgot = applyReviewResult(seeded, 'forgot', NOW);
    expect(forgot.correctStreak).toBe(0);
    expect(forgot.incorrectStreak).toBe(1);
    expect(forgot.mistakeCount).toBe(2);
    expect(forgot.dueAt).toBe(NOW + REVIEW_INTERVAL_MS.forgot);
  });
});
