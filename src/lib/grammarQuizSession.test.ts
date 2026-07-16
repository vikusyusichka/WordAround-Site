import { describe, expect, it } from 'vitest';

import {
  answeredQuestions,
  correctCount,
  currentQuestion,
  gradeForScore,
  initialQuizSessionState,
  isAnswerCorrect,
  isLastQuestion,
  quizSessionReducer,
  scorePercentage,
  type QuizSessionState,
} from './grammarQuizSession';
import type { GrammarNoteQuiz, GrammarQuizQuestion } from './models';

const question = (id: string, correctAnswer: string): GrammarQuizQuestion => ({
  id,
  type: 'shortAnswer',
  questionText: `Q ${id}`,
  options: [],
  correctAnswer,
  order: 0,
});

const quiz: GrammarNoteQuiz = {
  id: 'quiz-1',
  ownerUID: 'u',
  topicId: 't',
  noteId: 'n',
  title: 'Quiz',
  sourceNoteTitle: 'Note',
  questions: [question('q1', 'Ser'), question('q2', 'estar'), question('q3', 'ir')],
  createdAt: 0,
  updatedAt: 0,
};

const run = (...actions: Parameters<typeof quizSessionReducer>[1][]): QuizSessionState =>
  actions.reduce(quizSessionReducer, initialQuizSessionState);

describe('quizSessionReducer', () => {
  it('START seeds the session', () => {
    const s = run({ type: 'START', quiz });
    expect(s.quiz).toBe(quiz);
    expect(s.currentIndex).toBe(0);
    expect(s.finished).toBe(false);
    expect(currentQuestion(s)?.id).toBe('q1');
  });

  it('SUBMIT_ANSWER stores by question id; NEXT advances but not past the end', () => {
    let s = run({ type: 'START', quiz }, { type: 'SUBMIT_ANSWER', answer: 'ser' });
    expect(s.answers.q1).toBe('ser');
    s = quizSessionReducer(s, { type: 'NEXT' });
    expect(s.currentIndex).toBe(1);
    s = quizSessionReducer(s, { type: 'NEXT' });
    expect(isLastQuestion(s)).toBe(true);
    s = quizSessionReducer(s, { type: 'NEXT' });
    expect(s.currentIndex).toBe(2);
  });

  it('FINISH marks finished; RESET starts over keeping the quiz', () => {
    let s = run(
      { type: 'START', quiz },
      { type: 'SUBMIT_ANSWER', answer: 'ser' },
      { type: 'FINISH' },
    );
    expect(s.finished).toBe(true);
    s = quizSessionReducer(s, { type: 'RESET' });
    expect(s.finished).toBe(false);
    expect(s.answers).toEqual({});
    expect(s.quiz).toBe(quiz);
  });

  it('ignores SUBMIT_ANSWER with no active quiz', () => {
    const s = quizSessionReducer(initialQuizSessionState, { type: 'SUBMIT_ANSWER', answer: 'x' });
    expect(s.answers).toEqual({});
  });
});

describe('answer matching (iOS rule: trim + lowercase, all types)', () => {
  it('is case-insensitive and whitespace-trimmed', () => {
    expect(isAnswerCorrect(question('q', 'Ser'), '  sEr \n')).toBe(true);
    expect(isAnswerCorrect(question('q', 'Ser'), 'estar')).toBe(false);
    expect(isAnswerCorrect(question('q', 'Ser'), undefined)).toBe(false);
  });
});

describe('scoring', () => {
  it('correctCount / scorePercentage / answeredQuestions', () => {
    const s = run(
      { type: 'START', quiz },
      { type: 'SUBMIT_ANSWER', answer: 'SER' },
      { type: 'NEXT' },
      { type: 'SUBMIT_ANSWER', answer: 'wrong' },
      { type: 'NEXT' },
      { type: 'FINISH' },
    );
    expect(correctCount(s)).toBe(1);
    expect(scorePercentage(s)).toBe(33);
    const answered = answeredQuestions(s);
    expect(answered).toHaveLength(3);
    expect(answered[0].isCorrect).toBe(true);
    expect(answered[1].isCorrect).toBe(false);
    expect(answered[2].userAnswer).toBeUndefined();
  });

  it('empty quiz scores 0', () => {
    expect(scorePercentage(initialQuizSessionState)).toBe(0);
  });
});

describe('gradeForScore bands (90/70/50)', () => {
  it('maps to iOS grade bands', () => {
    expect(gradeForScore(100)).toBe('excellent');
    expect(gradeForScore(90)).toBe('excellent');
    expect(gradeForScore(89)).toBe('good');
    expect(gradeForScore(70)).toBe('good');
    expect(gradeForScore(69)).toBe('keepPracticing');
    expect(gradeForScore(50)).toBe('keepPracticing');
    expect(gradeForScore(49)).toBe('reviewNote');
  });
});
