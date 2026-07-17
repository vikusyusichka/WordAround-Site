/* Grammar-topic CRUD — web port of GrammarNoteTopicService.swift (subset).
   Path users/{uid}/grammarNoteTopics/{id}. Timestamps ↔ epoch millis at this
   boundary, same as folderService. */
import { deleteDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

import type { GrammarNoteTopic } from '@/lib/models';
import {
  grammarTopicDoc,
  grammarTopicsCollection,
  millisToTs,
  tsToMillis,
} from '@/lib/firestore';

const toFirestore = (topic: GrammarNoteTopic) => ({
  id: topic.id,
  ownerUID: topic.ownerUID,
  title: topic.title,
  description: topic.description,
  icon: topic.icon,
  colorHex: topic.colorHex,
  notesCount: topic.notesCount,
  isPinned: topic.isPinned,
  isMistakesTopic: topic.isMistakesTopic,
  createdAt: millisToTs(topic.createdAt),
  updatedAt: millisToTs(topic.updatedAt),
});

export const topicFromFirestore = (data: Record<string, unknown>): GrammarNoteTopic => ({
  id: String(data.id ?? ''),
  ownerUID: String(data.ownerUID ?? ''),
  title: String(data.title ?? ''),
  description: String(data.description ?? ''),
  icon: String(data.icon ?? 'book.pages.fill'),
  colorHex: String(data.colorHex ?? '#4F7CFF'),
  notesCount: typeof data.notesCount === 'number' ? data.notesCount : 0,
  isPinned: Boolean(data.isPinned),
  isMistakesTopic: Boolean(data.isMistakesTopic),
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
});

export const createTopic = async (topic: GrammarNoteTopic): Promise<void> => {
  await setDoc(grammarTopicDoc(topic.ownerUID, topic.id), toFirestore(topic));
};

export const fetchTopics = async (uid: string): Promise<GrammarNoteTopic[]> => {
  const snapshot = await getDocs(
    query(grammarTopicsCollection(uid), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs.map((d) => topicFromFirestore(d.data()));
};

export const updateTopic = async (topic: GrammarNoteTopic): Promise<void> => {
  await setDoc(grammarTopicDoc(topic.ownerUID, topic.id), toFirestore(topic), { merge: true });
};

/** Set notesCount without a full-document write (called on note create/delete). */
export const setNotesCount = async (
  uid: string,
  topicId: string,
  nextCount: number,
): Promise<void> => {
  await updateDoc(grammarTopicDoc(uid, topicId), {
    notesCount: Math.max(0, nextCount),
    updatedAt: millisToTs(Date.now()),
  });
};

export const deleteTopic = async (id: string, ownerUID: string): Promise<void> => {
  await deleteDoc(grammarTopicDoc(ownerUID, id));
};

/* 4D5: auto-provisioned "Common Mistakes" topic — iOS
   GrammarNoteTopic.commonMistakes + ensureDefaultMistakesTopic. Looked up by
   the isMistakesTopic flag (not by id), created with the fixed id when
   missing. */
export const MISTAKES_TOPIC_ID = 'common_mistakes';

export const makeMistakesTopic = (ownerUID: string, now: number = Date.now()): GrammarNoteTopic => ({
  id: MISTAKES_TOPIC_ID,
  ownerUID,
  title: 'Common Mistakes',
  description: 'Saved grammar corrections from essays and writing practice.',
  icon: 'exclamationmark.triangle.fill',
  colorHex: '#F4729A',
  notesCount: 0,
  isPinned: true,
  isMistakesTopic: true,
  createdAt: now,
  updatedAt: now,
});

export const ensureMistakesTopic = async (uid: string): Promise<GrammarNoteTopic> => {
  const topics = await fetchTopics(uid);
  const existing = topics.find((t) => t.isMistakesTopic);
  if (existing) return existing;
  const topic = makeMistakesTopic(uid);
  await createTopic(topic);
  return topic;
};
