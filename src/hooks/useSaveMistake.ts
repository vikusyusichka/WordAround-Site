/* Save-mistake hook — per-key UI state map (idle/saving/saved/duplicate/
   failed) over grammarMistakeService.saveMistake, mirroring the iOS
   grammarIssueSaveStates dictionary in EssayPracticeViewModel.

   The failure reason is kept alongside the state. It used to be discarded by a
   bare `catch {}`, which left "Couldn't save. Try again." as the only evidence
   that anything had gone wrong — no code, no message, nothing in the console,
   so a failure could not be diagnosed from either side of the screen. */
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { saveMistake, type MistakePayload } from '@/lib/grammarMistakeService';
import { useUid } from '@/hooks/useFolders';

export type MistakeSaveState = 'idle' | 'saving' | 'saved' | 'duplicate' | 'failed';

export const useSaveMistake = () => {
  const uid = useUid();
  const qc = useQueryClient();
  const [states, setStates] = useState<Record<string, MistakeSaveState>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());

  const stateFor = useCallback(
    (key: string): MistakeSaveState => states[key] ?? 'idle',
    [states],
  );

  /** Why the last attempt for this key failed — Firebase's error code where
      there is one, so the message names something searchable. */
  const reasonFor = useCallback((key: string): string | null => reasons[key] ?? null, [reasons]);

  const save = useCallback(
    async (key: string, payload: MistakePayload, options: { topicId?: string } = {}) => {
      if (!uid || inFlight.current.has(key)) return;
      inFlight.current.add(key);
      setStates((prev) => ({ ...prev, [key]: 'saving' }));
      setReasons((prev) => {
        if (prev[key] === undefined) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        const outcome = await saveMistake(payload, uid, { topicId: options.topicId });
        setStates((prev) => ({ ...prev, [key]: outcome.status }));
        qc.invalidateQueries({ queryKey: ['grammarTopics'] });
        qc.invalidateQueries({ queryKey: ['grammarNotes'] });
        qc.invalidateQueries({ queryKey: ['grammarReview'] });
        qc.invalidateQueries({ queryKey: ['grammarHighlights'] });
        return outcome;
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: unknown }).code)
            : error instanceof Error
              ? error.message
              : String(error);
        console.error('[saveMistake] failed', error);
        setStates((prev) => ({ ...prev, [key]: 'failed' }));
        setReasons((prev) => ({ ...prev, [key]: code }));
        return undefined;
      } finally {
        inFlight.current.delete(key);
      }
    },
    [uid, qc],
  );

  return { stateFor, reasonFor, save };
};
