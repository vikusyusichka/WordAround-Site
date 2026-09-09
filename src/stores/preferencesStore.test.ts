import { beforeEach, describe, expect, it } from 'vitest';

import {
  PREFERENCES_DEFAULTS,
  PREFERENCE_KEYS,
  usePreferences,
} from '@/stores/preferencesStore';

/* The store reads localStorage once at module load, so each test writes the
   keys it wants and then re-seeds the store the way a fresh load would. */
const reload = () => {
  usePreferences.setState({ ...PREFERENCES_DEFAULTS });
};

beforeEach(() => {
  localStorage.clear();
  reload();
});

describe('defaults', () => {
  it('matches the iOS UserPreferencesStore defaults', () => {
    expect(PREFERENCES_DEFAULTS).toEqual({
      theme: 'system',
      avatarColor: 'blue',
      dailyReminderEnabled: false,
      dailyReminderTime: { hour: 9, minute: 0 },
      weeklySummaryEnabled: false,
      streakAlertsEnabled: false,
    });
  });
});

describe('persistence', () => {
  it('writes the theme under the iOS UserDefaults key', () => {
    usePreferences.getState().setTheme('light');
    expect(localStorage.getItem(PREFERENCE_KEYS.theme)).toBe('light');
    expect(usePreferences.getState().theme).toBe('light');
  });

  it('writes the avatar colour under the iOS key', () => {
    usePreferences.getState().setAvatarColor('pink');
    expect(localStorage.getItem(PREFERENCE_KEYS.avatarColor)).toBe('pink');
  });

  it('stores the reminder hour and minute separately, as iOS does', () => {
    usePreferences.getState().setReminderTime({ hour: 21, minute: 30 });
    expect(localStorage.getItem(PREFERENCE_KEYS.dailyReminderHour)).toBe('21');
    expect(localStorage.getItem(PREFERENCE_KEYS.dailyReminderMinute)).toBe('30');
    expect(usePreferences.getState().dailyReminderTime).toEqual({ hour: 21, minute: 30 });
  });

  it('stores each notification switch as a string boolean', () => {
    usePreferences.getState().setNotification('weeklySummaryEnabled', true);
    expect(localStorage.getItem(PREFERENCE_KEYS.weeklySummaryEnabled)).toBe('true');
    expect(usePreferences.getState().weeklySummaryEnabled).toBe(true);
  });
});

describe('resetToDefaults', () => {
  it('clears everything back to the defaults, in state and in storage', () => {
    const store = usePreferences.getState();
    store.setTheme('light');
    store.setAvatarColor('green');
    store.setNotification('dailyReminderEnabled', true);
    store.setReminderTime({ hour: 22, minute: 15 });

    usePreferences.getState().resetToDefaults();

    expect(usePreferences.getState()).toMatchObject(PREFERENCES_DEFAULTS);
    expect(localStorage.getItem(PREFERENCE_KEYS.theme)).toBe('system');
    expect(localStorage.getItem(PREFERENCE_KEYS.dailyReminderEnabled)).toBe('false');
    expect(localStorage.getItem(PREFERENCE_KEYS.dailyReminderHour)).toBe('9');
  });
});
