import { describe, expect, it } from 'vitest';

import { emptyCard, emptyDraft, validateCreateSet } from './createSetValidation';

const draftWith = (over: Partial<ReturnType<typeof emptyDraft>>) => ({ ...emptyDraft(), ...over });

const card = (word: string, translation: string, example = '') => ({
  ...emptyCard(),
  word,
  translation,
  example,
});

describe('validateCreateSet', () => {
  it('requires a title', () => {
    const d = draftWith({ title: '  ', cards: [card('a', 'b')] });
    expect(validateCreateSet(d).errorKey).toBe('createSet.error.emptyTitle');
  });

  it('rejects a title over 150 chars', () => {
    const d = draftWith({ title: 'x'.repeat(151), cards: [card('a', 'b')] });
    expect(validateCreateSet(d).errorKey).toBe('createSet.error.titleTooLong');
  });

  it('rejects a description over 200 chars', () => {
    const d = draftWith({ title: 'T', description: 'y'.repeat(201), cards: [card('a', 'b')] });
    expect(validateCreateSet(d).errorKey).toBe('createSet.error.descTooLong');
  });

  it('requires at least one card with word + translation', () => {
    const d = draftWith({ title: 'T', cards: [card('only-word', '')] });
    expect(validateCreateSet(d).errorKey).toBe('createSet.error.noValidCards');
  });

  it('rejects an example over 150 chars', () => {
    const d = draftWith({ title: 'T', cards: [card('a', 'b', 'z'.repeat(151))] });
    expect(validateCreateSet(d).errorKey).toBe('createSet.error.exampleTooLong');
  });

  it('accepts a valid draft and returns only the valid cards', () => {
    const d = draftWith({ title: 'T', cards: [card('a', 'b'), card('', ''), card('c', 'd')] });
    const result = validateCreateSet(d);
    expect(result.errorKey).toBeNull();
    expect(result.validCards).toHaveLength(2);
  });
});
