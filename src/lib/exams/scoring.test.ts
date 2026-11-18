import { describe, expect, it } from 'vitest';

import { findVariant } from './registry';
import { convertRaw, roundHalfBand, scoreExam, scoreSection } from './scoring';
import { DELE } from './specs/dele';
import { IELTS, IELTS_LISTENING_TABLE } from './specs/ielts';

const ielts = findVariant(IELTS, 'academic')!;
const dele = findVariant(DELE, 'b2')!;
const section = (variant: typeof ielts, id: string) => variant.sections.find((s) => s.id === id)!;

describe('roundHalfBand', () => {
  it('rounds .25 and .75 up, like IELTS', () => {
    expect(roundHalfBand(6.25)).toBe(6.5);
    expect(roundHalfBand(6.75)).toBe(7);
    expect(roundHalfBand(6.125)).toBe(6);
    expect(roundHalfBand(6.6)).toBe(6.5);
  });
});

describe('convertRaw', () => {
  it('picks the highest row at or below the raw score', () => {
    expect(convertRaw(IELTS_LISTENING_TABLE, 40)).toBe(9);
    expect(convertRaw(IELTS_LISTENING_TABLE, 30)).toBe(7);
    expect(convertRaw(IELTS_LISTENING_TABLE, 29)).toBe(6.5);
    expect(convertRaw(IELTS_LISTENING_TABLE, 0)).toBe(0);
  });
});

describe('scoreSection', () => {
  it('converts objective answers with the table and clamps out-of-range counts', () => {
    expect(scoreSection(section(ielts, 'listening'), { kind: 'objective', correct: 30 })).toBe(7);
    expect(scoreSection(section(ielts, 'listening'), { kind: 'objective', correct: 99 })).toBe(9);
    expect(scoreSection(section(ielts, 'listening'), { kind: 'objective', correct: -3 })).toBe(0);
  });

  it('scales objective answers onto DELE points', () => {
    expect(scoreSection(section(dele, 'reading'), { kind: 'objective', correct: 36 })).toBe(25);
    expect(scoreSection(section(dele, 'reading'), { kind: 'objective', correct: 18 })).toBe(12.5);
  });

  it('weights IELTS Writing Task 2 double', () => {
    const ratings = {
      task1: { taskAchievement: 5, coherenceCohesion: 5, lexicalResource: 5, grammaticalRange: 5 },
      task2: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRange: 7 },
    };
    // (5 * 1 + 7 * 2) / 3 = 6.33 → 6.5
    expect(scoreSection(section(ielts, 'writing'), { kind: 'rubric', ratings })).toBe(6.5);
  });

  it('counts a missing task or criterion as zero', () => {
    const ratings = {
      task2: { taskResponse: 9, coherenceCohesion: 9, lexicalResource: 9, grammaticalRange: 9 },
    };
    expect(scoreSection(section(ielts, 'writing'), { kind: 'rubric', ratings })).toBe(6);
  });

  it('scales DELE rubric ratings onto 25 points', () => {
    const full = { adecuacion: 3, coherencia: 3, correccion: 3, alcance: 3 };
    const half = { adecuacion: 1.5, coherencia: 1.5, correccion: 1.5, alcance: 1.5 };
    expect(scoreSection(section(dele, 'writing'), { kind: 'rubric', ratings: { tarea1: full, tarea2: full } })).toBe(25);
    expect(scoreSection(section(dele, 'writing'), { kind: 'rubric', ratings: { tarea1: full, tarea2: half } })).toBe(18.75);
  });

  it('rejects answers of the wrong kind', () => {
    expect(() => scoreSection(section(dele, 'writing'), { kind: 'objective', correct: 1 })).toThrow();
    expect(() => scoreSection(section(dele, 'reading'), { kind: 'rubric', ratings: {} })).toThrow();
  });
});

describe('scoreExam', () => {
  it('averages IELTS section bands into the overall band', () => {
    expect(scoreExam(ielts, { listening: 6.5, reading: 6.5, writing: 5, speaking: 7 })).toEqual({
      kind: 'band',
      overall: 6.5, // 6.25 → 6.5
    });
  });

  it('passes DELE only when every group and the total pass', () => {
    expect(scoreExam(dele, { reading: 20, writing: 15, listening: 15, speaking: 15 })).toEqual({
      kind: 'groups',
      groups: [
        { id: 'group1', score: 35, max: 50, passed: true },
        { id: 'group2', score: 30, max: 50, passed: true },
      ],
      total: 65,
      passed: true,
    });
    // 70 total, but group 2 is under 30 → "No apto".
    const failed = scoreExam(dele, { reading: 25, writing: 25, listening: 10, speaking: 10 });
    expect(failed).toMatchObject({ total: 70, passed: false });
  });

  it('refuses to score with a section missing', () => {
    expect(() => scoreExam(ielts, { listening: 6, reading: 6, writing: 6 })).toThrow(/speaking/);
  });
});
