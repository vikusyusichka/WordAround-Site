/* Review-session state — pure reducer, web port of
   GrammarReviewSessionViewModel.swift. Per card: source → question → result
   (answer feedback + rating). shortAnswer is never auto-graded (self-rated
   compare view); MC/TF/fillGap auto-grade with the trim+lowercase rule. */
import { isAnswerCorrect } from '@/lib/grammarQuizSession';
import type { GrammarReviewCard, GrammarReviewSourcePool } from '@/lib/grammarReviewQueue';
import type { GrammarReviewResult } from '@/lib/models';

export type ReviewPhase = 'source' | 'question' | 'result';

export interface ReviewAnswer {
  answer: string;
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
}

export type ReviewSessionAction =
  | { type: 'START'; cards: GrammarReviewCard[]; pool: GrammarReviewSourcePool | null }
  | { type: 'CONTINUE' }
  | { type: 'SUBMIT_ANSWER'; answer: string }
  | { type: 'RATE'; result: GrammarReviewResult }
  | { type: 'SKIP' }
  | { type: 'RESET' };

export const initialReviewSessionState: ReviewSessionState = {
  cards: [],
  pool: null,
  currentIndex: 0,
  phase: 'source',
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
};

export const currentCard = (s: ReviewSessionState): GrammarReviewCard | null =>
  s.currentIndex < s.cards.length ? s.cards[s.currentIndex] : null;

export const progressFraction = (s: ReviewSessionState): number =>
  s.cards.length === 0 ? 0 : Math.min((s.currentIndex + 1) / s.cards.length, 1);

/** Incorrect shown in the summary = wrong auto-graded answers + self-rated
    forgots (iOS `incorrectCount`). */
export const incorrectDisplayCount = (s: ReviewSessionState): number =>
  s.incorrectAnswerCount + s.forgotCountWithoutQuiz;

const advance = (s: ReviewSessionState): ReviewSessionState => {
  const nextIndex = s.currentIndex + 1;
  if (nextIndex >= s.cards.length) {
    return { ...s, finished: true, lastAnswer: null };
  }
  return { ...s, currentIndex: nextIndex, phase: 'source', lastAnswer: null };
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
    case 'CONTINUE':
      return s.phase === 'source' && currentCard(s) ? { ...s, phase: 'question' } : s;
    case 'SUBMIT_ANSWER': {
      const card = currentCard(s);
      if (!card || s.phase !== 'question' || s.finished) return s;
      const autoGraded = card.question.type !== 'shortAnswer';
      const correct = autoGraded && isAnswerCorrect(card.question, action.answer);
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
      const counted: ReviewSessionState = {
        ...s,
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
      if (!currentCard(s) || s.finished) return s;
      return advance(s);
    }
    case 'RESET':
      return initialReviewSessionState;
    default:
      return s;
  }
};
