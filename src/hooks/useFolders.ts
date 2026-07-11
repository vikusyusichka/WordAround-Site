/* Folder data hooks built on TanStack Query (reads cached + revalidated;
   mutations invalidate the list). Establishes the data-fetching pattern for the
   rest of Phase 3. Current uid comes from the session store. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as folderService from '@/lib/folderService';
import type { Folder } from '@/lib/models';
import { useSessionStore } from '@/stores/sessionStore';

export const useUid = (): string | null =>
  useSessionStore((s) => (s.state.kind === 'authenticated' ? s.state.user.uid : null));

export const foldersKey = (uid: string | null) => ['folders', uid] as const;

export const useFoldersQuery = () => {
  const uid = useUid();
  return useQuery({
    queryKey: foldersKey(uid),
    queryFn: () => folderService.fetchFolders(uid as string),
    enabled: !!uid,
  });
};

export interface FolderInput {
  title: string;
  description: string;
  colorHex: string;
}

export const useCreateFolder = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: async (input: FolderInput) => {
      const now = Date.now();
      const folder: Folder = {
        id: crypto.randomUUID(),
        ownerUID: uid as string,
        title: input.title.trim(),
        description: input.description.trim(),
        colorHex: input.colorHex,
        createdAt: now,
        updatedAt: now,
      };
      await folderService.createFolder(folder);
      return folder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
};

export const useUpdateFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folder: Folder) => {
      const updated = { ...folder, updatedAt: Date.now() };
      await folderService.updateFolder(updated);
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
};

export const useDeleteFolder = () => {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: (id: string) => folderService.deleteFolder(id, uid as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
};
