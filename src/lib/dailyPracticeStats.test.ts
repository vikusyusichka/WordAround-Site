import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearPracticeStats,
  dailyProgress,
  defaultGoal,
  fetchAllEntries,
  recordPractice,
  startOfDay,
  totalToday,
  totalTodayDisplay,
} from './dailyPracticeStats';

beforeEach(() => clearPracticeStats());

describe('defaultGoal', () => {
  it('is 15 minutes for time skills and 200 words for writing', () => {
    expect(defaultGoal('speaking')).toBe(15);
    expect(defaultGoal('listening')).toBe(15);
    expect(defaultGoal('reading')).toBe(15);
    expect(defaultGoal('writing')).toBe(200);
  });
});

describe('recordPractice', () => {
  it('accumulates per skill and keeps skills separate', () => {
    recordPractice({ skill: 'speaking', value: 60 });
    recordPractice({ skill: 'speaking', value: 30 });
    recordPractice({ skill: 'reading', value: 120 });

    expect(totalToday('speaking')).toBe(90);
    expect(totalToday('reading')).toBe(120);
    expect(totalToday('writing')).toBe(0);
  });

  it('drops non-positive and non-finite values (safe from cleanup paths)', () => {
    recordPractice({ skill: 'speaking', value: 0 });
    recordPractice({ skill: 'speaking', value: -30 });
    recordPractice({ skill: 'speaking', value: Number.NaN });
    expect(fetchAllEntries()).toHaveLength(0);
  });

  it('stamps the entry with the start of the local day and keeps metadata', () => {
    recordPractice({ skill: 'listening', value: 45, sourceModeID: 'from-text', sessionId: 's1' });
    const [entry] = fetchAllEntries();
    expect(entry.date).toBe(startOfDay());
    expect(entry.sourceModeID).toBe('from-text');
    expect(entry.sessionId).toBe('s1');
    expect(entry.value).toBe(45);
  });

  it('ignores entries stamped on other days when totalling today', () => {
    recordPractice({ skill: 'speaking', value: 300 });
    // Backdate the stored entry by two days.
    const raw = JSON.parse(localStorage.getItem('wa.dailyPracticeStats') ?? '[]');
    raw[0].date = startOfDay() - 2 * 24 * 60 * 60 * 1000;
    localStorage.setItem('wa.dailyPracticeStats', JSON.stringify(raw));

    expect(totalToday('speaking')).toBe(0);
    expect(fetchAllEntries()).toHaveLength(1); // history is kept, not deleted
  });
});

describe('totalTodayDisplay', () => {
  it('floors seconds to whole minutes for time skills', () => {
    recordPractice({ skill: 'speaking', value: 59 });
    expect(totalTodayDisplay('speaking')).toBe(0); // honest: not a full minute yet
    recordPractice({ skill: 'speaking', value: 1 });
    expect(totalTodayDisplay('speaking')).toBe(1);
    recordPractice({ skill: 'speaking', value: 119 });
    expect(totalTodayDisplay('speaking')).toBe(2);
  });

  it('passes words through unchanged for writing', () => {
    recordPractice({ skill: 'writing', value: 150 });
    expect(totalTodayDisplay('writing')).toBe(150);
  });
});

describe('dailyProgress', () => {
  it('reports current/goal/remaining and a 0…1 progress', () => {
    recordPractice({ skill: 'reading', value: 6 * 60 }); // 6 minutes
    const p = dailyProgress('reading');
    expect(p).toMatchObject({ current: 6, goal: 15, unit: 'minutes', remaining: 9 });
    expect(p.progress).toBeCloseTo(0.4);
  });

  it('clamps progress at 1 and remaining at 0 when the goal is beaten', () => {
    recordPractice({ skill: 'speaking', value: 40 * 60 });
    const p = dailyProgress('speaking');
    expect(p.current).toBe(40);
    expect(p.progress).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it('is all-zero on a fresh day', () => {
    expect(dailyProgress('writing')).toMatchObject({
      current: 0, goal: 200, progress: 0, unit: 'words', remaining: 200,
    });
  });
});
