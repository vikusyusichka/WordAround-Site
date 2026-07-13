/* Grammar-note data hooks (TanStack Query). Notes are a subcollection of a
   topic; create/delete also keep the parent topic's notesCount roughly in
   sync + invalidate both query keys. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as noteService from '@/lib/grammarNoteService';
import * as topicService from '@/lib/grammarTopicService';
import type { GrammarNote } from '@/lib/models';
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
};

export const useCreateNote = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async ({ note, nextCount }: { note: GrammarNote; nextCount: number }) => {
      await noteService.createNote(note);
      await topicService.setNotesCount(uid as string, note.topicId, nextCount).catch(() => {});
      return note;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: GrammarNote) => {
      const updated = { ...note, updatedAt: Date.now() };
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
    mutationFn: async ({
      topicId,
      id,
      nextCount,
    }: {
      topicId: string;
      id: string;
      nextCount: number;
    }) => {
      await noteService.deleteNote(uid as string, topicId, id);
      await topicService.setNotesCount(uid as string, topicId, nextCount).catch(() => {});
    },
    onSuccess: () => invalidate(qc),
  });
};
