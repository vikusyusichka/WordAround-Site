/* Firestore folder CRUD — web port of Core/Services/Firebase/FolderService.swift.
   Modular firebase/firestore over the shared `db`. Timestamps are converted to
   epoch millis at this boundary so the rest of the app deals in plain numbers. */
import { deleteDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';

import type { Folder } from '@/lib/models';
import {
  folderDoc,
  foldersCollection,
  millisToTs,
  tsToMillis,
} from '@/lib/firestore';

const toFirestore = (folder: Folder) => ({
  id: folder.id,
  ownerUID: folder.ownerUID,
  title: folder.title,
  description: folder.description,
  colorHex: folder.colorHex,
  createdAt: millisToTs(folder.createdAt),
  updatedAt: millisToTs(folder.updatedAt),
});

const fromFirestore = (data: Record<string, unknown>): Folder => ({
  id: String(data.id ?? ''),
  ownerUID: String(data.ownerUID ?? ''),
  title: String(data.title ?? ''),
  description: String(data.description ?? ''),
  colorHex: String(data.colorHex ?? '#FF5759'),
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
});

export const createFolder = async (folder: Folder): Promise<void> => {
  await setDoc(folderDoc(folder.ownerUID, folder.id), toFirestore(folder));
};

export const fetchFolders = async (uid: string): Promise<Folder[]> => {
  const snapshot = await getDocs(query(foldersCollection(uid), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => fromFirestore(d.data()));
};

export const updateFolder = async (folder: Folder): Promise<void> => {
  await setDoc(folderDoc(folder.ownerUID, folder.id), toFirestore(folder), { merge: true });
};

export const deleteFolder = async (id: string, ownerUID: string): Promise<void> => {
  await deleteDoc(folderDoc(ownerUID, id));
};
