import { describe, expect, it } from 'vitest';

import {
  attemptScore,
  daysUntil,
  examAccent,
  formatSectionScore,
  sectionMax,
  sectionPlays,
  splitMinutes,
  variantMinutes,
} from './display';
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

describe('daysUntil', () => {
  it('counts whole days to the exam date', () => {
    const now = new Date(2026, 10, 18, 23, 30);
    expect(daysUntil('2026-11-18', now)).toBe(0);
    expect(daysUntil('2026-12-01', now)).toBe(13);
    expect(daysUntil('2026-11-17', now)).toBe(-1);
  });
});

describe('attemptScore and formatSectionScore', () => {
  it('plots an attempt by its overall result and prints bands with one decimal', () => {
    const base = { id: 'a', examId: 'ielts', variantId: 'academic', mode: 'official' as const, createdAt: 0, durationSeconds: 0, sectionScores: {} };
    expect(attemptScore({ ...base, result: { kind: 'band', overall: 6.5 } })).toBe(6.5);
    expect(attemptScore({ ...base, result: { kind: 'groups', groups: [], total: 63.75, passed: true } })).toBe(63.75);
    expect(attemptScore(base)).toBeNull();
    const ielts = findVariant(IELTS, 'academic')!;
    const dele = findVariant(DELE, 'b2')!;
    expect(formatSectionScore(ielts.sections[0], 7)).toBe('7.0');
    expect(formatSectionScore(dele.sections[0], 18.75)).toBe('18.75');
    expect(sectionMax(ielts.sections[0])).toBe(9);
    expect(sectionMax(dele.sections[3])).toBe(25);
  });
});
