/* Grammar-topic data hooks (TanStack Query) — same shape as useFolders. */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { makeGrammarTopic } from '@/lib/grammarFactories';
import * as topicService from '@/lib/grammarTopicService';
import * as noteService from '@/lib/grammarNoteService';
import {
  noteFromTemplate,
  topicFromTemplate,
  topicTemplateWithoutQuizBlocks,
  type GrammarTopicTemplate,
} from '@/lib/grammarTemplates';
import type { GrammarNoteTopic } from '@/lib/models';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';
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
  languageCode?: string;
  languageName?: string;
}

export const useCreateTopic = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (input: TopicInput) => {
      const topic = makeGrammarTopic({
        ownerUID: uid as string,
        title: input.title.trim(),
        description: input.description.trim(),
        icon: input.icon,
        colorHex: input.colorHex,
        languageCode: input.languageCode,
        languageName: input.languageName,
      });
      await topicService.createTopic(topic);
      return topic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarTopics'] }),
  });
};

/* 4D4: create a topic + all its template notes (best-effort per note, like
   iOS createTopicFromTemplate — failures are skipped, notesCount reflects
   what actually saved). Quiz blocks are stripped when quick quizzes are off. */
export const useCreateTopicFromTemplate = () => {
  const qc = useQueryClient();
  const uid = useUid();
  const allowQuickQuizzes = useGrammarSettings((s) => s.allowQuickQuizzes);
  return useMutation({
    mutationFn: async (raw: GrammarTopicTemplate) => {
      const tpl = allowQuickQuizzes ? raw : topicTemplateWithoutQuizBlocks(raw);
      const topic = topicFromTemplate(tpl, { ownerUID: uid as string });
      await topicService.createTopic(topic);
      let saved = 0;
      for (const noteTpl of tpl.noteTemplates) {
        try {
          await noteService.createNote(
            noteFromTemplate(noteTpl, {
              ownerUID: uid as string,
              topicId: topic.id,
              languageCode: tpl.languageCode,
              languageName: tpl.languageName,
            }),
          );
          saved += 1;
        } catch {
          /* best-effort — skip failed notes */
        }
      }
      if (saved > 0) {
        await topicService.setNotesCount(uid as string, topic.id, saved).catch(() => {});
      }
      return topic;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grammarTopics'] });
      qc.invalidateQueries({ queryKey: ['grammarNotes'] });
    },
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

/** Persist a manual topic order (iOS `moveTopics`). */
export const useReorderTopics = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await topicService.updateTopicSortIndices(
        uid as string,
        orderedIds.map((id, sortIndex) => ({ id, sortIndex })),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grammarTopics'] }),
  });
};

/** iOS `ensureCommonMistakesTopicExists`: the Notes home provisions the
    Common Mistakes topic on first load so saved corrections always have a
    home — and so the topic is visible before the first mistake is saved. */
export const useEnsureMistakesTopic = (topics: GrammarNoteTopic[] | undefined) => {
  const qc = useQueryClient();
  const uid = useUid();
  const missing = !!topics && !topics.some((t) => t.isMistakesTopic);

  useEffect(() => {
    if (!uid || !missing) return;
    let cancelled = false;
    void topicService
      .ensureMistakesTopic(uid)
      .then(() => {
        if (!cancelled) qc.invalidateQueries({ queryKey: ['grammarTopics'] });
      })
      .catch(() => {
        /* offline / permission — the next load retries */
      });
    return () => {
      cancelled = true;
    };
  }, [uid, missing, qc]);
};
