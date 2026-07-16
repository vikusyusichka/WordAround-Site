/* Quiz-play state — pure reducer + selectors, web port of the session half of
   GrammarNoteQuizViewModel.swift. Answer checking is the iOS rule: trim +
   lowercase exact match for ALL question types. */
import type { GrammarNoteQuiz, GrammarQuizQuestion } from '@/lib/models';

export interface QuizSessionState {
  quiz: GrammarNoteQuiz | null;
  currentIndex: number;
  /** question id → submitted answer */
  answers: Record<string, string>;
  finished: boolean;
}

export type QuizSessionAction =
  | { type: 'START'; quiz: GrammarNoteQuiz }
  | { type: 'SUBMIT_ANSWER'; answer: string }
  | { type: 'NEXT' }
  | { type: 'FINISH' }
  | { type: 'RESET' };

export const initialQuizSessionState: QuizSessionState = {
  quiz: null,
  currentIndex: 0,
  answers: {},
  finished: false,
};

export const quizSessionReducer = (
  state: QuizSessionState,
  action: QuizSessionAction,
): QuizSessionState => {
  switch (action.type) {
    case 'START':
      return { quiz: action.quiz, currentIndex: 0, answers: {}, finished: false };
    case 'SUBMIT_ANSWER': {
      const question = currentQuestion(state);
      if (!question || state.finished) return state;
      return {
        ...state,
        answers: { ...state.answers, [question.id]: action.answer },
      };
    }
    case 'NEXT': {
      if (!state.quiz || isLastQuestion(state)) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };
    }
    case 'FINISH':
      return state.quiz ? { ...state, finished: true } : state;
    case 'RESET':
      return state.quiz
        ? { quiz: state.quiz, currentIndex: 0, answers: {}, finished: false }
        : state;
    default:
      return state;
  }
};

/* --- Selectors --- */

const normalize = (s: string) => s.trim().toLowerCase();

/** iOS `isCorrect`: trimmed, case-insensitive exact match — all types. */
export const isAnswerCorrect = (question: GrammarQuizQuestion, answer: string | undefined) =>
  answer !== undefined && normalize(answer) === normalize(question.correctAnswer);

export const currentQuestion = (state: QuizSessionState): GrammarQuizQuestion | null => {
  const questions = state.quiz?.questions ?? [];
  return state.currentIndex < questions.length ? questions[state.currentIndex] : null;
};

export const isLastQuestion = (state: QuizSessionState): boolean => {
  const total = state.quiz?.questions.length ?? 0;
  return state.currentIndex >= total - 1;
};

export const correctCount = (state: QuizSessionState): number =>
  (state.quiz?.questions ?? []).filter((q) => isAnswerCorrect(q, state.answers[q.id])).length;

export const scorePercentage = (state: QuizSessionState): number => {
  const total = state.quiz?.questions.length ?? 0;
  if (total === 0) return 0;
  return Math.floor((correctCount(state) / total) * 100);
};

export interface AnsweredQuestion {
  question: GrammarQuizQuestion;
  userAnswer: string | undefined;
  isCorrect: boolean;
}

export const answeredQuestions = (state: QuizSessionState): AnsweredQuestion[] =>
  (state.quiz?.questions ?? []).map((q) => ({
    question: q,
    userAnswer: state.answers[q.id],
    isCorrect: isAnswerCorrect(q, state.answers[q.id]),
  }));

/* iOS result grade bands: 90 / 70 / 50. */
export type QuizGrade = 'excellent' | 'good' | 'keepPracticing' | 'reviewNote';

export const gradeForScore = (score: number): QuizGrade => {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'keepPracticing';
  return 'reviewNote';
};

/** Below this score iOS queues the note for spaced review (used in 4D3). */
export const LOW_SCORE_REVIEW_THRESHOLD = 70;
