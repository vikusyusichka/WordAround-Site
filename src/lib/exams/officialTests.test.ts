import { describe, expect, it } from 'vitest';

import catalog from './officialTests.json';
import { officialTestsFor, primaryLink, sourcesForExam, type OfficialTest } from './officialTests';
import { EXAMS } from './registry';

const test = (over: Partial<OfficialTest>): OfficialTest => ({
  id: 'x',
  examId: 'ielts',
  variantIds: [],
  skill: 'reading',
  kind: 'sample',
  title: 'T',
  description: '',
  year: null,
  owner: 'ielts.org',
  sourceUrl: 'https://ielts.org',
  links: [{ kind: 'answers', label: 'A', url: 'https://ielts.org/a.pdf' }],
  ...over,
});

describe('the committed catalog', () => {
  it('only links to the exam owners, over https', () => {
    const allowed = /^https:\/\/((demo-)?ielts\.inspera\.com|([a-z-]+\.)?ielts\.org|([a-z-]+\.)?cervantes\.(es|org))\//;
    for (const t of catalog.tests) {
      expect(t.links.length).toBeGreaterThan(0);
      for (const link of t.links) expect(link.url).toMatch(allowed);
    }
  });

  it('belongs to known exams and variants', () => {
    for (const t of catalog.tests) {
      const exam = EXAMS.find((e) => e.id === t.examId);
      expect(exam).toBeDefined();
      for (const v of t.variantIds) expect(exam!.variants.map((x) => x.id)).toContain(v);
    }
  });

  it('records where every exam was looked for', () => {
    expect(sourcesForExam('ielts').length).toBeGreaterThan(0);
    expect(sourcesForExam('dele').length).toBeGreaterThan(0);
  });
});

describe('officialTestsFor', () => {
  it('filters by variant and puts full tests first, then by skill and newest year', () => {
    const list = [
      test({ id: 'gt', variantIds: ['general'] }),
      test({ id: 'speak', skill: 'speaking', year: 2023 }),
      test({ id: 'old', skill: 'listening', year: 2019 }),
      test({ id: 'new', skill: 'listening', year: 2024 }),
      test({ id: 'full', kind: 'full', skill: 'writing', variantIds: ['academic'] }),
    ];
    expect(officialTestsFor('ielts', 'academic', list).map((t) => t.id)).toEqual(['full', 'new', 'old', 'speak']);
  });
});

describe('primaryLink', () => {
  it('opens the test itself rather than its answers', () => {
    const t = test({
      links: [
        { kind: 'answers', label: 'A', url: 'https://ielts.org/a.pdf' },
        { kind: 'online', label: 'Go', url: 'https://ielts.inspera.com/player/?a=1' },
      ],
    });
    expect(primaryLink(t)?.kind).toBe('online');
    expect(primaryLink(test({}))?.kind).toBe('answers');
  });
});
