/* The three derived values the profile header shows — ports of the matching
   parts of Features/Profile/ViewModels/ProfileViewModel.swift. Pure on
   purpose: the profile screen just renders what these return, and the numbers
   are the kind of thing that quietly drifts, so they are unit-tested. */
import type { DailyPracticeEntry } from '@/lib/dailyPracticeStats';
import type { ListeningPersistedSession } from '@/lib/listeningTypes';

/** ProfileViewModel.initials: up to two letters, from the display name when
    there is one, otherwise from the email. `.` and `@` split like whitespace,
    so "anna.kovalenko@mail.com" gives "AK" rather than "A". */
export const initialsFrom = (displayName: string | null | undefined, email: string): string => {
  const name = (displayName ?? '').trim();
  const source = name.length > 0 ? name : email;
  return source
    .split(/[\s.@]+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

/** ProfileViewModel.loadSummaryStats: speaking + reading seconds from the
    daily log, plus the seconds of every COMPLETED listening session, floored to
    whole minutes. Writing is measured in words, so it is deliberately left out.
    Listening sessions are de-duplicated by id, as iOS does. */
export const practiceMinutes = (
  entries: DailyPracticeEntry[],
  listeningSessions: ListeningPersistedSession[],
): number => {
  const practiceSeconds = entries
    .filter((entry) => entry.skill === 'speaking' || entry.skill === 'reading')
    .reduce((total, entry) => total + entry.value, 0);

  const seen = new Set<string>();
  const listeningSeconds = listeningSessions.reduce((total, session) => {
    if (session.status !== 'completed' || seen.has(session.id)) return total;
    seen.add(session.id);
    return total + session.elapsedSeconds;
  }, 0);

  return Math.floor((practiceSeconds + listeningSeconds) / 60);
};

/** "Member since" — iOS formats the account's creation date as "MMM yyyy".
    Here the month name follows the interface language, so a Ukrainian reader
    gets "вер 2025" rather than "Sep 2025". */
export const memberSinceLabel = (
  creationTime: string | number | Date | null | undefined,
  locale: string,
): string => {
  if (creationTime === null || creationTime === undefined || creationTime === '') return '—';
  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
  } catch {
    /* An unknown locale tag must not take the whole card down. */
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
  }
};
