/* Reading-session state — pure reducer, web port of the linear
   ReadingSessionViewModel machine: reading → questions → completed. Timing
   and network (translation, persistence) live in useReadingSession. */
import { isReadingAnswerCorrect, scoreReadingSession, type ReadingResult } from '@/lib/readingScoring';
import type { ReadingQuestion } from '@/lib/readingQuestionService';

export type ReadingPhase = 'reading' | 'questions' | 'completed';

export interface ReadingSessionState {
  phase: ReadingPhase;
  questions: ReadingQuestion[];
  currentQuestionIndex: number;
  /** question id → selected option. */
  answers: Record<string, string>;
  elapsedSeconds: number;
  selectedWord: string | null;
  result: ReadingResult | null;
}

export type ReadingSessionAction =
  | { type: 'START'; questions: ReadingQuestion[] }
  | { type: 'TICK' }
  | { type: 'WORD_TAP'; word: string }
  | { type: 'CLEAR_WORD' }
  | { type: 'START_QUESTIONS' }
  | { type: 'SELECT_ANSWER'; answer: string }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH'; wordCount: number };

export const initialReadingSessionState: ReadingSessionState = {
  phase: 'reading',
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  elapsedSeconds: 0,
  selectedWord: null,
  result: null,
};

export const currentReadingQuestion = (s: ReadingSessionState): ReadingQuestion | null =>
  s.phase === 'questions' && s.currentQuestionIndex < s.questions.length
    ? s.questions[s.currentQuestionIndex]
    : null;

export const isLastReadingQuestion = (s: ReadingSessionState): boolean =>
  s.currentQuestionIndex >= s.questions.length - 1;

export const selectedAnswerFor = (s: ReadingSessionState): string | undefined => {
  const q = currentReadingQuestion(s);
  return q ? s.answers[q.id] : undefined;
};

/** iOS progress estimate: reading phase caps at 0.45; questions phase is
    0.45 + ((index+1)/count) * 0.45. Persisted values are capped at 0.99 by
    the storage service. */
export const readingProgressEstimate = (s: ReadingSessionState): number => {
  if (s.phase === 'completed') return 1;
  if (s.phase === 'questions' && s.questions.length > 0) {
    return 0.45 + ((s.currentQuestionIndex + 1) / s.questions.length) * 0.45;
  }
  return Math.min(0.05 + s.elapsedSeconds / 600, 0.45);
};

export const readingSessionReducer = (
  s: ReadingSessionState,
  action: ReadingSessionAction,
): ReadingSessionState => {
  switch (action.type) {
    case 'START':
      return { ...initialReadingSessionState, questions: action.questions };
    case 'TICK':
      return s.phase === 'completed' ? s : { ...s, elapsedSeconds: s.elapsedSeconds + 1 };
    case 'WORD_TAP':
      /* Tapping the selected word again clears it (iOS toggle). */
      return { ...s, selectedWord: s.selectedWord === action.word ? null : action.word };
    case 'CLEAR_WORD':
      return { ...s, selectedWord: null };
    case 'START_QUESTIONS':
      if (s.phase !== 'reading') return s;
      return {
        ...s,
        phase: s.questions.length > 0 ? 'questions' : s.phase,
        selectedWord: null,
      };
    case 'SELECT_ANSWER': {
      const q = currentReadingQuestion(s);
      if (!q) return s;
      return { ...s, answers: { ...s.answers, [q.id]: action.answer } };
    }
    case 'NEXT_QUESTION': {
      if (s.phase !== 'questions' || isLastReadingQuestion(s)) return s;
      return { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 };
    }
    case 'FINISH': {
      if (s.phase === 'completed') return s;
      const result = scoreReadingSession({
        questions: s.questions,
        answers: s.answers,
        wordCount: action.wordCount,
        readingTimeSeconds: s.elapsedSeconds,
      });
      return { ...s, phase: 'completed', result, selectedWord: null };
    }
    default:
      return s;
  }
};

export { isReadingAnswerCorrect };
