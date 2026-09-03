import { describe, expect, it } from 'vitest';

import {
  EMPTY_MANUAL_DRAFT,
  manualDraftToQuestion,
  validateManualQuestion,
  type ManualQuestionDraft,
} from './grammarQuizManual';

const draft = (patch: Partial<ManualQuestionDraft>): ManualQuestionDraft => ({
  ...EMPTY_MANUAL_DRAFT,
  ...patch,
});

describe('validateManualQuestion', () => {
  it('requires question text for every type', () => {
    expect(validateManualQuestion(draft({}))).toBe('questionRequired');
  });

  it('multiple choice needs 2+ options and an answer among them', () => {
    const base = { type: 'multipleChoice' as const, questionText: 'Which form?' };
    expect(validateManualQuestion(draft({ ...base, options: ['a', '', '', ''] }))).toBe('optionsRequired');
    expect(validateManualQuestion(draft({ ...base, options: ['a', 'b', '', ''] }))).toBe('answerRequired');
    expect(
      validateManualQuestion(draft({ ...base, options: ['a', 'b', '', ''], correctAnswer: 'c' })),
    ).toBe('answerNotAnOption');
    expect(
      validateManualQuestion(draft({ ...base, options: ['a', 'b', '', ''], correctAnswer: 'B' })),
    ).toBeNull();
  });

  it('true/false only needs the question', () => {
    expect(validateManualQuestion(draft({ type: 'trueFalse', questionText: 'Is it?' }))).toBeNull();
  });

  it('fill-gap needs a blank and the missing word', () => {
    expect(validateManualQuestion(draft({ type: 'fillGap', questionText: 'I go to school' }))).toBe(
      'blankRequired',
    );
    expect(validateManualQuestion(draft({ type: 'fillGap', questionText: 'I _____ school' }))).toBe(
      'answerRequired',
    );
    expect(
      validateManualQuestion(
        draft({ type: 'fillGap', questionText: 'I _____ school', correctAnswer: 'go to' }),
      ),
    ).toBeNull();
  });

  it('short answer needs the answer', () => {
    expect(validateManualQuestion(draft({ questionText: 'Explain ser' }))).toBe('answerRequired');
    expect(
      validateManualQuestion(draft({ questionText: 'Explain ser', correctAnswer: 'Identity' })),
    ).toBeNull();
  });
});

describe('manualDraftToQuestion', () => {
  it('keeps only non-empty options for multiple choice', () => {
    const q = manualDraftToQuestion(
      draft({
        type: 'multipleChoice',
        questionText: ' Which? ',
        options: ['a', ' b ', '', '  '],
        correctAnswer: ' a ',
      }),
      2,
    );
    expect(q.options).toEqual(['a', 'b']);
    expect(q.questionText).toBe('Which?');
    expect(q.correctAnswer).toBe('a');
    expect(q.order).toBe(2);
  });

  it('true/false always gets both options and defaults to True', () => {
    const q = manualDraftToQuestion(draft({ type: 'trueFalse', questionText: 'Is it?' }), 0);
    expect(q.options).toEqual(['True', 'False']);
    expect(q.correctAnswer).toBe('True');
  });

  it('drops an empty explanation', () => {
    const q = manualDraftToQuestion(
      draft({ questionText: 'Q', correctAnswer: 'A', explanation: '   ' }),
      0,
    );
    expect(q.explanation).toBeUndefined();
  });
});
