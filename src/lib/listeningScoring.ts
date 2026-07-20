/* Listening scoring — web port of ListeningScoringService. */
import type {
  ListeningMistake,
  ListeningQuestion,
  ListeningResult,
} from '@/lib/listeningTypes';

export const makeListeningResult = (params: {
  questions: ListeningQuestion[];
  selectedAnswers: Record<string, number>;
  listeningTimeSeconds: number;
  speedLabel: string;
}): ListeningResult => {
  const { questions, selectedAnswers } = params;
  const total = questions.length;
  const correct = questions.filter((q) => selectedAnswers[q.id] === q.correctIndex).length;

  const mistakes: ListeningMistake[] = questions
    .filter((q) => selectedAnswers[q.id] !== q.correctIndex)
    .map((q) => ({
      prompt: q.prompt,
      selectedAnswer:
        selectedAnswers[q.id] !== undefined ? (q.options[selectedAnswers[q.id]] ?? '') : '',
      correctAnswer: q.options[q.correctIndex] ?? '',
      explanation: q.explanation,
    }));

  return {
    id: crypto.randomUUID(),
    comprehensionPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
    correctAnswers: correct,
    totalQuestions: total,
    listeningTimeSeconds: params.listeningTimeSeconds,
    speedLabel: params.speedLabel,
    mistakes,
    hasQuestions: total > 0,
  };
};
