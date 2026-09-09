/* The two numbers on the profile stat cards. The practice log is localStorage
   (synchronous), but listening sessions live in IndexedDB, so this goes through
   TanStack Query rather than reading on render. Refetches on focus, the way the
   home progress cards do, so finishing a session in another tab shows up. */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { fetchAllEntries } from '@/lib/dailyPracticeStats';
import { fetchListeningSessions } from '@/lib/listeningStore';
import { memberSinceLabel, practiceMinutes } from '@/lib/profileStats';
import { useSessionStore } from '@/stores/sessionStore';

export interface ProfileStats {
  practiceMinutes: number;
  memberSince: string;
}

export const useProfileStats = (): ProfileStats => {
  const { i18n } = useTranslation();
  const creationTime = useSessionStore((s) =>
    s.state.kind === 'authenticated' ? (s.state.user.metadata.creationTime ?? null) : null,
  );

  const { data } = useQuery({
    queryKey: ['profileStats'],
    queryFn: async () => practiceMinutes(fetchAllEntries(), await fetchListeningSessions()),
    refetchOnWindowFocus: true,
  });

  return {
    practiceMinutes: data ?? 0,
    memberSince: memberSinceLabel(creationTime, i18n.resolvedLanguage ?? 'en'),
  };
};
