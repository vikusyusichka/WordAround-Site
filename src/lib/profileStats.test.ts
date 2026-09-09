import { describe, expect, it } from 'vitest';

import type { DailyPracticeEntry } from '@/lib/dailyPracticeStats';
import type { ListeningPersistedSession } from '@/lib/listeningTypes';
import { initialsFrom, memberSinceLabel, practiceMinutes } from '@/lib/profileStats';

const entry = (
  skill: DailyPracticeEntry['skill'],
  value: number,
): DailyPracticeEntry => ({
  id: `${skill}-${value}`,
  skill,
  date: 0,
  createdAt: 0,
  value,
});

const session = (
  id: string,
  elapsedSeconds: number,
  status: ListeningPersistedSession['status'] = 'completed',
): ListeningPersistedSession =>
  ({
    id,
    modeID: 'fromText',
    title: 'x',
    languageId: 'en',
    level: 'a1',
    createdAt: 0,
    updatedAt: 0,
    durationSeconds: elapsedSeconds,
    elapsedSeconds,
    progress: 1,
    playbackPosition: 0,
    voiceSpeed: 'normal',
    voiceType: 'default',
    showTextWhileListening: true,
    addQuestions: false,
    questions: [],
    selectedAnswers: {},
    status,
  }) as ListeningPersistedSession;

describe('initialsFrom', () => {
  it('takes the first letters of the first two words of the name', () => {
    expect(initialsFrom('Anna Kovalenko', 'a@b.com')).toBe('AK');
  });

  it('stops at two letters even for a longer name', () => {
    expect(initialsFrom('Anna Maria Kovalenko', 'a@b.com')).toBe('AM');
  });

  it('falls back to the email, splitting on . and @ as well as spaces', () => {
    expect(initialsFrom(null, 'anna.kovalenko@mail.com')).toBe('AK');
    expect(initialsFrom('   ', 'zoe@mail.com')).toBe('ZM');
  });

  it('is empty when there is nothing to take initials from', () => {
    expect(initialsFrom(null, '')).toBe('');
  });
});

describe('practiceMinutes', () => {
  it('adds speaking and reading seconds and floors to whole minutes', () => {
    expect(practiceMinutes([entry('speaking', 90), entry('reading', 45)], [])).toBe(2);
  });

  it('ignores writing, which is counted in words rather than seconds', () => {
    expect(practiceMinutes([entry('speaking', 60), entry('writing', 5000)], [])).toBe(1);
  });

  it('adds completed listening sessions only', () => {
    const sessions = [session('a', 120), session('b', 600, 'inProgress')];
    expect(practiceMinutes([], sessions)).toBe(2);
  });

  it('counts a repeated listening session id once', () => {
    expect(practiceMinutes([], [session('a', 120), session('a', 120)])).toBe(2);
  });

  it('is zero with nothing recorded', () => {
    expect(practiceMinutes([], [])).toBe(0);
  });
});

describe('memberSinceLabel', () => {
  it('formats the creation date as a short month and year', () => {
    expect(memberSinceLabel('2025-09-14T10:00:00Z', 'en')).toMatch(/Sep(tember)?\s*2025/);
  });

  it('follows the interface language', () => {
    expect(memberSinceLabel('2025-09-14T10:00:00Z', 'uk')).toContain('2025');
    expect(memberSinceLabel('2025-09-14T10:00:00Z', 'uk')).not.toMatch(/Sep/);
  });

  it('shows a dash when there is no usable date', () => {
    expect(memberSinceLabel(null, 'en')).toBe('—');
    expect(memberSinceLabel(undefined, 'en')).toBe('—');
    expect(memberSinceLabel('not a date', 'en')).toBe('—');
  });
});
