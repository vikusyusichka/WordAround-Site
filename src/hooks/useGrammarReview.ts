/* Review data hooks. The queue query mirrors iOS: fetch due manual items
   from Firestore, fall back to localStorage recommendations, pre-fetch the
   referenced notes, then run the pure buildReviewQueue. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as reviewService from '@/lib/grammarReviewService';
import { recordPractice } from '@/lib/dailyPracticeStats';
import * as noteService from '@/lib/grammarNoteService';
import {
  recentlyEditedNotes,
  recentlyOpenedNotes,
  recommendationToReviewItem,
} from '@/lib/grammarRecommendations';
import { buildReviewQueue, type GrammarReviewQueue } from '@/lib/grammarReviewQueue';
import { makeReviewItem, reviewItemIdForNote } from '@/lib/grammarReview';
import type {
  GrammarNote,
  GrammarReviewItem,
  GrammarReviewResult,
  GrammarReviewSourceType,
} from '@/lib/models';
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
    /* The queue is time-sensitive: dueAt moves after every rating, and the
       recommendation pool changes the moment a note is opened or edited. Note
       mutations invalidate this key, so caching it past the current render
       only shows a stale "all caught up". */
    staleTime: 0,
  });
};

/** "Mistakes to fix" / "Weak quiz areas" rows on the Notes home — iOS
    GrammarReviewViewModel.loadHighlights. */
export const grammarHighlightsKey = (uid: string | null, sourceType: GrammarReviewSourceType) =>
  ['grammarHighlights', uid, sourceType] as const;

export const useReviewHighlightsQuery = (sourceType: GrammarReviewSourceType, max = 5) => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarHighlightsKey(uid, sourceType),
    queryFn: () => reviewService.fetchItemsBySource(uid as string, sourceType, max),
    enabled: !!uid,
  });
};

/** "Add to review" from the note editor (iOS GrammarNoteEditorViewModel
    .addToReview) - an upsert, so re-adding never resets learning history. */
export const useAddNoteToReview = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: (note: GrammarNote) =>
      reviewService.upsertReviewItem(
        makeReviewItem({
          id: reviewItemIdForNote(note.topicId, note.id),
          ownerUID: uid as string,
          sourceType: 'note',
          topicId: note.topicId,
          noteId: note.id,
          title: note.title,
          previewText: note.previewText,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grammarReview'] });
      qc.invalidateQueries({ queryKey: ['grammarHighlights'] });
    },
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
      /* One unit per reviewed card, as iOS does in the review session. */
      recordPractice({ skill: 'writing', value: 1, sourceModeID: 'grammar-notes' });
      qc.invalidateQueries({ queryKey: ['grammarReview'] });
      qc.invalidateQueries({ queryKey: ['grammarHighlights'] });
    },
  });
};
