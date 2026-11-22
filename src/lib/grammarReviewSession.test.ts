import { describe, expect, it } from 'vitest';

import { applyReviewResult, makeReviewItem } from './grammarReview';
import type { GrammarReviewCard } from './grammarReviewQueue';
import {
  currentCard,
  incorrectDisplayCount,
  initialReviewSessionState,
  isRelearnAttempt,
  MAX_RELEARN,
  progressFraction,
  relearnPendingCount,
  reviewSessionReducer,
  suggestedRating,
  type ReviewSessionState,
} from './grammarReviewSession';
import { makeGrammarNote } from './grammarFactories';
import type { GrammarNote, GrammarQuizQuestionType } from './models';

const note: GrammarNote = makeGrammarNote({
  id: 'n1',
  ownerUID: 'u',
  topicId: 't',
  title: 'N',
  noteType: 'rule',
  previewText: 'p',
  now: 0,
});

const card = (id: string, questionType: GrammarQuizQuestionType): GrammarReviewCard => ({
  id,
  reviewItem: makeReviewItem({
    id, ownerUID: 'u', sourceType: 'note', topicId: 't', noteId: 'n1',
    title: 'N', previewText: 'p', now: 0,
  }),
  sourcePool: 'manual',
  note,
  sourceText: 'src',
  question: {
    id: `q-${id}`, type: questionType, questionText: 'Q?',
    options: questionType === 'trueFalse' ? ['True', 'False'] : [],
    correctAnswer: questionType === 'trueFalse' ? 'True' : 'Answer',
    order: 0,
  },
});

const run = (
  s: ReviewSessionState,
  ...actions: Parameters<typeof reviewSessionReducer>[1][]
) => actions.reduce(reviewSessionReducer, s);

const start = (...cards: GrammarReviewCard[]) =>
  run(initialReviewSessionState, { type: 'START', cards, pool: 'manual' });

describe('reviewSessionReducer', () => {
  it('START opens on the question — the note is not shown first', () => {
    const s = start(card('a', 'trueFalse'));
    expect(s.phase).toBe('question');
    expect(currentCard(s)?.id).toBe('a');
    expect(progressFraction(s)).toBe(1);
  });

  it('question → result with auto-grading (TF correct) and a suggested rating', () => {
    const s = run(start(card('a', 'trueFalse')), { type: 'SUBMIT_ANSWER', answer: ' true ' });
    expect(s.phase).toBe('result');
    expect(s.lastAnswer).toEqual({ answer: ' true ', correct: true, autoGraded: true });
    expect(s.correctAnswerCount).toBe(1);
    expect(suggestedRating(s.lastAnswer)).toBe('good');
  });

  it('shortAnswer is never auto-graded: a different wording suggests nothing', () => {
    const s = run(start(card('a', 'shortAnswer')), { type: 'SUBMIT_ANSWER', answer: 'Something else' });
    expect(s.lastAnswer?.autoGraded).toBe(false);
    expect(s.correctAnswerCount).toBe(0);
    expect(s.incorrectAnswerCount).toBe(0);
    expect(suggestedRating(s.lastAnswer)).toBeNull();
  });

  it('shortAnswer typed exactly as the reference suggests Good without counting as graded', () => {
    const s = run(start(card('a', 'shortAnswer')), { type: 'SUBMIT_ANSWER', answer: '  answer ' });
    expect(s.lastAnswer).toEqual({ answer: '  answer ', correct: true, autoGraded: false });
    expect(s.correctAnswerCount).toBe(0);
    expect(suggestedRating(s.lastAnswer)).toBe('good');
  });

  it('a wrong auto-graded answer suggests Forgot', () => {
    const s = run(start(card('a', 'trueFalse')), { type: 'SUBMIT_ANSWER', answer: 'False' });
    expect(suggestedRating(s.lastAnswer)).toBe('forgot');
  });

  it('RATE counts the rating, advances, and finishes at the end', () => {
    let s = run(
      start(card('a', 'trueFalse'), card('b', 'shortAnswer')),
      { type: 'SUBMIT_ANSWER', answer: 'False' },
      { type: 'RATE', result: 'hard' },
    );
    expect(s.currentIndex).toBe(1);
    expect(s.phase).toBe('question');
    expect(s.totalReviewed).toBe(1);
    expect(s.hardCount).toBe(1);
    expect(s.incorrectAnswerCount).toBe(1);

    s = run(s, { type: 'SUBMIT_ANSWER', answer: 'whatever' }, { type: 'RATE', result: 'good' });
    expect(s.finished).toBe(true);
    expect(s.goodCount).toBe(1);
  });

  it('forgot sends the card back with its updated schedule, at most MAX_RELEARN times', () => {
    const a = card('a', 'shortAnswer');
    const updated = applyReviewResult(a.reviewItem, 'forgot', 1_000);
    let s = run(
      start(a, card('b', 'shortAnswer')),
      { type: 'SUBMIT_ANSWER', answer: 'x' },
      { type: 'RATE', result: 'forgot', updated },
    );
    expect(s.cards.map((c) => c.id)).toEqual(['a', 'b', 'a']);
    expect(s.cards[2].reviewItem).toBe(updated);
    expect(s.ratedItems.a).toBe(updated);
    expect(relearnPendingCount(s)).toBe(1);
    expect(s.forgotCountWithoutQuiz).toBe(1);
    expect(incorrectDisplayCount(s)).toBe(1);

    s = run(s, { type: 'SUBMIT_ANSWER', answer: 'x' }, { type: 'RATE', result: 'good' }); // b
    expect(currentCard(s)?.id).toBe('a');
    expect(isRelearnAttempt(s)).toBe(true);

    for (let i = 1; i < MAX_RELEARN + 2; i++) {
      if (s.finished) break;
      s = run(s, { type: 'SUBMIT_ANSWER', answer: 'x' }, { type: 'RATE', result: 'forgot' });
    }
    expect(s.finished).toBe(true);
    expect(s.relearnCounts.a).toBe(MAX_RELEARN);
    expect(s.cards.filter((c) => c.id === 'a')).toHaveLength(MAX_RELEARN + 1);
  });

  it('forgot on an auto-graded card does NOT double count', () => {
    const s = run(
      start(card('a', 'trueFalse')),
      { type: 'SUBMIT_ANSWER', answer: 'False' },
      { type: 'RATE', result: 'forgot' },
    );
    expect(s.forgotCountWithoutQuiz).toBe(0);
    expect(incorrectDisplayCount(s)).toBe(1);
  });

  it('SKIP defers a card to the end once, then drops it; RATE outside result is ignored', () => {
    let s = run(start(card('a', 'trueFalse'), card('b', 'trueFalse')), {
      type: 'RATE',
      result: 'good',
    });
    expect(s.totalReviewed).toBe(0);
    s = run(s, { type: 'SKIP' });
    expect(s.cards.map((c) => c.id)).toEqual(['a', 'b', 'a']);
    expect(currentCard(s)?.id).toBe('b');
    s = run(s, { type: 'SKIP' }); // b deferred too
    expect(currentCard(s)?.id).toBe('a');
    s = run(s, { type: 'SKIP' }); // a skipped twice → dropped
    expect(currentCard(s)?.id).toBe('b');
    s = run(s, { type: 'SKIP' });
    expect(s.finished).toBe(true);
    expect(s.totalReviewed).toBe(0);
  });
});
