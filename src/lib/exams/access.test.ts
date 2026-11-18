import { describe, expect, it } from 'vitest';

import { canPractiseTask, canStartMock } from './access';
import { daysUntil, formatClock, mockScore, niceMax, practiceSeconds } from './display';
import type { ExamAttempt } from './examStorage';
import { isEntitlementActive } from './examStorage';
import { findVariant } from './registry';
import { IELTS } from './specs/ielts';

const tried: ExamAttempt = {
  id: 'a',
  examId: 'ielts',
  variantId: 'academic',
  mode: 'task',
  createdAt: 0,
  durationSeconds: 60,
  sectionScores: { writing: 6 },
  sectionId: 'writing',
  taskId: 'task2',
};

describe('access', () => {
  it('opens everything while the paywall is off', () => {
    const off = { paywall: false, premium: false };
    expect(canStartMock(off)).toBe(true);
    expect(canPractiseTask(off, [tried], 'academic', 'writing', 'task2')).toBe(true);
  });

  it('gives one free try per task, and Premium for the rest', () => {
    const free = { paywall: true, premium: false };
    expect(canStartMock(free)).toBe(false);
    expect(canPractiseTask(free, [tried], 'academic', 'writing', 'task1')).toBe(true);
    expect(canPractiseTask(free, [tried], 'academic', 'writing', 'task2')).toBe(false);
    expect(canPractiseTask(free, [tried], 'general', 'writing', 'task2')).toBe(true);
    const paid = { paywall: true, premium: true };
    expect(canStartMock(paid)).toBe(true);
    expect(canPractiseTask(paid, [tried], 'academic', 'writing', 'task2')).toBe(true);
  });

  it('treats an expired or missing entitlement as not premium', () => {
    expect(isEntitlementActive(null)).toBe(false);
    expect(isEntitlementActive({ premium: true, currentPeriodEnd: null })).toBe(true);
    expect(isEntitlementActive({ premium: true, currentPeriodEnd: 1000 }, 2000)).toBe(false);
    expect(isEntitlementActive({ premium: false, currentPeriodEnd: null })).toBe(false);
  });
});

describe('display helpers', () => {
  it('formats clocks, including overtime', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-30)).toBe('+0:30');
  });

  it('rounds chart axes up to a nice number', () => {
    expect(niceMax(7)).toBe(10);
    expect(niceMax(23)).toBe(25);
    expect(niceMax(140)).toBe(200);
    expect(niceMax(0)).toBe(1);
  });

  it('counts whole days to the exam date', () => {
    const now = new Date(2026, 10, 18, 23, 30);
    expect(daysUntil('2026-11-18', now)).toBe(0);
    expect(daysUntil('2026-12-01', now)).toBe(13);
    expect(daysUntil('2026-11-17', now)).toBe(-1);
  });

  it('gives a task its share of the section clock', () => {
    const v = findVariant(IELTS, 'academic')!;
    const section = (id: string) => v.sections.find((s) => s.id === id)!;
    expect(practiceSeconds(section('writing'), section('writing').tasks[1])).toBe(40 * 60);
    expect(practiceSeconds(section('reading'), section('reading').tasks[2])).toBe(21 * 60);
    expect(practiceSeconds(section('speaking'), section('speaking').tasks[0])).toBeNull();
  });

  it('plots a mock by its overall score', () => {
    expect(mockScore({ ...tried, mode: 'mock', result: { kind: 'band', overall: 6.5 } })).toBe(6.5);
    expect(mockScore(tried)).toBeNull();
  });
});
