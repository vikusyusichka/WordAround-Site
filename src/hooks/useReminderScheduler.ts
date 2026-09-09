/* Keeps the practice reminders armed for as long as the app is open, and
   re-arms them whenever the settings or the interface language change (the
   notification text is translated, so a language switch has to re-arm too).

   Mounted once, in the signed-in layout route — reminders are a property of
   the session, not of any one screen. */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { startReminderScheduler } from '@/lib/webNotifications';
import { usePreferences } from '@/stores/preferencesStore';

export const useReminderScheduler = (): void => {
  const { t, i18n } = useTranslation();
  const dailyReminderEnabled = usePreferences((s) => s.dailyReminderEnabled);
  const dailyReminderTime = usePreferences((s) => s.dailyReminderTime);
  const weeklySummaryEnabled = usePreferences((s) => s.weeklySummaryEnabled);
  const streakAlertsEnabled = usePreferences((s) => s.streakAlertsEnabled);

  const language = i18n.resolvedLanguage;

  useEffect(() => {
    return startReminderScheduler(
      {
        /* Theme and avatar colour play no part in scheduling; the scheduler
           only reads the notification fields. */
        theme: 'system',
        avatarColor: 'blue',
        dailyReminderEnabled,
        dailyReminderTime,
        weeklySummaryEnabled,
        streakAlertsEnabled,
      },
      {
        dailyTitle: t('profile.notifications.dailyPushTitle'),
        dailyBody: t('profile.notifications.dailyPushBody'),
        weeklyTitle: t('profile.notifications.weeklyPushTitle'),
        weeklyBody: t('profile.notifications.weeklyPushBody'),
      },
    );
  }, [
    dailyReminderEnabled,
    dailyReminderTime,
    weeklySummaryEnabled,
    streakAlertsEnabled,
    language,
    t,
  ]);
};
