/* The arrange-mode state shared by the folders and sets screens.

   While arranging, the working copy lives here rather than in the query cache:
   every nudge would otherwise be a Firestore write and a refetch, and a list
   that reflows under your finger between two taps is unusable. The batch goes
   out once, when you leave the mode — and only if the arrangement actually
   changed. */
import { useCallback, useEffect, useState } from 'react';

import { assignOrder, moveItem, orderChanged, type Orderable } from '@/lib/collectionOrder';

export interface ReorderMode<T> {
  isEditing: boolean;
  /** What to render: the working copy while arranging, the live list otherwise. */
  items: T[];
  toggle: () => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  /** For a pointer drag, which hands back the whole reordered list. */
  reorder: (next: T[]) => void;
}

export const useReorderMode = <T extends Orderable>(
  source: T[],
  save: (ids: string[]) => void,
): ReorderMode<T> => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<T[] | null>(null);

  const items = draft ?? source;

  /* A set created or deleted in another tab while this one is arranging would
     otherwise leave the draft showing a list that no longer exists. */
  useEffect(() => {
    if (!draft) return;
    const sourceIds = source.map((item) => item.id).sort().join();
    const draftIds = draft.map((item) => item.id).sort().join();
    if (sourceIds !== draftIds) setDraft(source);
  }, [source, draft]);

  const toggle = useCallback(() => {
    if (!isEditing) {
      setDraft(source);
      setIsEditing(true);
      return;
    }
    const current = draft ?? source;
    if (orderChanged(current)) save(assignOrder(current).map((entry) => entry.id));
    setIsEditing(false);
    setDraft(null);
  }, [isEditing, draft, source, save]);

  const moveBy = useCallback(
    (id: string, delta: number) => {
      setDraft((previous) => {
        const list = previous ?? source;
        const from = list.findIndex((item) => item.id === id);
        if (from === -1) return list;
        return moveItem(list, from, from + delta);
      });
    },
    [source],
  );

  return {
    isEditing,
    items,
    toggle,
    moveUp: useCallback((id: string) => moveBy(id, -1), [moveBy]),
    moveDown: useCallback((id: string) => moveBy(id, 1), [moveBy]),
    reorder: useCallback((next: T[]) => setDraft(next), []),
  };
};
