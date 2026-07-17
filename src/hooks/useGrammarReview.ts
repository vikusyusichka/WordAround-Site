/* Review data hooks. The queue query mirrors iOS: fetch due manual items
   from Firestore, fall back to localStorage recommendations, pre-fetch the
   referenced notes, then run the pure buildReviewQueue. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as reviewService from '@/lib/grammarReviewService';
import * as noteService from '@/lib/grammarNoteService';
import {
  recentlyEditedNotes,
  recentlyOpenedNotes,
  recommendationToReviewItem,
} from '@/lib/grammarRecommendations';
import { buildReviewQueue, type GrammarReviewQueue } from '@/lib/grammarReviewQueue';
import type { GrammarNote, GrammarReviewItem, GrammarReviewResult } from '@/lib/models';
import { useUid } from '@/hooks/useFolders';

export const grammarReviewKey = (uid: string | null) => ['grammarReview', uid] as const;

const fetchNotesForItems = async (
  uid: string,
  items: GrammarReviewItem[],
): Promise<Map<string, GrammarNote>> => {
  const topicIds = [...new Set(items.map((i) => i.topicId).filter((t) => t.length > 0))];
  const perTopic = await Promise.all(
    topicIds.map((topicId) => noteService.fetchNotes(uid, topicId).catch(() => [])),
  );
  const byId = new Map<string, GrammarNote>();
  for (const notes of perTopic) for (const n of notes) byId.set(n.id, n);
  return byId;
};

const buildQueue = async (uid: string): Promise<GrammarReviewQueue> => {
  const manualItems = await reviewService.fetchDueReviewItems(uid);
  const recentlyOpened = recentlyOpenedNotes().map((r) => recommendationToReviewItem(r, uid));
  const recentlyEdited = recentlyEditedNotes().map((r) => recommendationToReviewItem(r, uid));

  /* Only the winning pool's notes are needed (strict precedence). */
  const selected =
    manualItems.length > 0 ? manualItems : recentlyOpened.length > 0 ? recentlyOpened : recentlyEdited;
  const notesById = await fetchNotesForItems(uid, selected);

  return buildReviewQueue({ manualItems, recentlyOpened, recentlyEdited, notesById });
};

export const useReviewQueueQuery = () => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarReviewKey(uid),
    queryFn: () => buildQueue(uid as string),
    enabled: !!uid,
    /* The queue is time-sensitive (dueAt); don't serve a stale one after
       ratings pushed items into the future. */
    staleTime: 30_000,
  });
};

export const useMarkReviewed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      result,
    }: {
      item: GrammarReviewItem;
      result: GrammarReviewResult;
    }) => reviewService.markReviewed(item, result),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grammarReview'] });
    },
  });
};
