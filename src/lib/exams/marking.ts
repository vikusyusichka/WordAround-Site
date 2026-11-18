/* Exam prep — marking objective answers and estimating what one practised
   task says about the whole section. Pure, like ./scoring.ts. */

import { normalizeAnswer } from './generation';
import type { ObjectiveQuestion } from './generation';
import { convertRaw, objectiveItemCount, roundHalfBand } from './scoring';
import type { SectionSpec } from './types';

/** questionId → the chosen option index, or the typed answer. */
export type ObjectiveAnswers = Record<string, number | string>;

export const isAnswerCorrect = (question: ObjectiveQuestion, answer: number | string | undefined): boolean => {
  if (answer === undefined) return false;
  if (question.kind === 'choice') return answer === question.answerIndex;
  const given = normalizeAnswer(String(answer));
  if (!given) return false;
  /* Over the word limit is wrong in the real exams, even when the words are right. */
  if (given.split(' ').length > question.maxWords) return false;
  return question.answers.some((accepted) => normalizeAnswer(accepted) === given);
};

export const markObjective = (
  questions: ObjectiveQuestion[],
  answers: ObjectiveAnswers,
): { correct: number; total: number; results: boolean[] } => {
  const results = questions.map((q) => isAnswerCorrect(q, answers[q.id]));
  return { correct: results.filter(Boolean).length, total: questions.length, results };
};

/** "If you did the whole section as well as this one task": the section score
    that the task's success rate would earn. */
export const estimateSectionFromObjective = (section: SectionSpec, correct: number, total: number): number => {
  const sectionItems = objectiveItemCount(section);
  const raw = total === 0 ? 0 : Math.round((correct / total) * sectionItems);
  if (section.scoring.kind === 'objectiveTable') return convertRaw(section.scoring.table, raw);
  if (section.scoring.kind === 'objectiveScaled') {
    return Math.round((raw / sectionItems) * section.scoring.max * 100) / 100;
  }
  throw new Error(`Section ${section.id} is not objectively marked`);
};

/** Same idea for a rubric task: the section score its criteria ratings imply. */
export const estimateSectionFromRubric = (section: SectionSpec, ratings: number[]): number => {
  const { scoring } = section;
  if (scoring.kind !== 'rubricBand' && scoring.kind !== 'rubricScaled') {
    throw new Error(`Section ${section.id} is not rubric-marked`);
  }
  const share =
    ratings.length === 0
      ? 0
      : ratings.reduce((sum, r) => sum + Math.min(Math.max(r, 0), scoring.criterionMax), 0) /
        (ratings.length * scoring.criterionMax);
  return scoring.kind === 'rubricBand'
    ? roundHalfBand(share * scoring.criterionMax)
    : Math.round(share * scoring.max * 100) / 100;
};

/** The maximum a section can score, for "x / max" labels. */
export const sectionMax = (section: SectionSpec): number => {
  const { scoring } = section;
  if (scoring.kind === 'objectiveScaled' || scoring.kind === 'rubricScaled') return scoring.max;
  if (scoring.kind === 'rubricBand') return scoring.criterionMax;
  return Math.max(...scoring.table.map((row) => row.score));
};
