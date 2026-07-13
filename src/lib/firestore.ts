/* Small Firestore helpers shared by the feature services. Keeps Timestamp
   conversion + collection paths in one place. */
import { collection, doc, Timestamp } from 'firebase/firestore';
import type { CollectionReference, DocumentData } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/** Firestore Timestamp (or a raw millis/seconds shape) → epoch millis. */
export const tsToMillis = (value: unknown): number => {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'seconds' in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  if (typeof value === 'number') return value;
  return Date.now();
};

/** Epoch millis → Firestore Timestamp for writes. */
export const millisToTs = (millis: number): Timestamp => Timestamp.fromMillis(millis);

/* Collection references under the signed-in user's document. */
export const foldersCollection = (uid: string): CollectionReference<DocumentData> =>
  collection(db, 'users', uid, 'folders');

export const flashcardSetsCollection = (uid: string): CollectionReference<DocumentData> =>
  collection(db, 'users', uid, 'flashcardSets');

export const folderDoc = (uid: string, id: string) => doc(foldersCollection(uid), id);
export const flashcardSetDoc = (uid: string, id: string) => doc(flashcardSetsCollection(uid), id);

/* Grammar notes (Phase 4D): topics under the user, notes as a subcollection. */
export const grammarTopicsCollection = (uid: string): CollectionReference<DocumentData> =>
  collection(db, 'users', uid, 'grammarNoteTopics');

export const grammarTopicDoc = (uid: string, id: string) => doc(grammarTopicsCollection(uid), id);

export const grammarNotesCollection = (
  uid: string,
  topicId: string,
): CollectionReference<DocumentData> =>
  collection(db, 'users', uid, 'grammarNoteTopics', topicId, 'notes');

export const grammarNoteDoc = (uid: string, topicId: string, id: string) =>
  doc(grammarNotesCollection(uid, topicId), id);
