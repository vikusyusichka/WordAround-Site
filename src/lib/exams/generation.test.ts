import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/aiClient', () => ({ generateJSON: vi.fn() }));

const { generateJSON } = await import('@/lib/aiClient');
const {
  buildObjectiveQuestionsPrompt,
  buildObjectiveStimulusPrompt,
  buildWritingTaskPrompt,
  generateTask,
  normalizeAnswer,
  parseObjectiveTask,
  parseSpeakingTask,
  parseWritingTask,
  TaskGenerationError,
} = await import('./generation');
const { findTaskRef } = await import('./registry');

const ref = (variant: string, section: string, task: string) => findTaskRef('ielts', variant, section, task)!;

const ieltsTask1 = ref('academic', 'writing', 'task1');
const ieltsTask2 = ref('academic', 'writing', 'task2');
const listening1 = ref('academic', 'listening', 'part1');
const deleReading1 = findTaskRef('dele', 'b2', 'reading', 'tarea1')!;

const choice = (answerIndex = 0) => ({
  kind: 'choice',
  prompt: 'Why?',
  options: ['A reason', 'Another', 'A third'],
  answerIndex,
  explanation: 'Because.',
});

describe('prompts', () => {
  it('carry the real format of the task', () => {
    const prompt = buildWritingTaskPrompt({ ...ieltsTask2, task: ieltsTask2.task as never });
    expect(prompt).toContain('IELTS');
    expect(prompt).toContain('at least 250 words');
    expect(prompt).toContain('Do not include "chart"');
  });

  it('ask for chart data only for a chart report', () => {
    const prompt = buildWritingTaskPrompt({ ...ieltsTask1, task: ieltsTask1.task as never });
    expect(prompt).toContain('"chart"');
    expect(prompt).not.toContain('Do not include "chart"');
  });

  it('ask for a script first, then exactly the spec item count on it', () => {
    const listeningRef = { ...listening1, task: listening1.task as never };
    expect(buildObjectiveStimulusPrompt(listeningRef)).toContain('"script"');
    const questions = buildObjectiveQuestionsPrompt(listeningRef, 'Anna: Hello.');
    expect(questions).toContain('EXACTLY 10 questions');
    expect(questions).toContain('Anna: Hello.');
  });

  it('target the CEFR level for a levelled exam and avoid recent topics', () => {
    const prompt = buildObjectiveStimulusPrompt({ ...deleReading1, task: deleReading1.task as never }, ['Old topic']);
    expect(prompt).toContain('CEFR B2');
    expect(prompt).toContain('Old topic');
    expect(prompt).toContain('"passage"');
  });
});

describe('parseWritingTask', () => {
  it('accepts a complete task', () => {
    const task = parseWritingTask({ title: 'Cities', prompt: 'Write about cities.', points: ['one', ''] }, ieltsTask2.task as never);
    expect(task).toEqual({ kind: 'writing', title: 'Cities', prompt: 'Write about cities.', points: ['one'] });
  });

  it('requires a consistent chart for a chart report', () => {
    const base = { title: 'Energy', prompt: 'Summarise the chart.' };
    expect(() => parseWritingTask(base, ieltsTask1.task as never)).toThrow(TaskGenerationError);
    expect(() =>
      parseWritingTask(
        { ...base, chart: { kind: 'bar', labels: ['2000', '2010'], series: [{ name: 'Coal', values: [1] }] } },
        ieltsTask1.task as never,
      ),
    ).toThrow(/does not match/);
    const ok = parseWritingTask(
      { ...base, chart: { kind: 'line', unit: '%', labels: ['2000', '2010'], series: [{ name: '', values: [1, 2] }] } },
      ieltsTask1.task as never,
    );
    expect(ok.chart).toMatchObject({ kind: 'line', series: [{ name: 'Series 1', values: [1, 2] }] });
  });
});

