/* Firestore flashcard-set CRUD — web port of FlashcardSetService.swift.
   Converts embedded cards, the icon enum, and Timestamps at the boundary so the
   app deals in plain objects + millis. */
import { deleteDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';

import type { Flashcard, FlashcardSet, SetIconType } from '@/lib/models';
import {
  flashcardSetDoc,
  flashcardSetsCollection,
  millisToTs,
  tsToMillis,
} from '@/lib/firestore';

const cardToFirestore = (card: Flashcard): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    id: card.id,
    word: card.word,
    translation: card.translation,
    example: card.example,
  };
  if (card.imageURL) out.imageURL = card.imageURL;
  return out;
};

const cardFromFirestore = (data: Record<string, unknown>): Flashcard => ({
  id: String(data.id ?? ''),
  word: String(data.word ?? ''),
  translation: String(data.translation ?? ''),
  example: String(data.example ?? ''),
  imageURL: typeof data.imageURL === 'string' ? data.imageURL : undefined,
});

const iconFromFirestore = (data: unknown): SetIconType => {
  if (data && typeof data === 'object' && 'type' in data && 'value' in data) {
    const { type, value } = data as { type: unknown; value: unknown };
    if (
      (type === 'systemName' || type === 'emoji' || type === 'customImageURL') &&
      typeof value === 'string'
    ) {
      return { type, value };
    }
  }
  return { type: 'systemName', value: 'rectangle.stack.fill' };
};

const toFirestore = (set: FlashcardSet): Record<string, unknown> => ({
  id: set.id,
  ownerUID: set.ownerUID,
  ownerEmail: set.ownerEmail,
  title: set.title,
  description: set.description,
  privacy: set.privacy,
  folderID: set.folderID ?? null,
  folderName: set.folderName ?? null,
  colorHex: set.colorHex,
  icon: { type: set.icon.type, value: set.icon.value },
  cards: set.cards.map(cardToFirestore),
  createdAt: millisToTs(set.createdAt),
  updatedAt: millisToTs(set.updatedAt),
});

const fromFirestore = (data: Record<string, unknown>): FlashcardSet => ({
  id: String(data.id ?? ''),
  ownerUID: String(data.ownerUID ?? ''),
  ownerEmail: String(data.ownerEmail ?? ''),
  title: String(data.title ?? ''),
  description: String(data.description ?? ''),
  privacy: String(data.privacy ?? 'Private'),
  folderID: (data.folderID as string | null) ?? null,
  folderName: (data.folderName as string | null) ?? null,
  colorHex: String(data.colorHex ?? '#FF5759'),
  icon: iconFromFirestore(data.icon),
  cards: Array.isArray(data.cards)
    ? (data.cards as Record<string, unknown>[]).map(cardFromFirestore)
    : [],
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
});

export const createSet = async (set: FlashcardSet): Promise<void> => {
  await setDoc(flashcardSetDoc(set.ownerUID, set.id), toFirestore(set));
};

export const fetchSets = async (uid: string): Promise<FlashcardSet[]> => {
  const snapshot = await getDocs(
    query(flashcardSetsCollection(uid), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs.map((d) => fromFirestore(d.data()));
};

export const deleteSet = async (id: string, ownerUID: string): Promise<void> => {
  await deleteDoc(flashcardSetDoc(ownerUID, id));
};

/* Folder queries sort client-side (matches iOS — avoids a composite index). */
export const fetchSetsByFolder = async (
  folderID: string,
  uid: string,
): Promise<FlashcardSet[]> => {
  const snapshot = await getDocs(
    query(flashcardSetsCollection(uid), where('folderID', '==', folderID)),
  );
  return snapshot.docs.map((d) => fromFirestore(d.data())).sort((a, b) => b.createdAt - a.createdAt);
};

export const fetchSetsByFolderName = async (
  folderName: string,
  uid: string,
): Promise<FlashcardSet[]> => {
  const snapshot = await getDocs(
    query(flashcardSetsCollection(uid), where('folderName', '==', folderName)),
  );
  return snapshot.docs.map((d) => fromFirestore(d.data())).sort((a, b) => b.createdAt - a.createdAt);
};
