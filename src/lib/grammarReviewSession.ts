/* Review-session state — pure reducer, web port of
   GrammarReviewSessionViewModel.swift, reworked for recall.

   Per card: question → result (the answer, the part of the note it came from,
   and the rating). The iOS order showed the note's text first and asked about
   it second, which tests reading, not memory; the note now comes after the
   learner has answered.

   shortAnswer is never auto-graded (self-rated compare view); MC/TF/fillGap
   auto-grade with the trim+lowercase rule.

   A card rated "forgot" comes back at the end of this session (up to
   MAX_RELEARN times) carrying its updated schedule, so it is learned again
   while it still matters. Skip puts a card at the back once; skipping it a
   second time drops it from this session. */
import { isAnswerCorrect } from '@/lib/grammarQuizSession';
import type { GrammarReviewCard, GrammarReviewSourcePool } from '@/lib/grammarReviewQueue';
import type { GrammarReviewItem, GrammarReviewResult } from '@/lib/models';

export type ReviewPhase = 'question' | 'result';

export const MAX_RELEARN = 2;

export interface ReviewAnswer {
  answer: string;
  /** For a self-rated (shortAnswer) card: the typed answer matched the
      reference exactly, give or take case and spacing. A mismatch proves
      nothing there — wording differs — so only a match is acted on. */
  correct: boolean;
  autoGraded: boolean;
}

export interface ReviewSessionState {
  cards: GrammarReviewCard[];
  pool: GrammarReviewSourcePool | null;
  currentIndex: number;
  phase: ReviewPhase;
  finished: boolean;
  lastAnswer: ReviewAnswer | null;
  totalReviewed: number;
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  forgotCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  /** Forgot ratings on cards whose answer was NOT auto-graded — they count
      toward the incorrect display without double-counting quiz answers. */
  forgotCountWithoutQuiz: number;
  /** Times each card id has been sent back for relearning. */
  relearnCounts: Record<string, number>;
  /** Card ids already skipped once. */
  skippedIds: string[];
  /** Latest state of every item rated this session, by id. */
  ratedItems: Record<string, GrammarReviewItem>;
}

export type ReviewSessionAction =
  | { type: 'START'; cards: GrammarReviewCard[]; pool: GrammarReviewSourcePool | null }
  | { type: 'SUBMIT_ANSWER'; answer: string }
  /** `updated` is the item after applyReviewResult — the caller computes it
      (it needs the clock and the retention setting) and persists it. */
  | { type: 'RATE'; result: GrammarReviewResult; updated?: GrammarReviewItem }
  | { type: 'SKIP' }
  | { type: 'RESET' };

export const initialReviewSessionState: ReviewSessionState = {
  cards: [],
  pool: null,
  currentIndex: 0,
  phase: 'question',
  finished: false,
  lastAnswer: null,
  totalReviewed: 0,
  correctAnswerCount: 0,
  incorrectAnswerCount: 0,
  forgotCount: 0,
  hardCount: 0,
  goodCount: 0,
  easyCount: 0,
  forgotCountWithoutQuiz: 0,
  relearnCounts: {},
  skippedIds: [],
  ratedItems: {},
};

export const currentCard = (s: ReviewSessionState): GrammarReviewCard | null =>
  s.currentIndex < s.cards.length ? s.cards[s.currentIndex] : null;

export const progressFraction = (s: ReviewSessionState): number =>
  s.cards.length === 0 ? 0 : Math.min((s.currentIndex + 1) / s.cards.length, 1);

/** Cards still to come that were sent back for another try. */
export const relearnPendingCount = (s: ReviewSessionState): number =>
  s.cards.slice(s.currentIndex + 1).filter((c) => (s.relearnCounts[c.id] ?? 0) > 0).length;

/** True when the current card is a second (or third) try. */
export const isRelearnAttempt = (s: ReviewSessionState): boolean => {
  const card = currentCard(s);
  if (!card) return false;
  return s.cards.slice(0, s.currentIndex).some((c) => c.id === card.id);
};

