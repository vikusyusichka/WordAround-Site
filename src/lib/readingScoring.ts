/* Session scoring — web port of ReadingScoringService.swift. Answer check is
   trim+lowercase equality; comprehension = correct/total*100; WPM uses the
   1-second floor on minutes. No difficulty weighting (iOS parity). */
import type { ReadingQuestion } from '@/lib/readingQuestionService';

export interface ReadingMistake {
  prompt: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

export interface ReadingResult {
  totalQuestions: number;
  correctCount: number;
  /** 0–100. */
  comprehensionPercent: number;
  wpm: number;
  readingTimeSeconds: number;
  mistakes: ReadingMistake[];
}

const normalize = (s: string) => s.trim().toLowerCase();

export const isReadingAnswerCorrect = (question: ReadingQuestion, answer: string | undefined) =>
  answer !== undefined && normalize(answer) === normalize(question.correctAnswer);

export const scoreReadingSession = (params: {
  questions: ReadingQuestion[];
  answers: Record<string, string>;
  wordCount: number;
  readingTimeSeconds: number;
}): ReadingResult => {
  const total = params.questions.length;
  const correct = params.questions.filter((q) =>
    isReadingAnswerCorrect(q, params.answers[q.id]),
  ).length;
  const comprehensionPercent = total > 0 ? (correct / total) * 100 : 0;

  const minutes = Math.max(params.readingTimeSeconds / 60, 1 / 60);
  const wpm = Math.round(params.wordCount / minutes);

  const mistakes: ReadingMistake[] = params.questions
    .filter((q) => !isReadingAnswerCorrect(q, params.answers[q.id]))
    .map((q) => ({
      prompt: q.prompt,
      selectedAnswer: params.answers[q.id] ?? '',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

  return {
    totalQuestions: total,
    correctCount: correct,
    comprehensionPercent,
    wpm,
    readingTimeSeconds: params.readingTimeSeconds,
    mistakes,
  };
};

export const formatReadingTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
