/* Save-mistake hook — per-key UI state map (idle/saving/saved/duplicate/
   failed) over grammarMistakeService.saveMistake, mirroring the iOS
   grammarIssueSaveStates dictionary in EssayPracticeViewModel. */
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { saveMistake, type MistakePayload } from '@/lib/grammarMistakeService';
import { useUid } from '@/hooks/useFolders';

export type MistakeSaveState = 'idle' | 'saving' | 'saved' | 'duplicate' | 'failed';

export const useSaveMistake = () => {
  const uid = useUid();
  const qc = useQueryClient();
  const [states, setStates] = useState<Record<string, MistakeSaveState>>({});
  const inFlight = useRef(new Set<string>());

  const stateFor = useCallback(
    (key: string): MistakeSaveState => states[key] ?? 'idle',
    [states],
  );

  const save = useCallback(
    async (key: string, payload: MistakePayload) => {
      if (!uid || inFlight.current.has(key)) return;
      inFlight.current.add(key);
      setStates((prev) => ({ ...prev, [key]: 'saving' }));
      try {
        const outcome = await saveMistake(payload, uid);
        setStates((prev) => ({ ...prev, [key]: outcome.status }));
        qc.invalidateQueries({ queryKey: ['grammarTopics'] });
        qc.invalidateQueries({ queryKey: ['grammarNotes'] });
        qc.invalidateQueries({ queryKey: ['grammarReview'] });
        return outcome;
      } catch {
        setStates((prev) => ({ ...prev, [key]: 'failed' }));
        return undefined;
      } finally {
        inFlight.current.delete(key);
      }
    },
    [uid, qc],
  );

  return { stateFor, save };
};
