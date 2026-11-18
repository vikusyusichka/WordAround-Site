import { describe, expect, it } from 'vitest';

import { examAccent, sectionPlays, splitMinutes, variantMinutes } from './display';
import { EXAMS, findVariant } from './registry';
import { DELE } from './specs/dele';
import { IELTS } from './specs/ielts';

describe('variantMinutes', () => {
  it('adds prep time to section time', () => {
    expect(variantMinutes(findVariant(IELTS, 'academic')!)).toBe(164);
    expect(variantMinutes(findVariant(DELE, 'b2')!)).toBe(230);
  });
});

describe('splitMinutes', () => {
  it('splits into hours and minutes', () => {
    expect(splitMinutes(230)).toEqual({ hours: 3, minutes: 50 });
    expect(splitMinutes(60)).toEqual({ hours: 1, minutes: 0 });
    expect(splitMinutes(14)).toEqual({ hours: 0, minutes: 14 });
  });
});

describe('sectionPlays', () => {
  it('reports how often listening audio plays, and nothing for other sections', () => {
    const ielts = findVariant(IELTS, 'academic')!.sections;
    const dele = findVariant(DELE, 'b2')!.sections;
    expect(sectionPlays(ielts.find((s) => s.id === 'listening')!)).toBe(1);
    expect(sectionPlays(dele.find((s) => s.id === 'listening')!)).toBe(2);
    expect(sectionPlays(ielts.find((s) => s.id === 'reading')!)).toBeUndefined();
  });
});

describe('examAccent', () => {
  it('gives every registered exam theme-token colours', () => {
    for (const exam of EXAMS) {
      const { accent, blob } = examAccent(exam.id);
      expect(accent).toMatch(/^var\(--/);
      expect(blob).toMatch(/^var\(--/);
    }
  });
});
