/* Grammar-note data hooks (TanStack Query). Notes are a subcollection of a
   topic; every mutation that changes how many notes a topic holds re-derives
   notesCount from the notes actually in Firestore (iOS derives it from the
   loaded list too — never from a cached counter ± 1). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as noteService from '@/lib/grammarNoteService';
import * as topicService from '@/lib/grammarTopicService';
import { saveQuickNote, type QuickNoteDraft } from '@/lib/grammarQuickNoteService';
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

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['grammarNotes'] });
  qc.invalidateQueries({ queryKey: ['grammarTopics'] });
  /* Opening/saving/deleting a note changes the review recommendation pool. */
  qc.invalidateQueries({ queryKey: ['grammarReview'] });
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
      return note;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: GrammarNote) => {
      const now = Date.now();
      const updated = { ...note, updatedAt: now, lastEditedAt: now };
      await noteService.updateNote(updated);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarNotes'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarNotes'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarNotes'] }),
  });
};

/** Quick note (no editor) — iOS createQuickNote. */
export const useCreateQuickNote = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: ({ draft, topic }: { draft: QuickNoteDraft; topic: GrammarNoteTopic }) =>
      saveQuickNote(draft, { uid: uid as string, topic }),
    onSuccess: () => invalidate(qc),
  });
};
