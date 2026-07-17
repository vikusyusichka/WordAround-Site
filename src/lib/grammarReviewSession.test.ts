import { describe, expect, it } from 'vitest';

import { makeReviewItem } from './grammarReview';
import type { GrammarReviewCard } from './grammarReviewQueue';
import {
  currentCard,
  incorrectDisplayCount,
  initialReviewSessionState,
  progressFraction,
  reviewSessionReducer,
  type ReviewSessionState,
} from './grammarReviewSession';
import type { GrammarNote, GrammarQuizQuestionType } from './models';

const note: GrammarNote = {
  id: 'n1', ownerUID: 'u', topicId: 't', title: 'N', noteType: 'rule',
  previewText: 'p', contentBlocks: [], createdAt: 0, updatedAt: 0,
};

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

describe('reviewSessionReducer', () => {
  it('START seeds cards at phase source', () => {
    const s = run(initialReviewSessionState, {
      type: 'START', cards: [card('a', 'trueFalse')], pool: 'manual',
    });
    expect(s.phase).toBe('source');
    expect(currentCard(s)?.id).toBe('a');
    expect(progressFraction(s)).toBe(1);
  });

  it('source → question → result with auto-grading (TF correct)', () => {
    const s = run(
      initialReviewSessionState,
      { type: 'START', cards: [card('a', 'trueFalse')], pool: 'manual' },
      { type: 'CONTINUE' },
      { type: 'SUBMIT_ANSWER', answer: ' true ' },
    );
    expect(s.phase).toBe('result');
    expect(s.lastAnswer).toEqual({ answer: ' true ', correct: true, autoGraded: true });
    expect(s.correctAnswerCount).toBe(1);
    expect(s.incorrectAnswerCount).toBe(0);
  });

  it('shortAnswer is never auto-graded', () => {
    const s = run(
      initialReviewSessionState,
      { type: 'START', cards: [card('a', 'shortAnswer')], pool: 'manual' },
      { type: 'CONTINUE' },
      { type: 'SUBMIT_ANSWER', answer: 'Answer' },
    );
    expect(s.lastAnswer?.autoGraded).toBe(false);
    expect(s.correctAnswerCount).toBe(0);
    expect(s.incorrectAnswerCount).toBe(0);
  });

  it('RATE counts the rating, advances, and finishes at the end', () => {
    let s = run(
      initialReviewSessionState,
      { type: 'START', cards: [card('a', 'trueFalse'), card('b', 'shortAnswer')], pool: 'manual' },
      { type: 'CONTINUE' },
      { type: 'SUBMIT_ANSWER', answer: 'False' },
      { type: 'RATE', result: 'hard' },
    );
    expect(s.currentIndex).toBe(1);
    expect(s.phase).toBe('source');
    expect(s.totalReviewed).toBe(1);
    expect(s.hardCount).toBe(1);
    expect(s.incorrectAnswerCount).toBe(1); // auto-graded wrong

    s = run(
      s,
      { type: 'CONTINUE' },
      { type: 'SUBMIT_ANSWER', answer: 'whatever' },
      { type: 'RATE', result: 'forgot' },
    );
    expect(s.finished).toBe(true);
    expect(s.forgotCount).toBe(1);
    // forgot on a NON-auto-graded card feeds the incorrect display count…
    expect(s.forgotCountWithoutQuiz).toBe(1);
    expect(incorrectDisplayCount(s)).toBe(2);
  });

  it('forgot on an auto-graded card does NOT double count', () => {
    const s = run(
      initialReviewSessionState,
      { type: 'START', cards: [card('a', 'trueFalse')], pool: 'manual' },
      { type: 'CONTINUE' },
      { type: 'SUBMIT_ANSWER', answer: 'False' }, // wrong → incorrectAnswerCount 1
      { type: 'RATE', result: 'forgot' },
    );
    expect(s.forgotCountWithoutQuiz).toBe(0);
    expect(incorrectDisplayCount(s)).toBe(1);
  });

  it('SKIP advances without counting; RATE outside result phase is ignored', () => {
    let s = run(
      initialReviewSessionState,
      { type: 'START', cards: [card('a', 'trueFalse'), card('b', 'trueFalse')], pool: 'manual' },
      { type: 'RATE', result: 'good' }, // ignored — phase is source
    );
    expect(s.totalReviewed).toBe(0);
    s = run(s, { type: 'SKIP' });
    expect(s.currentIndex).toBe(1);
    expect(s.totalReviewed).toBe(0);
    s = run(s, { type: 'SKIP' });
    expect(s.finished).toBe(true);
  });
});
