/* Exam prep — turning what a learner reports after an official practice test
   into the exam's own scores.

   Reading and listening are entered as the number of correct answers, which
   the exam's table (or scaling) converts. Writing and speaking have no answer
   key, so the learner enters the score itself — from a teacher, or their own
   estimate against the official descriptors. Sections left empty are simply
   not counted; the overall result needs every section. */

import { roundHalfBand, scoreExam, scoreSection, objectiveItemCount, type ExamResult } from './scoring';
import type { ExamVariant, SectionSpec } from './types';

export type EntryField =
  | { sectionId: string; input: 'correct'; max: number }
  | { sectionId: string; input: 'score'; max: number; step: number };

export const entryFieldFor = (section: SectionSpec): EntryField => {
  const { scoring } = section;
  if (scoring.kind === 'objectiveTable' || scoring.kind === 'objectiveScaled') {
    return { sectionId: section.id, input: 'correct', max: objectiveItemCount(section) };
  }
  return scoring.kind === 'rubricBand'
    ? { sectionId: section.id, input: 'score', max: scoring.criterionMax, step: 0.5 }
    : { sectionId: section.id, input: 'score', max: scoring.max, step: 0.25 };
};

/** Parses a typed value; empty or not a number → undefined. Accepts "6,5". */
export const parseEntry = (raw: string): number | undefined => {
  const value = Number(raw.trim().replace(',', '.'));
  return raw.trim() === '' || !Number.isFinite(value) ? undefined : value;
};

/** Is `value` acceptable for the field? (whole answers, within range, on the step) */
export const isValidEntry = (field: EntryField, value: number): boolean => {
  if (value < 0 || value > field.max) return false;
  if (field.input === 'correct') return Number.isInteger(value);
  return Math.abs(value / field.step - Math.round(value / field.step)) < 1e-9;
};

export interface EntryResult {
  sectionScores: Record<string, number>;
  /** Present only when every section has a valid value. */
  result?: ExamResult;
}

export const computeEntry = (variant: ExamVariant, values: Record<string, number | undefined>): EntryResult => {
  const sectionScores: Record<string, number> = {};
  for (const section of variant.sections) {
    const value = values[section.id];
    const field = entryFieldFor(section);
    if (value === undefined || !isValidEntry(field, value)) continue;
    sectionScores[section.id] =
      field.input === 'correct'
        ? scoreSection(section, { kind: 'objective', correct: value })
        : section.scoring.kind === 'rubricBand'
          ? roundHalfBand(value)
          : value;
  }
  const complete = variant.sections.every((s) => sectionScores[s.id] !== undefined);
  return complete ? { sectionScores, result: scoreExam(variant, sectionScores) } : { sectionScores };
};
