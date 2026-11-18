/* Exam prep — turning answers into the numbers an exam reports.

   Pure and synchronous: AI rubric ratings arrive here already as numbers,
   so everything in this file is deterministic and unit-testable. */

import type { ConversionRow, ExamVariant, SectionSpec } from './types';

export type SectionAnswers =
  | { kind: 'objective'; correct: number }
  /** taskId → criterionId → rating on 0..criterionMax. */
  | { kind: 'rubric'; ratings: Record<string, Record<string, number>> };

export interface GroupResult {
  id: string;
  score: number;
  max: number;
  passed: boolean;
}

export type ExamResult =
  | { kind: 'band'; overall: number }
  | { kind: 'groups'; groups: GroupResult[]; total: number; passed: boolean };

/* IELTS-style rounding: x.25 goes up to x.5 and x.75 up to the next whole
   band. The epsilon keeps 6.25 * 2 = 12.4999… from rounding the wrong way. */
export const roundHalfBand = (value: number): number => Math.round(value * 2 + 1e-9) / 2;

const roundPoints = (value: number): number => Math.round(value * 100) / 100;

export const objectiveItemCount = (section: SectionSpec): number =>
  section.tasks.reduce((sum, task) => sum + (task.kind === 'objective' ? task.items : 0), 0);

/** Score for `raw` correct answers: the row with the highest `minRaw` not above it. */
export const convertRaw = (table: ConversionRow[], raw: number): number => {
  let best: ConversionRow | undefined;
  for (const row of table) {
    if (row.minRaw <= raw && (best === undefined || row.minRaw > best.minRaw)) best = row;
  }
  return best?.score ?? 0;
};

/* Weighted mean over the section's rubric tasks of each task's share of the
   maximum rating (0..1). A criterion with no rating counts as 0 — a task the
   candidate skipped must not raise their score. */
const rubricShare = (
  section: SectionSpec,
  ratings: Record<string, Record<string, number>>,
  criterionMax: number,
): number => {
  let weighted = 0;
  let totalWeight = 0;
  for (const task of section.tasks) {
    if (task.kind === 'objective') continue;
    const taskRatings = ratings[task.id] ?? {};
    const sum = task.criteria.reduce((acc, criterion) => {
      const rating = taskRatings[criterion.id] ?? 0;
      return acc + Math.min(Math.max(rating, 0), criterionMax);
    }, 0);
    weighted += (sum / (task.criteria.length * criterionMax)) * task.weight;
    totalWeight += task.weight;
  }
  return totalWeight === 0 ? 0 : weighted / totalWeight;
};

export const scoreSection = (section: SectionSpec, answers: SectionAnswers): number => {
  const { scoring } = section;
  if (scoring.kind === 'objectiveTable' || scoring.kind === 'objectiveScaled') {
    if (answers.kind !== 'objective') {
      throw new Error(`Section ${section.id} expects objective answers`);
    }
    const total = objectiveItemCount(section);
    const correct = Math.min(Math.max(Math.floor(answers.correct), 0), total);
    return scoring.kind === 'objectiveTable'
      ? convertRaw(scoring.table, correct)
      : roundPoints((correct / total) * scoring.max);
  }
  if (answers.kind !== 'rubric') {
    throw new Error(`Section ${section.id} expects rubric ratings`);
  }
  const share = rubricShare(section, answers.ratings, scoring.criterionMax);
  return scoring.kind === 'rubricBand'
    ? roundHalfBand(share * scoring.criterionMax)
    : roundPoints(share * scoring.max);
};

/** Combine section scores (keyed by section id) into the exam result. */
export const scoreExam = (variant: ExamVariant, sectionScores: Record<string, number>): ExamResult => {
  const scoreOf = (sectionId: string): number => {
    const score = sectionScores[sectionId];
    if (score === undefined) throw new Error(`Missing score for section ${sectionId}`);
    return score;
  };
  const { overall } = variant;
  if (overall.kind === 'bandMean') {
    const scores = variant.sections.map((section) => scoreOf(section.id));
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { kind: 'band', overall: roundHalfBand(mean) };
  }
  const groups = overall.groups.map((group) => {
    const score = roundPoints(group.sectionIds.reduce((sum, id) => sum + scoreOf(id), 0));
    return { id: group.id, score, max: group.max, passed: score >= group.passMin };
  });
  const total = roundPoints(groups.reduce((sum, group) => sum + group.score, 0));
  return {
    kind: 'groups',
    groups,
    total,
    passed: total >= overall.passTotal && groups.every((group) => group.passed),
  };
};
