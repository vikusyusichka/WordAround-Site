import { describe, expect, it } from 'vitest';

import { ESSAY_LANGUAGES } from '../essayTypes';
import { EXAMS, examsForLanguage, findExam, findVariant, validateExamSpec } from './registry';
import { objectiveItemCount } from './scoring';
import { DELE } from './specs/dele';
import { IELTS } from './specs/ielts';
import type { ExamSpec } from './types';

describe('every registered exam', () => {
  it.each(EXAMS.map((exam) => [exam.id, exam] as const))('%s is a valid spec', (_id, exam) => {
    expect(validateExamSpec(exam)).toEqual([]);
  });

  it('has unique ids and a known language', () => {
    expect(new Set(EXAMS.map((e) => e.id)).size).toBe(EXAMS.length);
    const languageIds = ESSAY_LANGUAGES.map((l) => l.id);
    for (const exam of EXAMS) expect(languageIds).toContain(exam.languageId);
  });
});

describe('lookups', () => {
  it('finds exams, variants and exams by language', () => {
    expect(findExam('ielts')).toBe(IELTS);
    expect(findExam('nope')).toBeUndefined();
    expect(findVariant(IELTS, 'general')?.title).toBe('General Training');
    expect(examsForLanguage('spanish')).toEqual([DELE]);
  });
});

describe('IELTS format', () => {
  it.each(IELTS.variants.map((v) => [v.id, v] as const))('%s has 40 listening and 40 reading items', (_id, v) => {
    const section = (id: string) => v.sections.find((s) => s.id === id)!;
    expect(objectiveItemCount(section('listening'))).toBe(40);
    expect(objectiveItemCount(section('reading'))).toBe(40);
    expect(v.sections.reduce((sum, s) => sum + s.minutes, 0)).toBe(164);
  });

  it('uses a chart report for Academic Task 1 and a letter for General Training', () => {
    const task1 = (variantId: string) =>
      findVariant(IELTS, variantId)!.sections.find((s) => s.id === 'writing')!.tasks[0];
    expect(task1('academic')).toMatchObject({ format: 'chartReport' });
    expect(task1('general')).toMatchObject({ format: 'letter' });
  });
});

describe('DELE B2 format', () => {
  const b2 = findVariant(DELE, 'b2')!;

  it('matches the official timings (3 h 50 min including speaking prep)', () => {
    const minutes = b2.sections.reduce((sum, s) => sum + s.minutes + (s.prepMinutes ?? 0), 0);
    expect(minutes).toBe(230);
  });

  it('has 36 reading and 30 listening items', () => {
    expect(objectiveItemCount(b2.sections.find((s) => s.id === 'reading')!)).toBe(36);
    expect(objectiveItemCount(b2.sections.find((s) => s.id === 'listening')!)).toBe(30);
  });
});

describe('validateExamSpec', () => {
  const broken = (): ExamSpec => structuredClone(DELE);

  it('reports a section left out of every group', () => {
    const exam = broken();
    const overall = exam.variants[0].overall;
    if (overall.kind !== 'groups') throw new Error('expected groups');
    overall.groups[1].sectionIds = ['listening'];
    expect(validateExamSpec(exam)).toEqual(
      expect.arrayContaining([
        'dele/b2: section speaking is in no group',
        "dele/b2: group group2 max 50 ≠ its sections' 25",
      ]),
    );
  });

  it('reports scoring that does not match the tasks', () => {
    const exam = broken();
    exam.variants[0].sections[0].scoring = { kind: 'rubricBand', criterionMax: 9 };
    expect(validateExamSpec(exam)).toContain(
      'dele/b2/reading: scoring rubricBand does not match its task kinds',
    );
  });

  it('reports a conversion table that is not monotonic or misses 0', () => {
    const exam = structuredClone(IELTS);
    const listening = exam.variants[0].sections[0];
    listening.scoring = {
      kind: 'objectiveTable',
      table: [
        { minRaw: 30, score: 6 },
        { minRaw: 20, score: 7 },
      ],
    };
    expect(validateExamSpec(exam)).toEqual(
      expect.arrayContaining([
        'ielts/academic/listening: table has no row for 0 correct',
        'ielts/academic/listening: table score falls as raw score rises',
      ]),
    );
  });
});
