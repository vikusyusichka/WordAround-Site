import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearTodayGoal,
  goalOverrideFor,
  readTodayGoal,
  setTodayGoal,
} from './dailyGoal';

const MONDAY = new Date('2026-03-02T10:00:00');
const TUESDAY = new Date('2026-03-03T09:00:00');

describe('dailyGoal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has no goal until one is chosen', () => {
    expect(readTodayGoal(MONDAY)).toBeNull();
  });

  it('reads back the goal chosen today', () => {
    setTodayGoal({ skill: 'speaking', target: 30 }, MONDAY);

    expect(readTodayGoal(MONDAY)).toEqual({ skill: 'speaking', target: 30 });
  });

  it('forgets a goal once the day is over — a daily goal is chosen daily', () => {
    setTodayGoal({ skill: 'writing', target: 400 }, MONDAY);

    expect(readTodayGoal(TUESDAY)).toBeNull();
  });

  it('replaces an earlier choice made the same day', () => {
    setTodayGoal({ skill: 'reading', target: 5 }, MONDAY);
    setTodayGoal({ skill: 'listening', target: 15 }, MONDAY);

    expect(readTodayGoal(MONDAY)).toEqual({ skill: 'listening', target: 15 });
  });

  it('clears on request', () => {
    setTodayGoal({ skill: 'reading', target: 15 }, MONDAY);
    clearTodayGoal();

    expect(readTodayGoal(MONDAY)).toBeNull();
  });

  it('survives a corrupted entry', () => {
    localStorage.setItem('wa.dailyGoal', '{ not json');
    expect(readTodayGoal(MONDAY)).toBeNull();

    localStorage.setItem('wa.dailyGoal', JSON.stringify({ skill: 'yoga', target: 5 }));
    expect(readTodayGoal(MONDAY)).toBeNull();
  });
});

describe('goalOverrideFor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies only to the skill the learner picked', () => {
    setTodayGoal({ skill: 'speaking', target: 30 }, MONDAY);

    expect(goalOverrideFor('speaking', MONDAY)).toBe(30);
    expect(goalOverrideFor('reading', MONDAY)).toBeUndefined();
  });

  it('is undefined when nothing was chosen', () => {
    expect(goalOverrideFor('writing', MONDAY)).toBeUndefined();
  });
});
