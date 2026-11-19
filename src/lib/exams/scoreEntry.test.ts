import { describe, expect, it } from 'vitest';

import { computeEntry, entryFieldFor, isValidEntry, parseEntry } from './scoreEntry';
import { findVariant } from './registry';
import { DELE } from './specs/dele';
import { IELTS } from './specs/ielts';

const ielts = findVariant(IELTS, 'academic')!;
const dele = findVariant(DELE, 'b2')!;

describe('entryFieldFor', () => {
  it('asks for correct answers in reading/listening and a score elsewhere', () => {
    expect(entryFieldFor(ielts.sections[0])).toEqual({ sectionId: 'listening', input: 'correct', max: 40 });
    expect(entryFieldFor(ielts.sections[2])).toEqual({ sectionId: 'writing', input: 'score', max: 9, step: 0.5 });
    expect(entryFieldFor(dele.sections[0])).toEqual({ sectionId: 'reading', input: 'correct', max: 36 });
    expect(entryFieldFor(dele.sections[3])).toEqual({ sectionId: 'speaking', input: 'score', max: 25, step: 0.25 });
  });
});

describe('parseEntry / isValidEntry', () => {
  it('reads numbers, including a decimal comma', () => {
    expect(parseEntry('31')).toBe(31);
    expect(parseEntry(' 6,5 ')).toBe(6.5);
    expect(parseEntry('')).toBeUndefined();
    expect(parseEntry('abc')).toBeUndefined();
  });

  it('rejects out-of-range, fractional answers and off-step scores', () => {
    const answers = entryFieldFor(ielts.sections[0]);
    const band = entryFieldFor(ielts.sections[2]);
    expect(isValidEntry(answers, 40)).toBe(true);
    expect(isValidEntry(answers, 41)).toBe(false);
    expect(isValidEntry(answers, 30.5)).toBe(false);
    expect(isValidEntry(band, 6.5)).toBe(true);
    expect(isValidEntry(band, 6.25)).toBe(false);
    expect(isValidEntry(band, -1)).toBe(false);
  });
});

describe('computeEntry', () => {
  it('converts IELTS raw answers to bands and averages a complete entry', () => {
    const entry = computeEntry(ielts, { listening: 31, reading: 30, writing: 6, speaking: 6.5 });
    expect(entry.sectionScores).toEqual({ listening: 7, reading: 7, writing: 6, speaking: 6.5 });
    expect(entry.result).toEqual({ kind: 'band', overall: 6.5 }); // 6.625 → 6.5
  });

  it('gives section scores but no overall result while a section is missing or invalid', () => {
    const entry = computeEntry(ielts, { listening: 35, reading: 99, writing: 6 });
    expect(entry.sectionScores).toEqual({ listening: 8, writing: 6 });
    expect(entry.result).toBeUndefined();
  });

  it('decides DELE pass/fail by group', () => {
    const entry = computeEntry(dele, { reading: 27, writing: 15, listening: 18, speaking: 15 });
    expect(entry.sectionScores).toEqual({ reading: 18.75, writing: 15, listening: 15, speaking: 15 });
    expect(entry.result).toMatchObject({ kind: 'groups', total: 63.75, passed: true });
  });
});
