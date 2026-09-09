/* Practice reminders on the web.

   iOS hands its three switches to UNUserNotificationCenter, which keeps firing
   after the app is closed. The browser's equivalent — Web Push through a
   service worker — needs FCM and a server, and that is its own phase. What is
   here is the honest subset: the same three settings, the same defaults, a real
   permission prompt, and reminders that fire while the tab (or the installed
   PWA) is open. The notifications screen says so in plain words rather than
   pretending otherwise.

   The scheduling maths is pure and tested; only `startReminderScheduler` has
   timers in it. */
import {
  WEEKLY_SUMMARY_TIME,
  WEEKLY_SUMMARY_WEEKDAY,
  type Preferences,
  type ReminderTime,
} from '@/stores/preferencesStore';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const permissionState = (): NotificationPermissionState =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export const requestPermission = async (): Promise<NotificationPermissionState> => {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    /* Safari once threw here for the callback-style API; treat as refused. */
    return 'denied';
  }
};

/** How many of the three switches are on — the trailing value on the profile
    row. `null` at zero, so the row shows nothing rather than "0" (iOS). */
export const enabledCount = (prefs: Preferences): number | null => {
  const count = [
    prefs.dailyReminderEnabled,
    prefs.weeklySummaryEnabled,
    prefs.streakAlertsEnabled,
  ].filter(Boolean).length;
  return count === 0 ? null : count;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Milliseconds until the next occurrence of `time`. A time that has already
    passed today (or is exactly now) lands tomorrow. */
export const msUntilNextDaily = (time: ReminderTime, now: Date = new Date()): number => {
  const next = new Date(now);
  next.setHours(time.hour, time.minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

/** Same, but on a given weekday (0 = Sunday, matching Date.getDay). */
export const msUntilNextWeekly = (
  weekday: number,
  time: ReminderTime,
  now: Date = new Date(),
): number => {
  const daily = msUntilNextDaily(time, now);
  const dayOfNextDaily = new Date(now.getTime() + daily).getDay();
  const daysAhead = (weekday - dayOfNextDaily + 7) % 7;
  return daily + daysAhead * DAY_MS;
};

export interface ReminderCopy {
  dailyTitle: string;
  dailyBody: string;
  weeklyTitle: string;
  weeklyBody: string;
}

/** Arms the enabled reminders and returns a cancel function. Each one re-arms
    itself after firing, so a tab left open overnight keeps working; the caller
    re-runs this whenever the settings change. */
export const startReminderScheduler = (
  prefs: Preferences,
  copy: ReminderCopy,
): (() => void) => {
  if (permissionState() !== 'granted') return () => {};

  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const show = (title: string, body: string) => {
    try {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    } catch {
      /* Some browsers only allow notifications from a service worker; the
         settings still persist, they just don't pop while the tab is open. */
    }
  };

  const arm = (delay: number, title: string, body: string, next: () => number) => {
    if (cancelled) return;
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        show(title, body);
        arm(next(), title, body, next);
      }, delay),
    );
  };

  if (prefs.dailyReminderEnabled) {
    arm(
      msUntilNextDaily(prefs.dailyReminderTime),
      copy.dailyTitle,
      copy.dailyBody,
      () => msUntilNextDaily(prefs.dailyReminderTime),
    );
  }

  if (prefs.weeklySummaryEnabled) {
    arm(
      msUntilNextWeekly(WEEKLY_SUMMARY_WEEKDAY, WEEKLY_SUMMARY_TIME),
      copy.weeklyTitle,
      copy.weeklyBody,
      () => msUntilNextWeekly(WEEKLY_SUMMARY_WEEKDAY, WEEKLY_SUMMARY_TIME),
    );
  }

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
};

/** "09:00" for an <input type="time"> value. */
export const reminderTimeToInput = (time: ReminderTime): string =>
  `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

/** Parses that input back; returns null for the empty/invalid value the field
    reports while it is being edited. */
export const reminderTimeFromInput = (value: string): ReminderTime | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
};
