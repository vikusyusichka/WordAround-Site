/* Exam prep — the state of a full mock exam, as a pure reducer.

   Sections run in order, each against its own deadline (a timestamp, so a
   reload resumes with the time that is really left). Tasks of a section are
   generated together before its clock starts; the next section is generated
   in the background while the current one runs. When the last section ends,
   writing and speaking go to the AI examiner and the result is computed with
   the exam's own rules. The whole state is plain JSON so it can be saved to
   IndexedDB after every change. */

import type { GeneratedTask } from './generation';
import { estimateSectionFromRubric, markObjective, type ObjectiveAnswers } from './marking';
import type { RubricFeedback } from './rubricScoring';
import { scoreExam, scoreSection, type ExamResult } from './scoring';
import type { ExamVariant, SectionSpec } from './types';

export interface SpokenRecord {
  transcript: string;
  seconds: number;
  typed: boolean;
}

export type MockPhase = 'intro' | 'generating' | 'prep' | 'running' | 'marking' | 'done';

export interface MockState {
  id: string;
  examId: string;
  variantId: string;
  startedAt: number;
  phase: MockPhase;
  sectionIndex: number;
  /** sectionId → taskId → generated task. */
  generated: Record<string, Record<string, GeneratedTask>>;
  deadline: number | null;
  prepDeadline: number | null;
  /** Keyed by `${sectionId}/${taskId}`. */
  objectiveAnswers: Record<string, ObjectiveAnswers>;
  essays: Record<string, string>;
  spoken: Record<string, SpokenRecord>;
  /** Listening: how often each recording has been played (keyed like answers). */
  plays: Record<string, number>;
  feedback: Record<string, RubricFeedback>;
  sectionScores: Record<string, number>;
  result: ExamResult | null;
  finishedAt: number | null;
}

export const taskKey = (sectionId: string, taskId: string): string => `${sectionId}/${taskId}`;

export const createMock = (id: string, examId: string, variantId: string): MockState => ({
  id,
  examId,
  variantId,
  startedAt: 0,
  phase: 'intro',
  sectionIndex: 0,
  generated: {},
  deadline: null,
  prepDeadline: null,
  objectiveAnswers: {},
  essays: {},
  spoken: {},
  plays: {},
  feedback: {},
  sectionScores: {},
  result: null,
  finishedAt: null,
});

export type MockAction =
  | { type: 'start'; now: number }
  | { type: 'generated'; sectionId: string; tasks: Record<string, GeneratedTask>; now: number }
  | { type: 'endPrep'; now: number }
  | { type: 'answerObjective'; key: string; questionId: string; answer: number | string }
  | { type: 'writeEssay'; key: string; text: string }
  | { type: 'recordSpoken'; key: string; answer: SpokenRecord }
  | { type: 'played'; key: string }
  | { type: 'finishSection'; now: number }
  | { type: 'scored'; key: string; feedback: RubricFeedback }
  | { type: 'complete'; variant: ExamVariant; now: number };

const sectionAt = (variant: ExamVariant, index: number): SectionSpec | undefined => variant.sections[index];

/** Moves into section `index`: running if its tasks are ready, else generating. */
const enterSection = (state: MockState, variant: ExamVariant, index: number, now: number): MockState => {
  const section = sectionAt(variant, index);
  if (!section) return { ...state, phase: 'marking', sectionIndex: index, deadline: null, prepDeadline: null };
  if (!state.generated[section.id]) {
    return { ...state, phase: 'generating', sectionIndex: index, deadline: null, prepDeadline: null };
  }
  if (section.prepMinutes) {
    return {
      ...state,
      phase: 'prep',
      sectionIndex: index,
      deadline: null,
      prepDeadline: now + section.prepMinutes * 60_000,
    };
  }
  return { ...state, phase: 'running', sectionIndex: index, prepDeadline: null, deadline: now + section.minutes * 60_000 };
};

