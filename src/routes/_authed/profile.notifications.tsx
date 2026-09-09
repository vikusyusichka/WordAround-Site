/* /profile/notifications — port of NotificationsView.swift.

   The three settings, their defaults and the permission handling are the iOS
   ones. What differs is honesty about what the web can deliver: iOS schedules
   through UNUserNotificationCenter and keeps firing with the app closed, while
   here the reminders run on timers in the page and only fire while the tab (or
   the installed app) is open. Real background push needs FCM and a server —
   its own phase. The note under the list says exactly that rather than letting
   the switches imply more than they do. */
import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { SurfaceCard } from '@/components/primitives/SurfaceCard';
import { ProfileSubScreenLayout } from '@/components/profile/ProfileSubScreenLayout';
import { ToggleSwitch } from '@/components/profile/ToggleSwitch';
import {
  permissionState,
  reminderTimeFromInput,
  reminderTimeToInput,
  requestPermission,
  type NotificationPermissionState,
} from '@/lib/webNotifications';
import { usePreferences, type NotificationToggle } from '@/stores/preferencesStore';

export const Route = createFileRoute('/_authed/profile/notifications')({
  component: NotificationsScreen,
});

function NotificationsScreen() {
  const { t } = useTranslation();
  const preferences = usePreferences();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');

  useEffect(() => setPermission(permissionState()), []);

  const isBlocked = permission === 'denied' || permission === 'unsupported';

  /* iOS handleToggleChange: turning anything ON asks for permission first, and
     a refusal switches everything back off rather than leaving switches that
     promise notifications the browser will never show. */
  const handleToggle = async (key: NotificationToggle, next: boolean) => {
    if (!next) {
      preferences.setNotification(key, false);
      return;
    }

    let state = permissionState();
    if (state === 'default') state = await requestPermission();
    setPermission(state);

    if (state !== 'granted') {
      preferences.setNotification('dailyReminderEnabled', false);
      preferences.setNotification('weeklySummaryEnabled', false);
      preferences.setNotification('streakAlertsEnabled', false);
      return;
    }

    preferences.setNotification(key, true);
  };

  return (
    <ProfileSubScreenLayout
      active="notifications"
      title={t('profile.notifications.title')}
      subtitle={t('profile.notifications.subtitle')}
    >
      {isBlocked && (
        <div className="flex flex-col gap-2.5 rounded-[18px] border border-(--color-profile-warn-border)/40 bg-(--color-profile-warn-bg) p-4">
          <p className="flex items-start gap-2.5 text-[13px] leading-[1.5] font-semibold text-(--color-primary-blue-dark)">
            <Icon
              name="bell.slash.fill"
              aria-hidden
              className="mt-px size-[14px] shrink-0 text-(--color-profile-warn-icon)"
            />
            {permission === 'unsupported'
              ? t('profile.notifications.unsupported')
              : t('profile.notifications.permissionDenied')}
          </p>
        </div>
      )}

      {/* Daily reminder — the only one with a time to pick. */}
      <SurfaceCard>
        <div className="flex flex-col gap-3.5 p-4">
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--color-primary-blue) 14%, transparent)',
              }}
            >
              <Icon name="alarm.fill" className="size-4 text-(--color-primary-blue)" />
            </span>

            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
                {t('profile.notifications.dailyReminder')}
              </span>
              <span className="text-[12px] leading-[1.45] font-semibold text-(--color-text-secondary)">
                {t('profile.notifications.dailyReminderHint')}
              </span>
            </span>

            <span className="ml-auto">
              <ToggleSwitch
                checked={preferences.dailyReminderEnabled}
                disabled={permission === 'unsupported'}
                label={t('profile.notifications.dailyReminder')}
                onChange={(next) => void handleToggle('dailyReminderEnabled', next)}
              />
            </span>
          </div>

          {preferences.dailyReminderEnabled && (
            <>
              <span
                aria-hidden
                className="h-px"
                style={{
                  background: 'color-mix(in srgb, var(--color-primary-blue) 8%, transparent)',
                }}
              />
              <label className="flex items-center gap-2.5">
                <Icon
                  name="clock.fill"
                  aria-hidden
                  className="size-[13px] shrink-0 text-(--color-primary-blue)/75"
                />
                <span className="text-[13px] font-semibold text-(--color-primary-blue-dark)">
                  {t('profile.notifications.reminderTime')}
                </span>
                <input
                  type="time"
                  value={reminderTimeToInput(preferences.dailyReminderTime)}
                  onChange={(e) => {
                    const parsed = reminderTimeFromInput(e.target.value);
                    if (parsed) preferences.setReminderTime(parsed);
                  }}
                  className="ml-auto h-10 rounded-xl border border-(--color-auth-field-border) bg-white px-3 text-[14px] font-bold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
                />
              </label>
            </>
          )}
        </div>
      </SurfaceCard>

      <ToggleCard
        icon="calendar.badge.clock"
        title={t('profile.notifications.weeklySummary')}
        hint={t('profile.notifications.weeklySummaryHint')}
        checked={preferences.weeklySummaryEnabled}
        disabled={permission === 'unsupported'}
        onChange={(next) => void handleToggle('weeklySummaryEnabled', next)}
      />

      <ToggleCard
        icon="flame.fill"
        title={t('profile.notifications.streakAlerts')}
        hint={t('profile.notifications.streakAlertsHint')}
        checked={preferences.streakAlertsEnabled}
        disabled={permission === 'unsupported'}
        onChange={(next) => void handleToggle('streakAlertsEnabled', next)}
      />

      <p className="flex items-start gap-2.5 rounded-2xl bg-(--color-primary-blue)/[0.06] px-3.5 py-3 text-[12px] leading-[1.6] font-semibold text-(--color-text-secondary)">
        <Icon
          name="info.circle.fill"
          aria-hidden
          className="mt-px size-[13px] shrink-0 text-(--color-primary-blue)/70"
        />
        {t('profile.notifications.backgroundNote')}
      </p>
    </ProfileSubScreenLayout>
  );
}

interface ToggleCardProps {
  icon: string;
  title: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

const ToggleCard = ({ icon, title, hint, checked, disabled, onChange }: ToggleCardProps) => (
  <SurfaceCard>
    <div className="flex items-center gap-3.5 p-4">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-primary-blue) 14%, transparent)' }}
      >
        <Icon name={icon} className="size-4 text-(--color-primary-blue)" />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{title}</span>
        <span className="text-[12px] leading-[1.45] font-semibold text-(--color-text-secondary)">
          {hint}
        </span>
      </span>

      <span className="ml-auto">
        <ToggleSwitch checked={checked} disabled={disabled} label={title} onChange={onChange} />
      </span>
    </div>
  </SurfaceCard>
);
