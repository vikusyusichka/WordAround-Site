/* Grammar-topic data hooks (TanStack Query) — same shape as useFolders. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as topicService from '@/lib/grammarTopicService';
import type { GrammarNoteTopic } from '@/lib/models';
import { useUid } from '@/hooks/useFolders';

export const grammarTopicsKey = (uid: string | null) => ['grammarTopics', uid] as const;

export const useGrammarTopicsQuery = () => {
  const uid = useUid();
  return useQuery({
    queryKey: grammarTopicsKey(uid),
    queryFn: () => topicService.fetchTopics(uid as string),
    enabled: !!uid,
  });
};

export interface TopicInput {
  title: string;
  description: string;
  icon: string;
  colorHex: string;
}

export const useCreateTopic = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (input: TopicInput) => {
      const now = Date.now();
      const topic: GrammarNoteTopic = {
        id: crypto.randomUUID(),
        ownerUID: uid as string,
        title: input.title.trim(),
        description: input.description.trim(),
        icon: input.icon,
        colorHex: input.colorHex,
        notesCount: 0,
        isPinned: false,
        isMistakesTopic: false,
        createdAt: now,
        updatedAt: now,
      };
      await topicService.createTopic(topic);
      return topic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarTopics'] }),
  });
};

export const useUpdateTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topic: GrammarNoteTopic) => {
      const updated = { ...topic, updatedAt: Date.now() };
      await topicService.updateTopic(updated);
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarTopics'] }),
  });
};

export const useDeleteTopic = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: (id: string) => topicService.deleteTopic(id, uid as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarTopics'] }),
  });
};