describe('parseSpeakingTask', () => {
  const longTurn = ref('academic', 'speaking', 'part2');
  it('needs something to answer', () => {
    expect(() => parseSpeakingTask({ title: 'T', instructions: 'Talk.' }, longTurn.task as never)).toThrow();
    expect(
      parseSpeakingTask({ title: 'T', instructions: 'Talk.', cueCard: { topic: 'A trip', points: ['where'] } }, longTurn.task as never),
    ).toMatchObject({ cueCard: { topic: 'A trip', points: ['where'] }, usesPicture: false });
  });
});

describe('parseObjectiveTask', () => {
  const readingTask = deleReading1.task as never;
  const passage = 'El museo abre a las nueve. Los martes la entrada es gratuita.';

  it('accepts exactly-sized, answerable questions and trims extras', () => {
    const questions = Array.from({ length: 7 }, () => choice(1));
    const task = parseObjectiveTask({ title: 'Museo', instructions: 'Lea.', passage, questions }, readingTask, 'reading');
    expect(task.questions).toHaveLength(6);
    expect(task.questions[0]).toMatchObject({ id: 'q1', kind: 'choice', answerIndex: 1 });
  });

  it('rejects too few questions, a bad answer index and repeated options', () => {
    const make = (questions: unknown[]) => () =>
      parseObjectiveTask({ title: 'M', instructions: 'Lea.', passage, questions }, readingTask, 'reading');
    expect(make([choice()])).toThrow(/expected 6/);
    expect(make(Array.from({ length: 6 }, () => choice(5)))).toThrow(/no valid answer/);
    expect(make(Array.from({ length: 6 }, () => ({ ...choice(), options: ['Same', 'same!'] })))).toThrow(/repeats/);
  });

  it('rejects a gap answer that is not in the text', () => {
    const text = (answer: string) => ({ kind: 'text', prompt: 'Abre a las ____.', answers: [answer], maxWords: 1 });
    const make = (answer: string) => () =>
      parseObjectiveTask(
        { title: 'M', instructions: 'Lea.', passage, questions: Array.from({ length: 6 }, () => text(answer)) },
        readingTask,
        'reading',
      );
    expect(make('diez')).toThrow(/not in the text/);
    expect(make('Nueve')).not.toThrow();
  });

  it('needs a script for listening', () => {
    expect(() =>
      parseObjectiveTask({ title: 'L', instructions: 'Listen.', questions: [] }, listening1.task as never, 'listening'),
    ).toThrow(/no script/);
  });
});

describe('normalizeAnswer', () => {
  it('ignores case, punctuation and spacing', () => {
    expect(normalizeAnswer('  The  Station! ')).toBe('the station');
    expect(normalizeAnswer('9:30')).toBe('9 30');
  });
});

describe('generateTask', () => {
  it('retries once after an invalid answer', async () => {
    const mock = vi.mocked(generateJSON);
    mock.mockReset();
    mock.mockResolvedValueOnce({ title: '' });
    mock.mockResolvedValueOnce({ title: 'Cities', prompt: 'Write.', points: [] });
    const task = await generateTask(ieltsTask2);
    expect(task).toMatchObject({ kind: 'writing', title: 'Cities' });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock.mock.calls[0][0]).toMatchObject({ task: 'exam_task_generation' });
  });

  it('writes reading material first, then questions against it', async () => {
    const mock = vi.mocked(generateJSON);
    mock.mockReset();
    const passage = 'El museo abre a las nueve de la mañana todos los días. Los martes la entrada es gratuita para estudiantes y jubilados.';
    mock.mockResolvedValueOnce({ title: 'Museo', instructions: 'Lea el texto.', passage });
    mock.mockResolvedValueOnce({ questions: Array.from({ length: 6 }, () => choice(0)) });
    const task = await generateTask(deleReading1);
    expect(task).toMatchObject({ kind: 'objective', title: 'Museo', passage });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock.mock.calls[1][0].prompt).toContain(passage);
  });

  it('gives up after two bad answers', async () => {
    const mock = vi.mocked(generateJSON);
    mock.mockReset();
    mock.mockResolvedValue({});
    await expect(generateTask(ieltsTask2)).rejects.toThrow();
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
