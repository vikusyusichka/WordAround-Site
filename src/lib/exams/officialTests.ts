/* Exam prep — the catalog of official practice tests.

   The data is not written by hand and not produced by AI: it comes from
   scripts/update-official-tests.mjs, which reads the exam owners' own pages
   (ielts.org, cervantes.org), keeps only links on their domains that still
   open, and is re-run every week by .github/workflows/official-tests.yml.
   The tests themselves stay on the official sites — the app only links. */

import catalog from './officialTests.json';
import type { ExamSkill } from './types';

export type OfficialLinkKind = 'online' | 'pdf' | 'answers' | 'transcript' | 'audio' | 'examples' | 'page';

export interface OfficialLink {
  kind: OfficialLinkKind;
  label: string;
  url: string;
}

export interface OfficialTest {
  id: string;
  examId: string;
  /** Exam variants it belongs to; empty = every variant. */
  variantIds: string[];
  skill: ExamSkill | null;
  /** A whole section (or exam) versus one short task of one question type. */
  kind: 'full' | 'sample';
  title: string;
  description: string;
  year: number | null;
  owner: string;
  sourceUrl: string;
  links: OfficialLink[];
}

export interface OfficialSource {
  id: string;
  examId: string;
  owner: string;
  url: string;
  status: 'ok' | 'unreachable';
  found: number;
  checkedAt: string | null;
}

interface Catalog {
  checkedAt: string;
  sources: OfficialSource[];
  tests: OfficialTest[];
}

const data = catalog as Catalog;

export const catalogCheckedAt = (): string => data.checkedAt;

export const sourcesForExam = (examId: string): OfficialSource[] => data.sources.filter((s) => s.examId === examId);

const SKILL_ORDER: (ExamSkill | null)[] = [null, 'listening', 'reading', 'writing', 'speaking'];

/** Tests for an exam variant: full tests first, then by skill, newest year first. */
export const officialTestsFor = (examId: string, variantId: string, tests: OfficialTest[] = data.tests): OfficialTest[] =>
  tests
    .filter((t) => t.examId === examId && (t.variantIds.length === 0 || t.variantIds.includes(variantId)))
    .sort(
      (a, b) =>
        (a.kind === 'full' ? 0 : 1) - (b.kind === 'full' ? 0 : 1) ||
        SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill) ||
        (b.year ?? 0) - (a.year ?? 0),
    );

/** The link that opens the test itself (rather than its answers). */
export const primaryLink = (test: OfficialTest): OfficialLink | undefined =>
  test.links.find((l) => l.kind === 'online') ??
  test.links.find((l) => l.kind === 'pdf') ??
  test.links.find((l) => l.kind === 'page') ??
  test.links[0];
