import { describe, expect, it } from 'vitest';

import type { GeneratedTask } from './generation';
import { estimateSectionFromObjective, estimateSectionFromRubric, isAnswerCorrect, markObjective, sectionMax } from './marking';
import { computeSectionScores, createMock, mockReducer, pendingRubricKeys, taskKey, type MockState } from './mockSession';
import { findVariant } from './registry';
import type { RubricFeedback } from './rubricScoring';
import { DELE } from './specs/dele';
import { IELTS } from './specs/ielts';

const ielts = findVariant(IELTS, 'academic')!;
const dele = findVariant(DELE, 'b2')!;

const choiceTask = (count: number): GeneratedTask => ({
  kind: 'objective',
  title: 'T',
  instructions: 'Answer.',
  passage: 'Text',
  questions: Array.from({ length: count }, (_, i) => ({
    kind: 'choice' as const,
    id: `q${i + 1}`,
    prompt: 'Q',
    options: ['a', 'b'],
    answerIndex: 0,
    explanation: '',
  })),
});

const sectionTasks = (variant: typeof ielts, sectionId: string): Record<string, GeneratedTask> => {
  const section = variant.sections.find((s) => s.id === sectionId)!;
  return Object.fromEntries(
    section.tasks.map((task) => [
      task.id,
      task.kind === 'objective'
        ? choiceTask(task.items)
        : task.kind === 'writing'
          ? { kind: 'writing', title: 'W', prompt: 'Write.', points: [] }
          : { kind: 'speaking', title: 'S', instructions: 'Speak.', questions: ['Q?'], usesPicture: false },
    ]),
  );
};

const feedback = (criteria: string[], score: number): RubricFeedback => ({
  criteria: criteria.map((id) => ({ id, name: id, score, comment: '' })),
  summary: 's',
  strengths: [],
  improvements: [],
  corrections: [],
  improvedVersion: '',
});

describe('marking', () => {
  it('marks choice and text answers, honouring the word limit', () => {
    const text = { kind: 'text' as const, id: 'q1', prompt: '', answers: ['train station'], maxWords: 2, explanation: '' };
    expect(isAnswerCorrect(text, 'Train-station')).toBe(true);
    expect(isAnswerCorrect(text, 'the train station')).toBe(false);
    expect(isAnswerCorrect(text, undefined)).toBe(false);
    const task = choiceTask(3);
    if (task.kind !== 'objective') throw new Error();
    expect(markObjective(task.questions, { q1: 0, q2: 1 })).toEqual({ correct: 1, total: 3, results: [true, false, false] });
  });

  it('estimates the section score a single task implies', () => {
    const listening = ielts.sections[0];
    expect(estimateSectionFromObjective(listening, 8, 10)).toBe(7.5); // 32/40
    expect(estimateSectionFromObjective(dele.sections[0], 3, 6)).toBe(12.5);
    expect(estimateSectionFromRubric(ielts.sections[2], [6, 7, 7, 6])).toBe(6.5);
    expect(sectionMax(ielts.sections[0])).toBe(9);
    expect(sectionMax(dele.sections[3])).toBe(25);
  });
});

describe('mockReducer', () => {
  const reduce = mockReducer(ielts);
  const start = (): MockState => reduce(createMock('m1', 'ielts', 'academic'), { type: 'start', now: 0 });

  it('generates, then runs each section against its own clock', () => {
    let state = start();
    expect(state.phase).toBe('generating');
    state = reduce(state, { type: 'generated', sectionId: 'listening', tasks: sectionTasks(ielts, 'listening'), now: 1000 });
    expect(state).toMatchObject({ phase: 'running', sectionIndex: 0, deadline: 1000 + 30 * 60_000 });
    state = reduce(state, { type: 'finishSection', now: 5000 });
    expect(state).toMatchObject({ phase: 'generating', sectionIndex: 1 });
  });

  it('goes straight on when the next section was prefetched', () => {
    let state = start();
    state = reduce(state, { type: 'generated', sectionId: 'listening', tasks: sectionTasks(ielts, 'listening'), now: 0 });
    state = reduce(state, { type: 'generated', sectionId: 'reading', tasks: sectionTasks(ielts, 'reading'), now: 10 });
    expect(state.phase).toBe('running');
    expect(state.sectionIndex).toBe(0);
    state = reduce(state, { type: 'finishSection', now: 100 });
    expect(state).toMatchObject({ phase: 'running', sectionIndex: 1, deadline: 100 + 60 * 60_000 });
  });

  it('counts recording plays per task, only while the section runs', () => {
    let state = start();
    expect(reduce(state, { type: 'played', key: 'listening/part1' })).toBe(state);
    state = reduce(state, { type: 'generated', sectionId: 'listening', tasks: sectionTasks(ielts, 'listening'), now: 0 });
    state = reduce(state, { type: 'played', key: 'listening/part1' });
    state = reduce(state, { type: 'played', key: 'listening/part1' });
    expect(state.plays).toEqual({ 'listening/part1': 2 });
  });

  it('ignores answers outside a running section', () => {
    const state = start();
    expect(reduce(state, { type: 'writeEssay', key: 'writing/task1', text: 'x' })).toBe(state);
  });

  it('holds a prep phase before a section that has one (DELE speaking)', () => {
    const reduceDele = mockReducer(dele);
    let state: MockState = { ...createMock('m2', 'dele', 'b2'), phase: 'running', sectionIndex: 2, generated: {
      speaking: sectionTasks(dele, 'speaking'),
    } };
    state = reduceDele(state, { type: 'finishSection', now: 0 });
    expect(state).toMatchObject({ phase: 'prep', prepDeadline: 20 * 60_000, deadline: null });
    state = reduceDele(state, { type: 'endPrep', now: 50 });
    expect(state).toMatchObject({ phase: 'running', deadline: 50 + 20 * 60_000 });
    state = reduceDele(state, { type: 'finishSection', now: 60 });
    expect(state.phase).toBe('marking');
  });

  it('scores everything with the exam rules once marked', () => {
    let state: MockState = {
      ...createMock('m3', 'ielts', 'academic'),
      phase: 'marking',
      sectionIndex: 4,
      generated: Object.fromEntries(ielts.sections.map((s) => [s.id, sectionTasks(ielts, s.id)])),
      objectiveAnswers: {
        // 30/40 listening (band 7), 40/40 reading (band 9)
        ...Object.fromEntries(['part1', 'part2', 'part3'].map((p) => [taskKey('listening', p), Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, 0]))])),
        ...Object.fromEntries(
          [['passage1', 13], ['passage2', 13], ['passage3', 14]].map(([p, n]) => [
            taskKey('reading', p as string),
            Object.fromEntries(Array.from({ length: n as number }, (_, i) => [`q${i + 1}`, 0])),
          ]),
        ),
      },
      essays: { 'writing/task1': 'An essay.', 'writing/task2': 'Another.' },
      spoken: {},
    };
    expect(pendingRubricKeys(ielts, state)).toEqual(['writing/task1', 'writing/task2']);
    state = { ...state, feedback: {
      'writing/task1': feedback(['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'], 6),
      'writing/task2': feedback(['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'], 6),
    } };
    expect(computeSectionScores(ielts, state)).toEqual({ listening: 7, reading: 9, writing: 6, speaking: 0 });
    const done = reduce(state, { type: 'complete', variant: ielts, now: 99 });
    expect(done).toMatchObject({ phase: 'done', finishedAt: 99, result: { kind: 'band', overall: 5.5 } });
  });
});
