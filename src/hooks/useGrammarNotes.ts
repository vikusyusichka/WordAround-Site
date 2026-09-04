/* Grammar-note data hooks (TanStack Query). Notes are a subcollection of a
   topic; every mutation that changes how many notes a topic holds re-derives
   notesCount from the notes actually in Firestore (iOS derives it from the
   loaded list too — never from a cached counter ± 1). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as noteService from '@/lib/grammarNoteService';
import * as reviewService from '@/lib/grammarReviewService';
import * as topicService from '@/lib/grammarTopicService';
import { saveQuickNote, type QuickNoteDraft } from '@/lib/grammarQuickNoteService';
import {
  FIRST_REVIEW_INTERVAL_MS,
  makeReviewItem,
  reviewItemIdForNote,
} from '@/lib/grammarReview';
import { grammarSettingsSnapshot } from '@/stores/grammarSettingsStore';
import type { GrammarNote, GrammarNoteTopic } from '@/lib/models';
import { useUid } from '@/hooks/useFolders';

export const grammarNotesKey = (uid: string | null, topicId: string) =>
  ['grammarNotes', uid, topicId] as const;

export const useGrammarNotesQuery = (topicId: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarNotesKey(uid, topicId),
    queryFn: () => noteService.fetchNotes(uid as string, topicId),
    enabled: !!uid && topicId.length > 0,
  });
};

/** Every note across every topic, for searching the whole library rather than
    one topic at a time.

    Gated behind `enabled` because it fans out one read per topic: the notes
    home should not pay for that on every visit, only while someone is
    actually searching. */
export const grammarAllNotesKey = (uid: string | null, topicIds: string[]) =>
  ['grammarAllNotes', uid, [...topicIds].sort().join(',')] as const;

export const useAllNotesQuery = (topicIds: string[], enabled: boolean) => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarAllNotesKey(uid, topicIds),
    queryFn: async () => {
      const perTopic = await Promise.all(
        topicIds.map((topicId) => noteService.fetchNotes(uid as string, topicId).catch(() => [])),
      );
      return perTopic.flat();
    },
    enabled: !!uid && enabled && topicIds.length > 0,
    /* Typing a query re-renders on every keystroke; without this the fan-out
       would refire constantly while someone types. */
    staleTime: 60_000,
  });
};

/* Both note caches, since 'grammarNotes' is not a prefix of 'grammarAllNotes'
   and a note changed here has to change in a search result too. */
const invalidateNoteLists = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['grammarNotes'] });
  qc.invalidateQueries({ queryKey: ['grammarAllNotes'] });
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  invalidateNoteLists(qc);
  qc.invalidateQueries({ queryKey: ['grammarTopics'] });
  /* Opening/saving/deleting a note changes the review recommendation pool. */
  qc.invalidateQueries({ queryKey: ['grammarReview'] });
  qc.invalidateQueries({ queryKey: ['grammarReviewItems'] });
};

/* A note joins the review queue the moment it is written, unless the learner
   switched that off. Without this the spaced-review engine only ever held
   mistakes and failed quizzes — notes reached it solely through the editor's
   "Add to review" button, so a topic full of notes reviewed nothing.

   Best-effort on purpose: a note that saved must not report failure because
   its review card did not. */
const enrolInReview = async (uid: string, note: GrammarNote) => {
  if (!grammarSettingsSnapshot().autoAddNotesToReview) return;
  await reviewService
    .upsertReviewItem(
      makeReviewItem({
        id: reviewItemIdForNote(note.topicId, note.id),
        ownerUID: uid,
        sourceType: 'note',
        topicId: note.topicId,
        noteId: note.id,
        title: note.title,
        previewText: note.previewText,
        dueAt: Date.now() + FIRST_REVIEW_INTERVAL_MS,
      }),
    )
    .catch(() => {});
};

/** Re-read the topic's notes and write the real count back (best-effort). */
const syncNotesCount = async (uid: string, topicId: string) => {
  const notes = await noteService.fetchNotes(uid, topicId).catch(() => null);
  if (!notes) return;
  await topicService.setNotesCount(uid, topicId, notes.length).catch(() => {});
};

export const useCreateNote = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (note: GrammarNote) => {
      await noteService.createNote(note);
      await syncNotesCount(uid as string, note.topicId);
      await enrolInReview(uid as string, note);
      return note;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateNote = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (note: GrammarNote) => {
      const now = Date.now();
      const updated = { ...note, updatedAt: now, lastEditedAt: now };
      await noteService.updateNote(updated);
      /* Retitling a note must retitle its review card — but never reschedule
         it, and never enrol a note the learner kept out of review. */
      await reviewService
        .updateReviewItemMeta(uid as string, reviewItemIdForNote(updated.topicId, updated.id), {
          title: updated.title,
          previewText: updated.previewText,
        })
        .catch(() => {});
      return updated;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteNote = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async ({ topicId, id }: { topicId: string; id: string }) => {
      await noteService.deleteNote(uid as string, topicId, id);
      await syncNotesCount(uid as string, topicId);
      /* Otherwise the queue keeps serving a card for a note that is gone —
         buildCard drops it silently, so the learner just sees a short queue. */
      await reviewService
        .deleteReviewItem(uid as string, reviewItemIdForNote(topicId, id))
        .catch(() => {});
    },
    onSuccess: () => invalidate(qc),
  });
};

/** Pin / unpin, optimistic like the iOS `togglePinned`. */
export const useToggleNotePinned = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (note: GrammarNote) => {
      await noteService.setNotePinned(uid as string, note.topicId, note.id, !note.isPinned);
    },
    onSuccess: () => invalidateNoteLists(qc),
  });
};

/** Favorite / unfavorite (iOS `toggleFavorite`). */
export const useToggleNoteFavorite = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (note: GrammarNote) => {
      await noteService.setNoteFavorite(uid as string, note.topicId, note.id, !note.isFavorite);
    },
    onSuccess: () => invalidateNoteLists(qc),
  });
};

/** Persist a manual order for a topic's notes (iOS `moveNotes`). */
export const useReorderNotes = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async ({ topicId, orderedIds }: { topicId: string; orderedIds: string[] }) => {
      await noteService.updateNoteSortIndices(
        uid as string,
        topicId,
        orderedIds.map((id, sortIndex) => ({ id, sortIndex })),
      );
    },
    onSuccess: () => invalidateNoteLists(qc),
  });
};

/** Quick note (no editor) — iOS createQuickNote. */
export const useCreateQuickNote = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async ({ draft, topic }: { draft: QuickNoteDraft; topic: GrammarNoteTopic }) => {
      const note = await saveQuickNote(draft, { uid: uid as string, topic });
      await enrolInReview(uid as string, note);
      return note;
    },
    onSuccess: () => invalidate(qc),
  });
};
