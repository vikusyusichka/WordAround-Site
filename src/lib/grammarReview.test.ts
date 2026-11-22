import { describe, expect, it } from 'vitest';

import {
  applyReviewResult,
  DAY,
  forgettingCurve,
  intervalForStability,
  makeReviewItem,
  MAX_INTERVAL_DAYS,
  memoryStateOf,
  previewIntervals,
  RELEARN_DELAY_MS,
  retrievabilityOf,
  reviewItemIdForMistake,
  reviewItemIdForNote,
  reviewItemIdForQuiz,
} from './grammarReview';
import type { GrammarReviewItem } from './models';

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

const days = (ms: number) => Math.round(ms / DAY);

describe('deterministic ids', () => {
  it('note/mistake/quiz formats', () => {
    expect(reviewItemIdForNote('t1', 'n1')).toBe('note_t1_n1');
    expect(reviewItemIdForMistake('t1', 'n1')).toBe('mistake_t1_n1');
    expect(reviewItemIdForQuiz('t1', 'n1', 'q1')).toBe('quiz_t1_n1_q1');
  });
});

describe('FSRS curve', () => {
  it('retrievability is 90% after exactly S days, and interval(S) = S at 90%', () => {
    expect(forgettingCurve(10, 10)).toBeCloseTo(0.9, 5);
    expect(intervalForStability(10, 0.9)).toBeCloseTo(10, 5);
  });

  it('a higher target retention gives a shorter interval', () => {
    expect(intervalForStability(10, 0.95)).toBeLessThan(intervalForStability(10, 0.85));
  });
});

describe('applyReviewResult (FSRS)', () => {
  const NOW = 10 * DAY;

  it('first rating sets stability/difficulty from the defaults', () => {
    const good = applyReviewResult(base, 'good', NOW);
    expect(good.stability).toBeCloseTo(3.7145, 3);
    expect(good.difficulty).toBeGreaterThanOrEqual(1);
    expect(good.difficulty).toBeLessThanOrEqual(10);
    expect(days(good.dueAt - NOW)).toBe(4);
    expect(good.nextReviewAt).toBe(good.dueAt);
    expect(good.lastReviewedAt).toBe(NOW);
    expect(good.reviewCount).toBe(1);
  });

  it('intervals grow when every review is answered Good on time', () => {
    let item: GrammarReviewItem = base;
    let now = NOW;
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      item = applyReviewResult(item, 'good', now);
      const gap = item.dueAt - now;
      gaps.push(days(gap));
      now += gap;
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    expect(gaps[4]).toBeGreaterThan(30);
  });

  it('forgot brings the card back in minutes and lowers stability', () => {
    const learned = applyReviewResult(applyReviewResult(base, 'good', NOW), 'good', NOW + 4 * DAY);
    const later = learned.dueAt;
    const forgot = applyReviewResult(learned, 'forgot', later);
    expect(forgot.dueAt - later).toBe(RELEARN_DELAY_MS);
    expect(forgot.stability!).toBeLessThan(learned.stability!);
    expect(forgot.difficulty!).toBeGreaterThan(learned.difficulty!);
  });

  it('keeps the iOS counter semantics', () => {
    const seeded = { ...base, correctStreak: 4, incorrectStreak: 1, mistakeCount: 1 };
    const hard = applyReviewResult(seeded, 'hard', NOW);
    expect(hard.correctStreak).toBe(4);
    expect(hard.incorrectStreak).toBe(2);
    expect(hard.mistakeCount).toBe(1);

    const forgot = applyReviewResult(seeded, 'forgot', NOW);
    expect(forgot.correctStreak).toBe(0);
    expect(forgot.incorrectStreak).toBe(2);
    expect(forgot.mistakeCount).toBe(2);

    const good = applyReviewResult(seeded, 'good', NOW);
    expect(good.correctStreak).toBe(5);
    expect(good.incorrectStreak).toBe(0);
  });

  it('never schedules beyond the maximum interval', () => {
    const huge = { ...base, reviewCount: 30, lastReviewedAt: 0, stability: 5000, difficulty: 1, dueAt: 0 };
    const easy = applyReviewResult(huge, 'easy', 5000 * DAY);
    expect(days(easy.dueAt - 5000 * DAY)).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });
});

describe('previewIntervals', () => {
  it('orders forgot < hard < good < easy and matches what applyReviewResult saves', () => {
    const NOW = 50 * DAY;
    const item = applyReviewResult(base, 'good', NOW - 4 * DAY);
    const preview = previewIntervals(item, NOW);
    expect(preview.forgot).toBeLessThan(preview.hard);
    expect(preview.hard).toBeLessThan(preview.good);
    expect(preview.good).toBeLessThan(preview.easy);
    for (const r of ['forgot', 'hard', 'good', 'easy'] as const) {
      expect(applyReviewResult(item, r, NOW).dueAt - NOW).toBe(preview[r]);
    }
  });
});

describe('migration from fixed-interval items', () => {
  it('recovers stability from the interval an item was last given', () => {
    const legacy: GrammarReviewItem = {
      ...base,
      reviewCount: 3,
      correctStreak: 3,
      lastReviewedAt: 0,
      nextReviewAt: 7 * DAY,
      dueAt: 7 * DAY,
    };
    expect(memoryStateOf(legacy)?.stability).toBeCloseTo(7, 5);
    expect(retrievabilityOf(legacy, 7 * DAY)).toBeCloseTo(0.9, 3);
    const next = applyReviewResult(legacy, 'good', 7 * DAY);
    expect(days(next.dueAt - 7 * DAY)).toBeGreaterThan(7);
  });

  it('a never-rated item has no memory state and zero retrievability', () => {
    expect(memoryStateOf(base)).toBeNull();
    expect(retrievabilityOf(base, 1_000_000)).toBe(0);
  });
});