export const mockReducer =
  (variant: ExamVariant) =>
  (state: MockState, action: MockAction): MockState => {
    switch (action.type) {
      case 'start':
        if (state.phase !== 'intro') return state;
        return enterSection({ ...state, startedAt: action.now }, variant, 0, action.now);
      case 'generated': {
        const next = { ...state, generated: { ...state.generated, [action.sectionId]: action.tasks } };
        /* A background prefetch only stores; generating the current section starts it. */
        const current = sectionAt(variant, state.sectionIndex);
        if (state.phase === 'generating' && current?.id === action.sectionId) {
          return enterSection(next, variant, state.sectionIndex, action.now);
        }
        return next;
      }
      case 'endPrep': {
        if (state.phase !== 'prep') return state;
        const section = sectionAt(variant, state.sectionIndex);
        if (!section) return state;
        return { ...state, phase: 'running', prepDeadline: null, deadline: action.now + section.minutes * 60_000 };
      }
      case 'answerObjective': {
        if (state.phase !== 'running') return state;
        const prev = state.objectiveAnswers[action.key] ?? {};
        return {
          ...state,
          objectiveAnswers: { ...state.objectiveAnswers, [action.key]: { ...prev, [action.questionId]: action.answer } },
        };
      }
      case 'writeEssay':
        if (state.phase !== 'running') return state;
        return { ...state, essays: { ...state.essays, [action.key]: action.text } };
      case 'recordSpoken':
        if (state.phase !== 'running' && state.phase !== 'prep') return state;
        return { ...state, spoken: { ...state.spoken, [action.key]: action.answer } };
      case 'played':
        if (state.phase !== 'running') return state;
        return { ...state, plays: { ...state.plays, [action.key]: (state.plays?.[action.key] ?? 0) + 1 } };
      case 'finishSection':
        if (state.phase !== 'running' && state.phase !== 'prep') return state;
        return enterSection(state, variant, state.sectionIndex + 1, action.now);
      case 'scored':
        return { ...state, feedback: { ...state.feedback, [action.key]: action.feedback } };
      case 'complete': {
        if (state.phase !== 'marking') return state;
        const sectionScores = computeSectionScores(action.variant, state);
        return {
          ...state,
          phase: 'done',
          sectionScores,
          result: scoreExam(action.variant, sectionScores),
          finishedAt: action.now,
        };
      }
      default:
        return state;
    }
  };

/** Rubric tasks still waiting for the AI examiner. Unanswered ones need no
    marking — they score zero. */
export const pendingRubricKeys = (variant: ExamVariant, state: MockState): string[] =>
  variant.sections.flatMap((section) =>
    section.tasks
      .filter((task) => task.kind !== 'objective')
      .map((task) => taskKey(section.id, task.id))
      .filter((key) => !state.feedback[key] && hasResponse(state, key)),
  );

export const hasResponse = (state: MockState, key: string): boolean =>
  (state.essays[key] ?? '').trim().length > 0 || (state.spoken[key]?.transcript ?? '').trim().length > 0;

export const computeSectionScores = (variant: ExamVariant, state: MockState): Record<string, number> => {
  const scores: Record<string, number> = {};
  for (const section of variant.sections) {
    const objective = section.tasks.every((task) => task.kind === 'objective');
    if (objective) {
      const correct = section.tasks.reduce((sum, task) => {
        const generated = state.generated[section.id]?.[task.id];
        if (generated?.kind !== 'objective') return sum;
        return sum + markObjective(generated.questions, state.objectiveAnswers[taskKey(section.id, task.id)] ?? {}).correct;
      }, 0);
      scores[section.id] = scoreSection(section, { kind: 'objective', correct });
    } else {
      const ratings: Record<string, Record<string, number>> = {};
      for (const task of section.tasks) {
        const feedback = state.feedback[taskKey(section.id, task.id)];
        if (feedback) ratings[task.id] = Object.fromEntries(feedback.criteria.map((c) => [c.id, c.score]));
      }
      scores[section.id] = scoreSection(section, { kind: 'rubric', ratings });
    }
  }
  return scores;
};

/** One task's own rubric estimate, for the per-task lines of the report. */
export const taskRubricEstimate = (section: SectionSpec, feedback: RubricFeedback): number =>
  estimateSectionFromRubric(
    section,
    feedback.criteria.map((c) => c.score),
  );
