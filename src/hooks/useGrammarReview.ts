/* Review data hooks. The queue query mirrors iOS: fetch due manual items
   from Firestore, fall back to localStorage recommendations, pre-fetch the
   referenced notes, then run the pure buildReviewQueue. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as reviewService from '@/lib/grammarReviewService';
import { recordPractice } from '@/lib/dailyPracticeStats';
import * as noteService from '@/lib/grammarNoteService';
import * as quizService from '@/lib/grammarQuizService';
import {
  recentlyEditedNotes,
  recentlyOpenedNotes,
  recommendationToReviewItem,
} from '@/lib/grammarRecommendations';
import { buildReviewQueue, type GrammarReviewQueue } from '@/lib/grammarReviewQueue';
import { makeReviewItem, reviewItemIdForNote } from '@/lib/grammarReview';
import type {
  GrammarNote,
  GrammarNoteQuiz,
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

/* Only quiz-sourced items need their quiz; a queue of plain notes does no
   extra reads at all. Failures are swallowed per note — a missing quiz costs
   that card its original question, not the whole session. */
const fetchQuizzesForItems = async (
  uid: string,
  items: GrammarReviewItem[],
): Promise<Map<string, GrammarNoteQuiz>> => {
  const targets = items.filter(
    (i) => i.sourceType === 'quiz' && i.quizId && i.noteId && i.topicId.length > 0,
  );
  if (targets.length === 0) return new Map();

  /* One read per note, not per quiz: fetchQuizzes returns a note's quizzes
     together, and several failed quizzes can share a note. Deduped through
     nested maps rather than a joined string key — document ids are opaque, so
     any separator chosen here could turn up inside one. */
  const notesByTopic = new Map<string, Set<string>>();
  for (const item of targets) {
    const forTopic = notesByTopic.get(item.topicId) ?? new Set<string>();
    forTopic.add(item.noteId as string);
    notesByTopic.set(item.topicId, forTopic);
  }

  const perNote = await Promise.all(
    [...notesByTopic].flatMap(([topicId, noteIds]) =>
      [...noteIds].map((noteId) => quizService.fetchQuizzes(uid, topicId, noteId).catch(() => [])),
    ),
  );
  return new Map(perNote.flat().map((quiz) => [quiz.id, quiz]));
};

const buildQueue = async (uid: string): Promise<GrammarReviewQueue> => {
  const manualItems = await reviewService.fetchDueReviewItems(uid);
  const recentlyOpened = recentlyOpenedNotes().map((r) => recommendationToReviewItem(r, uid));
  const recentlyEdited = recentlyEditedNotes().map((r) => recommendationToReviewItem(r, uid));

  /* Only the winning pool's notes are needed (strict precedence). */
  const selected =
    manualItems.length > 0 ? manualItems : recentlyOpened.length > 0 ? recentlyOpened : recentlyEdited;
  const [notesById, quizzesById] = await Promise.all([
    fetchNotesForItems(uid, selected),
    fetchQuizzesForItems(uid, selected),
  ]);

  return buildReviewQueue({
    manualItems,
    recentlyOpened,
    recentlyEdited,
    notesById,
    quizzesById,
  });
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

/** Every review item, keyed by id, so a note list can show which of its notes
    are in review and when each is next due. Keyed by id rather than noteId
    because a note and a quiz on that note are separate items. */
export const grammarReviewItemsKey = (uid: string | null) => ['grammarReviewItems', uid] as const;

export const useReviewItemsQuery = () => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarReviewItemsKey(uid),
    queryFn: async () => {
      const items = await reviewService.fetchAllReviewItems(uid as string);
      return new Map(items.map((item) => [item.id, item]));
    },
    enabled: !!uid,
  });
};

/** Take a note out of spaced review. Until this existed the queue was a
    one-way door: notes could be added and never removed. */
export const useRemoveNoteFromReview = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: (note: Pick<GrammarNote, 'id' | 'topicId'>) =>
      reviewService.deleteReviewItem(uid as string, reviewItemIdForNote(note.topicId, note.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grammarReview'] });
      qc.invalidateQueries({ queryKey: ['grammarReviewItems'] });
      qc.invalidateQueries({ queryKey: ['grammarHighlights'] });
    },
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
      qc.invalidateQueries({ queryKey: ['grammarReviewItems'] });
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
      /* A rating moves dueAt, so the "due in 3 days" pills go stale too. */
      qc.invalidateQueries({ queryKey: ['grammarReviewItems'] });
      qc.invalidateQueries({ queryKey: ['grammarHighlights'] });
    },
  });
};
