/* Firestore folder CRUD — web port of Core/Services/Firebase/FolderService.swift.
   Modular firebase/firestore over the shared `db`. Timestamps are converted to
   epoch millis at this boundary so the rest of the app deals in plain numbers. */
import { deleteDoc, getDocs, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { sortByOrder } from '@/lib/collectionOrder';
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
  /* Carried through on every write: `updateFolder` re-sends the whole document,
     so leaving this out would wipe the arrangement on the first rename. */
  ...(typeof folder.order === 'number' ? { order: folder.order } : {}),
});

/* The document id is the authoritative one: a stored `id` field can be
   missing or empty, and every path built from an empty id is invalid — which
   is how a mistake save died with `invalid-argument` on a topic document
   whose `id` field had gone missing. The field is still read as a fallback so
   nothing regresses for documents that carry it. */
const fromFirestore = (data: Record<string, unknown>, docId?: string): Folder => ({
  id: docId ?? String(data.id ?? ''),
  ownerUID: String(data.ownerUID ?? ''),
  title: String(data.title ?? ''),
  description: String(data.description ?? ''),
  colorHex: String(data.colorHex ?? '#FF5759'),
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
  ...(typeof data.order === 'number' ? { order: data.order } : {}),
});

export const createFolder = async (folder: Folder): Promise<void> => {
  await setDoc(folderDoc(folder.ownerUID, folder.id), toFirestore(folder));
};

/* Still ordered by createdAt on the server — `order` is optional, and a
   Firestore orderBy silently drops every document that lacks the field. The
   manual arrangement is applied in memory instead. */
export const fetchFolders = async (uid: string): Promise<Folder[]> => {
  const snapshot = await getDocs(query(foldersCollection(uid), orderBy('createdAt', 'desc')));
  return sortByOrder(snapshot.docs.map((d) => fromFirestore(d.data(), d.id)));
};

/** Writes the new arrangement in one batch — `ids` in their display order. */
export const reorderFolders = async (uid: string, ids: string[]): Promise<void> => {
  const batch = writeBatch(db);
  ids.forEach((id, order) => batch.set(folderDoc(uid, id), { order }, { merge: true }));
  await batch.commit();
};

export const updateFolder = async (folder: Folder): Promise<void> => {
  await setDoc(folderDoc(folder.ownerUID, folder.id), toFirestore(folder), { merge: true });
};

export const deleteFolder = async (id: string, ownerUID: string): Promise<void> => {
  await deleteDoc(folderDoc(ownerUID, id));
};
