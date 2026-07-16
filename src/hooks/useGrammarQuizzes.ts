/* Grammar-quiz data hooks (TanStack Query). Quizzes are a subcollection of a
   note; create/delete also flip the parent note's hasQuiz flag (done in the
   service) so we invalidate the notes key too. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as quizService from '@/lib/grammarQuizService';
import type { GrammarNoteQuiz } from '@/lib/models';
import { useUid } from '@/hooks/useFolders';

export const grammarQuizzesKey = (uid: string | null, topicId: string, noteId: string) =>
  ['grammarQuizzes', uid, topicId, noteId] as const;

export const useGrammarQuizzesQuery = (topicId: string, noteId: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarQuizzesKey(uid, topicId, noteId),
    queryFn: () => quizService.fetchQuizzes(uid as string, topicId, noteId),
    enabled: !!uid && topicId.length > 0 && noteId.length > 0 && noteId !== 'new',
  });
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['grammarQuizzes'] });
  qc.invalidateQueries({ queryKey: ['grammarNotes'] });
};

export const useCreateQuiz = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quiz: GrammarNoteQuiz) => {
      await quizService.createQuiz(quiz);
      return quiz;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteQuiz = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async ({
      topicId,
      noteId,
      id,
    }: {
      topicId: string;
      noteId: string;
      id: string;
    }) => {
      await quizService.deleteQuiz(uid as string, topicId, noteId, id);
    },
    onSuccess: () => invalidate(qc),
  });
};
