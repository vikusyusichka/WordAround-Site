/* Account preferences — web port of Core/Preferences/UserPreferencesStore.swift.
   Zustand + localStorage, the same shape the grammar settings store already
   uses (src/stores/grammarSettingsStore.ts). Storage keys and defaults are
   copied verbatim from the iOS UserDefaults keys so the two stores stay
   comparable when reading either codebase.

   One deliberate omission: iOS keeps `preferences.language` here too. On the
   web the interface language already lives in i18next (`wa.lang`, see
   src/lib/i18n.ts), and two sources of truth for one setting is how a language
   picker starts disagreeing with the language on screen. */
import { create } from 'zustand';

import { applyTheme, isAppearanceTheme, type AppearanceTheme } from '@/lib/appearance';
import {
  DEFAULT_AVATAR_COLOR,
  isAvatarColorId,
  type ProfileAvatarColorId,
} from '@/lib/profileAvatarColor';

export interface ReminderTime {
  hour: number;
  minute: number;
}

/** iOS ReminderTime.defaultMorning. */
export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 9, minute: 0 };
/** Sunday 19:00 — the weekly-summary slot iOS schedules. */
export const WEEKLY_SUMMARY_WEEKDAY = 0;
export const WEEKLY_SUMMARY_TIME: ReminderTime = { hour: 19, minute: 0 };
/** 21:30 daily — the streak-alert slot iOS schedules. Late enough that the
    nudge only lands if the day really is about to be missed. */
export const STREAK_ALERT_TIME: ReminderTime = { hour: 21, minute: 30 };

export interface Preferences {
  theme: AppearanceTheme;
  avatarColor: ProfileAvatarColorId;
  dailyReminderEnabled: boolean;
  dailyReminderTime: ReminderTime;
  weeklySummaryEnabled: boolean;
  streakAlertsEnabled: boolean;
}

export const PREFERENCES_DEFAULTS: Preferences = {
  theme: 'system',
  avatarColor: DEFAULT_AVATAR_COLOR,
  dailyReminderEnabled: false,
  dailyReminderTime: DEFAULT_REMINDER_TIME,
  weeklySummaryEnabled: false,
  streakAlertsEnabled: false,
};

/** iOS UserDefaults keys, verbatim. */
export const PREFERENCE_KEYS = {
  theme: 'preferences.appearanceTheme',
  avatarColor: 'preferences.avatarColor',
  dailyReminderEnabled: 'preferences.notifications.dailyReminderEnabled',
  dailyReminderHour: 'preferences.notifications.dailyReminderHour',
  dailyReminderMinute: 'preferences.notifications.dailyReminderMinute',
  weeklySummaryEnabled: 'preferences.notifications.weeklySummaryEnabled',
  streakAlertsEnabled: 'preferences.notifications.streakAlertsEnabled',
} as const;

const readString = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    /* private mode / storage disabled — defaults are fine */
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* best-effort */
  }
};

const readBool = (key: string, fallback: boolean): boolean => {
  const raw = readString(key);
  return raw === null ? fallback : raw === 'true';
};

/** Out-of-range or non-numeric stored values fall back rather than producing a
    reminder at 99:99 that never fires. */
const readClock = (key: string, max: number, fallback: number): number => {
  const raw = readString(key);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
};

const readStored = (): Preferences => {
  const theme = readString(PREFERENCE_KEYS.theme);
  const avatarColor = readString(PREFERENCE_KEYS.avatarColor);
  return {
    theme: theme && isAppearanceTheme(theme) ? theme : PREFERENCES_DEFAULTS.theme,
    avatarColor:
      avatarColor && isAvatarColorId(avatarColor)
        ? avatarColor
        : PREFERENCES_DEFAULTS.avatarColor,
    dailyReminderEnabled: readBool(PREFERENCE_KEYS.dailyReminderEnabled, false),
    dailyReminderTime: {
      hour: readClock(PREFERENCE_KEYS.dailyReminderHour, 23, DEFAULT_REMINDER_TIME.hour),
      minute: readClock(PREFERENCE_KEYS.dailyReminderMinute, 59, DEFAULT_REMINDER_TIME.minute),
    },
    weeklySummaryEnabled: readBool(PREFERENCE_KEYS.weeklySummaryEnabled, false),
    streakAlertsEnabled: readBool(PREFERENCE_KEYS.streakAlertsEnabled, false),
  };
};

export type NotificationToggle =
  | 'dailyReminderEnabled'
  | 'weeklySummaryEnabled'
  | 'streakAlertsEnabled';

export const NOTIFICATION_TOGGLES: NotificationToggle[] = [
  'dailyReminderEnabled',
  'weeklySummaryEnabled',
  'streakAlertsEnabled',
];

interface PreferencesState extends Preferences {
  setTheme: (theme: AppearanceTheme) => void;
  setAvatarColor: (color: ProfileAvatarColorId) => void;
  setNotification: (key: NotificationToggle, value: boolean) => void;
  setReminderTime: (time: ReminderTime) => void;
  /** iOS resetToDefaults() — called after sign-out / account deletion. */
  resetToDefaults: () => void;
}

export const usePreferences = create<PreferencesState>((set) => ({
  ...readStored(),

  setTheme: (theme) => {
    write(PREFERENCE_KEYS.theme, theme);
    applyTheme(theme);
    set({ theme });
  },

  setAvatarColor: (avatarColor) => {
    write(PREFERENCE_KEYS.avatarColor, avatarColor);
    set({ avatarColor });
  },

  setNotification: (key, value) => {
    write(PREFERENCE_KEYS[key], String(value));
    set({ [key]: value } as Pick<Preferences, NotificationToggle>);
  },

  setReminderTime: (dailyReminderTime) => {
    write(PREFERENCE_KEYS.dailyReminderHour, String(dailyReminderTime.hour));
    write(PREFERENCE_KEYS.dailyReminderMinute, String(dailyReminderTime.minute));
    set({ dailyReminderTime });
  },

  resetToDefaults: () => {
    write(PREFERENCE_KEYS.theme, PREFERENCES_DEFAULTS.theme);
    write(PREFERENCE_KEYS.avatarColor, PREFERENCES_DEFAULTS.avatarColor);
    write(PREFERENCE_KEYS.dailyReminderEnabled, 'false');
    write(PREFERENCE_KEYS.dailyReminderHour, String(DEFAULT_REMINDER_TIME.hour));
    write(PREFERENCE_KEYS.dailyReminderMinute, String(DEFAULT_REMINDER_TIME.minute));
    write(PREFERENCE_KEYS.weeklySummaryEnabled, 'false');
    write(PREFERENCE_KEYS.streakAlertsEnabled, 'false');
    applyTheme(PREFERENCES_DEFAULTS.theme);
    set({ ...PREFERENCES_DEFAULTS });
  },
}));

/** Snapshot for non-React callers (the reminder scheduler). */
export const preferencesSnapshot = (): Preferences => {
  const s = usePreferences.getState();
  return {
    theme: s.theme,
    avatarColor: s.avatarColor,
    dailyReminderEnabled: s.dailyReminderEnabled,
    dailyReminderTime: s.dailyReminderTime,
    weeklySummaryEnabled: s.weeklySummaryEnabled,
    streakAlertsEnabled: s.streakAlertsEnabled,
  };
};
