/* Exam prep — every exam the app can run, plus a structural check that a
   spec is internally consistent. The check runs in tests over the whole
   registry, so a typo in a new spec fails CI instead of a mock exam. */

import type { TaskRef } from './generation';
import { objectiveItemCount } from './scoring';
import { DELE } from './specs/dele';
import { IELTS } from './specs/ielts';
import type { ExamSpec, ExamVariant } from './types';

export const EXAMS: ExamSpec[] = [IELTS, DELE];

export const findExam = (examId: string): ExamSpec | undefined =>
  EXAMS.find((exam) => exam.id === examId);

export const findVariant = (exam: ExamSpec, variantId: string): ExamVariant | undefined =>
  exam.variants.find((variant) => variant.id === variantId);

/** Everything a task screen needs, from the ids in its URL — or undefined. */
export const findTaskRef = (
  examId: string,
  variantId: string | undefined,
  sectionId: string,
  taskId: string,
): TaskRef | undefined => {
  const exam = findExam(examId);
  if (!exam) return undefined;
  const variant = (variantId && findVariant(exam, variantId)) || exam.variants[0];
  const section = variant.sections.find((s) => s.id === sectionId);
  const task = section?.tasks.find((t) => t.id === taskId);
  return section && task ? { exam, variant, section, task } : undefined;
};

export const examsForLanguage = (languageId: string): ExamSpec[] =>
  EXAMS.filter((exam) => exam.languageId === languageId);

const duplicates = (ids: string[]): string[] =>
  ids.filter((id, index) => ids.indexOf(id) !== index);

/** Every problem found in `exam`; an empty list means the spec is usable. */
export const validateExamSpec = (exam: ExamSpec): string[] => {
  const problems: string[] = [];
  const where = (...parts: string[]) => [exam.id, ...parts].join('/');

  if (exam.variants.length === 0) problems.push(`${where()}: no variants`);
  for (const id of duplicates(exam.variants.map((v) => v.id))) {
    problems.push(`${where()}: duplicate variant ${id}`);
  }

  for (const variant of exam.variants) {
    const sectionIds = variant.sections.map((s) => s.id);
    for (const id of duplicates(sectionIds)) problems.push(`${where(variant.id)}: duplicate section ${id}`);

    for (const section of variant.sections) {
      const at = where(variant.id, section.id);
      if (section.minutes <= 0) problems.push(`${at}: minutes must be positive`);
      if (section.tasks.length === 0) problems.push(`${at}: no tasks`);
      for (const id of duplicates(section.tasks.map((t) => t.id))) problems.push(`${at}: duplicate task ${id}`);

      const objective = section.tasks.filter((t) => t.kind === 'objective');
      const isObjectiveScoring =
        section.scoring.kind === 'objectiveTable' || section.scoring.kind === 'objectiveScaled';
      if (isObjectiveScoring !== (objective.length === section.tasks.length)) {
        problems.push(`${at}: scoring ${section.scoring.kind} does not match its task kinds`);
      }

      for (const task of section.tasks) {
        const taskAt = `${at}/${task.id}`;
        if (task.kind === 'objective') {
          if (task.items <= 0) problems.push(`${taskAt}: items must be positive`);
          if (task.questionTypes.length === 0) problems.push(`${taskAt}: no question types`);
          if (task.plays !== undefined && section.skill !== 'listening') {
            problems.push(`${taskAt}: only listening tasks play audio`);
          }
        } else {
          if (task.weight <= 0) problems.push(`${taskAt}: weight must be positive`);
          if (task.criteria.length === 0) problems.push(`${taskAt}: no rubric criteria`);
          for (const id of duplicates(task.criteria.map((c) => c.id))) {
            problems.push(`${taskAt}: duplicate criterion ${id}`);
          }
          if (task.kind === 'writing' && task.words.max !== undefined && task.words.max < task.words.min) {
            problems.push(`${taskAt}: word max below min`);
          }
        }
      }

      if (section.scoring.kind === 'objectiveTable') {
        const total = objectiveItemCount(section);
        const raws = section.scoring.table.map((row) => row.minRaw);
        if (!raws.includes(0)) problems.push(`${at}: table has no row for 0 correct`);
        if (Math.max(...raws) > total) problems.push(`${at}: table expects more than ${total} items`);
        const sorted = [...section.scoring.table].sort((a, b) => a.minRaw - b.minRaw);
        if (sorted.some((row, i) => i > 0 && row.score < sorted[i - 1].score)) {
          problems.push(`${at}: table score falls as raw score rises`);
        }
      }
    }

    const { overall } = variant;
    if (overall.kind === 'groups') {
      const grouped = overall.groups.flatMap((g) => g.sectionIds);
      for (const id of grouped) {
        if (!sectionIds.includes(id)) problems.push(`${where(variant.id)}: group uses unknown section ${id}`);
      }
      for (const id of sectionIds) {
        if (!grouped.includes(id)) problems.push(`${where(variant.id)}: section ${id} is in no group`);
      }
      for (const id of duplicates(grouped)) problems.push(`${where(variant.id)}: section ${id} in two groups`);
      for (const group of overall.groups) {
        const sectionMax = group.sectionIds.reduce((sum, id) => {
          const scoring = variant.sections.find((s) => s.id === id)?.scoring;
          return sum + (scoring && 'max' in scoring ? scoring.max : 0);
        }, 0);
        if (sectionMax !== group.max) {
          problems.push(`${where(variant.id)}: group ${group.id} max ${group.max} ≠ its sections' ${sectionMax}`);
        }
      }
    }
  }
  return problems;
};
