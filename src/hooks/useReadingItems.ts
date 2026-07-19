/* Reading-item data hooks (TanStack Query) — same shape as useGrammarNotes. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as storage from '@/lib/readingStorageService';
import type { ReadingLibraryItem } from '@/lib/models';
import { useUid } from '@/hooks/useFolders';

export const readingItemsKey = (uid: string | null, modeID?: string) =>
  ['readingItems', uid, modeID ?? 'all'] as const;

export const useReadingItemsQuery = (modeID?: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: readingItemsKey(uid, modeID),
    queryFn: () => storage.fetchReadingItems(uid as string, modeID),
    enabled: !!uid,
  });
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['readingItems'] });
};

export const useSaveReadingItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ReadingLibraryItem) => {
      await storage.saveReadingItem(item);
      return item;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useRenameReadingItem = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      storage.renameReadingItem(uid as string, id, title),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteReadingItem = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: (id: string) => storage.deleteReadingItem(uid as string, id),
    onSuccess: () => invalidate(qc),
  });
};
