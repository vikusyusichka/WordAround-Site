/* Flashcard-set data hooks (TanStack Query), same pattern as useFolders.
   useCreateSet runs the full save use-case: validate → upload card images to
   Storage → build the FlashcardSet → write to Firestore → invalidate. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auth } from '@/lib/firebase';
import * as setService from '@/lib/setService';
import { uploadCardImage } from '@/lib/setImageService';
import { validateCreateSet, type CreateSetDraft } from '@/lib/createSetValidation';
import { resolveIcon } from '@/lib/iconSuggester';
import { SET_COLOR_HEX } from '@/lib/setColors';
import type { Flashcard, FlashcardSet } from '@/lib/models';
import { useUid } from '@/hooks/useFolders';

export const setsKey = (uid: string | null) => ['sets', uid] as const;

export const useSetsQuery = () => {
  const uid = useUid();
  return useQuery({
    queryKey: setsKey(uid),
    queryFn: () => setService.fetchSets(uid as string),
    enabled: !!uid,
  });
};

/** Sets assigned to a folder (by id, matching iOS FolderDetailViewModel). */
export const useFolderSetsQuery = (folderID: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: ['sets', uid, 'folder', folderID],
    queryFn: () => setService.fetchSetsByFolder(folderID, uid as string),
    enabled: !!uid,
  });
};

/** Thrown with an i18n error key when the draft is invalid. */
export class CreateSetError extends Error {}

export const useCreateSet = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (draft: CreateSetDraft): Promise<FlashcardSet> => {
      const { errorKey, validCards } = validateCreateSet(draft);
      if (errorKey) throw new CreateSetError(errorKey);

      const ownerUID = uid as string;
      const setId = crypto.randomUUID();
      const now = Date.now();

      const cards: Flashcard[] = [];
      for (const c of validCards) {
        let imageURL = c.imageURL ?? undefined;
        if (c.imageFile) {
          imageURL = await uploadCardImage(ownerUID, setId, c.id, c.imageFile);
        }
        cards.push({
          id: c.id,
          word: c.word.trim(),
          translation: c.translation.trim(),
          example: c.example.trim(),
          imageURL,
        });
      }

      const set: FlashcardSet = {
        id: setId,
        ownerUID,
        ownerEmail: auth.currentUser?.email ?? '',
        title: draft.title.trim(),
        description: draft.description.trim(),
        privacy: draft.privacy,
        folderID: draft.folderID,
        folderName: draft.folderName,
        colorHex: SET_COLOR_HEX[draft.colorId],
        icon: { type: 'systemName', value: resolveIcon(draft.iconName, draft.title) },
        cards,
        createdAt: now,
        updatedAt: now,
      };

      await setService.createSet(set);
      return set;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sets'] }),
  });
};

export const useDeleteSet = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: (id: string) => setService.deleteSet(id, uid as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sets'] }),
  });
};

/** Persist card edits (add/edit/delete) for a set. */
export const useUpdateSetCards = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: ({ setId, cards }: { setId: string; cards: Flashcard[] }) =>
      setService.updateSetCards(uid as string, setId, cards),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sets'] }),
  });
};
