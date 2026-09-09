import { describe, expect, it } from 'vitest';

import { PREFERENCES_DEFAULTS, type Preferences } from '@/stores/preferencesStore';
import {
  enabledCount,
  msUntilNextDaily,
  msUntilNextWeekly,
  reminderTimeFromInput,
  reminderTimeToInput,
} from '@/lib/webNotifications';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const prefs = (overrides: Partial<Preferences> = {}): Preferences => ({
  ...PREFERENCES_DEFAULTS,
  ...overrides,
});

describe('enabledCount', () => {
  it('is null when nothing is on, so the row shows no trailing value', () => {
    expect(enabledCount(prefs())).toBeNull();
  });

  it('counts the switches that are on', () => {
    expect(enabledCount(prefs({ dailyReminderEnabled: true }))).toBe(1);
    expect(
      enabledCount(
        prefs({
          dailyReminderEnabled: true,
          weeklySummaryEnabled: true,
          streakAlertsEnabled: true,
        }),
      ),
    ).toBe(3);
  });
});

describe('msUntilNextDaily', () => {
  it('waits until later today when the time is still ahead', () => {
    const now = new Date(2026, 0, 5, 8, 0, 0, 0);
    expect(msUntilNextDaily({ hour: 9, minute: 0 }, now)).toBe(HOUR);
  });

  it('rolls over to tomorrow when the time has passed', () => {
    const now = new Date(2026, 0, 5, 10, 0, 0, 0);
    expect(msUntilNextDaily({ hour: 9, minute: 0 }, now)).toBe(23 * HOUR);
  });

  it('rolls over when the time is exactly now, rather than firing instantly', () => {
    const now = new Date(2026, 0, 5, 9, 0, 0, 0);
    expect(msUntilNextDaily({ hour: 9, minute: 0 }, now)).toBe(DAY);
  });
});

describe('msUntilNextWeekly', () => {
  it('is the same as the daily wait when the next occurrence is already that weekday', () => {
    /* 2026-01-04 is a Sunday. */
    const now = new Date(2026, 0, 4, 8, 0, 0, 0);
    expect(msUntilNextWeekly(0, { hour: 19, minute: 0 }, now)).toBe(11 * HOUR);
  });

  it('adds whole days to reach the requested weekday', () => {
    /* Monday 2026-01-05, 20:00 — next 19:00 is Tuesday, so Sunday is 5 more days. */
    const now = new Date(2026, 0, 5, 20, 0, 0, 0);
    expect(msUntilNextWeekly(0, { hour: 19, minute: 0 }, now)).toBe(23 * HOUR + 5 * DAY);
  });
});

describe('reminder time <-> input value', () => {
  it('pads to the HH:mm an <input type="time"> expects', () => {
    expect(reminderTimeToInput({ hour: 9, minute: 0 })).toBe('09:00');
    expect(reminderTimeToInput({ hour: 21, minute: 5 })).toBe('21:05');
  });

  it('parses a valid value back', () => {
    expect(reminderTimeFromInput('07:45')).toEqual({ hour: 7, minute: 45 });
    expect(reminderTimeFromInput(' 7:45 ')).toEqual({ hour: 7, minute: 45 });
  });

  it('returns null for the empty or out-of-range values the field can report', () => {
    expect(reminderTimeFromInput('')).toBeNull();
    expect(reminderTimeFromInput('25:00')).toBeNull();
    expect(reminderTimeFromInput('09:75')).toBeNull();
  });
});