/** Incorrect shown in the summary = wrong auto-graded answers + self-rated
    forgots (iOS `incorrectCount`). */
export const incorrectDisplayCount = (s: ReviewSessionState): number =>
  s.incorrectAnswerCount + s.forgotCountWithoutQuiz;

/** The rating an answer points to: auto-graded right → Good, wrong → Forgot;
    a typed answer that matches the reference → Good; otherwise none (the
    learner compares and decides). */
export const suggestedRating = (answer: ReviewAnswer | null): GrammarReviewResult | null => {
  if (!answer) return null;
  if (answer.autoGraded) return answer.correct ? 'good' : 'forgot';
  return answer.correct ? 'good' : null;
};

const advance = (s: ReviewSessionState): ReviewSessionState => {
  const nextIndex = s.currentIndex + 1;
  if (nextIndex >= s.cards.length) {
    return { ...s, currentIndex: nextIndex, finished: true, lastAnswer: null };
  }
  return { ...s, currentIndex: nextIndex, phase: 'question', lastAnswer: null };
};

export const reviewSessionReducer = (
  s: ReviewSessionState,
  action: ReviewSessionAction,
): ReviewSessionState => {
  switch (action.type) {
    case 'START':
      return {
        ...initialReviewSessionState,
        cards: action.cards,
        pool: action.pool,
      };
    case 'SUBMIT_ANSWER': {
      const card = currentCard(s);
      if (!card || s.phase !== 'question' || s.finished) return s;
      const autoGraded = card.question.type !== 'shortAnswer';
      const correct = isAnswerCorrect(card.question, action.answer);
      return {
        ...s,
        phase: 'result',
        lastAnswer: { answer: action.answer, correct, autoGraded },
        correctAnswerCount: s.correctAnswerCount + (autoGraded && correct ? 1 : 0),
        incorrectAnswerCount: s.incorrectAnswerCount + (autoGraded && !correct ? 1 : 0),
      };
    }
    case 'RATE': {
      const card = currentCard(s);
      if (!card || s.phase !== 'result' || s.finished) return s;
      const updatedItem = action.updated ?? card.reviewItem;
      const relearned = s.relearnCounts[card.id] ?? 0;
      const sendBack = action.result === 'forgot' && relearned < MAX_RELEARN;
      const counted: ReviewSessionState = {
        ...s,
        cards: sendBack ? [...s.cards, { ...card, reviewItem: updatedItem }] : s.cards,
        relearnCounts: sendBack ? { ...s.relearnCounts, [card.id]: relearned + 1 } : s.relearnCounts,
        ratedItems: { ...s.ratedItems, [card.id]: updatedItem },
        totalReviewed: s.totalReviewed + 1,
        forgotCount: s.forgotCount + (action.result === 'forgot' ? 1 : 0),
        hardCount: s.hardCount + (action.result === 'hard' ? 1 : 0),
        goodCount: s.goodCount + (action.result === 'good' ? 1 : 0),
        easyCount: s.easyCount + (action.result === 'easy' ? 1 : 0),
        forgotCountWithoutQuiz:
          s.forgotCountWithoutQuiz +
          (action.result === 'forgot' && !(s.lastAnswer?.autoGraded ?? false) ? 1 : 0),
      };
      return advance(counted);
    }
    case 'SKIP': {
      const card = currentCard(s);
      if (!card || s.finished) return s;
      if (s.skippedIds.includes(card.id)) return advance(s);
      /* Nothing to defer to when this is the last card. */
      if (s.currentIndex === s.cards.length - 1) return advance(s);
      return advance({
        ...s,
        cards: [...s.cards, card],
        skippedIds: [...s.skippedIds, card.id],
      });
    }
    case 'RESET':
      return initialReviewSessionState;
    default:
      return s;
  }
};
