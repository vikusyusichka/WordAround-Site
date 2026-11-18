import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/aiClient', () => ({ generateJSON: vi.fn() }));

const { generateJSON } = await import('@/lib/aiClient');
const { buildRubricPrompt, countWords, parseRubricFeedback, ratingsOf, scoreRubricTask } = await import('./rubricScoring');
const { findTaskRef } = await import('./registry');

const ielts = findTaskRef('ielts', 'academic', 'writing', 'task2')!;
const dele = findTaskRef('dele', 'b2', 'speaking', 'tarea1')!;
const writingRef = { ...ielts, task: ielts.task as never };
const generated = { kind: 'writing' as const, title: 'Cities', prompt: 'Discuss cities.', points: [] };

const ieltsRatings = (score: number) => [
  { id: 'taskResponse', score, comment: 'ok' },
  { id: 'coherenceCohesion', score, comment: 'ok' },
  { id: 'lexicalResource', score, comment: 'ok' },
  { id: 'grammaticalRange', score, comment: 'ok' },
];

describe('countWords', () => {
  it('counts words, not punctuation', () => {
    expect(countWords('Hello,  world — again!')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });
});

describe('buildRubricPrompt', () => {
  it('lists every criterion on the exam scale and the word count', () => {
    const prompt = buildRubricPrompt({
      ref: writingRef,
      generated,
      response: 'Cities are big.',
      feedbackLanguage: 'Ukrainian',
    });
    expect(prompt).toContain('from 0 to 9');
    for (const id of ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']) {
      expect(prompt).toContain(`"${id}"`);
    }
    expect(prompt).toContain('The answer has 3 words');
    expect(prompt).toContain('in Ukrainian');
  });

  it('uses the DELE 0–3 scale and treats speech as a transcript', () => {
    const prompt = buildRubricPrompt({
      ref: { ...dele, task: dele.task as never },
      generated: { kind: 'speaking', title: 'T', instructions: 'Habla.', questions: ['¿Por qué?'], usesPicture: false },
      response: 'Creo que sí.',
      spokenSeconds: 120,
      feedbackLanguage: 'English',
    });
    expect(prompt).toContain('from 0 to 3');
    expect(prompt).toContain('transcript');
  });
});

describe('parseRubricFeedback', () => {
  const answer = 'I thinks cities is great.';

  it('keeps ratings in criterion order, rounded, and drops invented corrections', () => {
    const feedback = parseRubricFeedback(
      {
        criteria: [...ieltsRatings(6)].reverse().map((c, i) => (i === 0 ? { ...c, score: 6.6 } : c)),
        summary: 'Fine.',
        strengths: ['Clear'],
        improvements: ['Grammar'],
        corrections: [
          { original: 'I thinks', corrected: 'I think', explanation: 'Agreement' },
          { original: 'never written', corrected: 'x', explanation: 'invented' },
        ],
        improvedVersion: 'I think cities are great.',
      },
      writingRef,
      answer,
    );
    expect(feedback.criteria.map((c) => c.id)).toEqual(['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']);
    expect(feedback.criteria.at(-1)?.score).toBe(7);
    expect(feedback.corrections).toHaveLength(1);
    expect(ratingsOf('task2', feedback)).toEqual({
      task2: { taskResponse: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 7 },
    });
  });

  it('rejects a missing criterion, an out-of-range rating or no summary', () => {
    expect(() => parseRubricFeedback({ criteria: ieltsRatings(6).slice(1), summary: 's' }, writingRef, answer)).toThrow(/missing/);
    expect(() => parseRubricFeedback({ criteria: ieltsRatings(10), summary: 's' }, writingRef, answer)).toThrow(/out of range/);
    expect(() => parseRubricFeedback({ criteria: ieltsRatings(6) }, writingRef, answer)).toThrow(/summary/);
  });
});

describe('scoreRubricTask', () => {
  it('asks the writing scorer and retries once', async () => {
    const mock = vi.mocked(generateJSON);
    mock.mockReset();
    mock.mockResolvedValueOnce({ criteria: [] });
    mock.mockResolvedValueOnce({ criteria: ieltsRatings(7), summary: 'Good.' });
    const feedback = await scoreRubricTask({ ref: writingRef, generated, response: 'Text.', feedbackLanguage: 'English' });
    expect(feedback.summary).toBe('Good.');
    expect(mock.mock.calls[0][0]).toMatchObject({ task: 'exam_writing_scoring' });
  });
});
