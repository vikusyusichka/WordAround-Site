/* Grammar-note CRUD — web port of GrammarNoteService.swift (subset).
   Notes live in a subcollection users/{uid}/grammarNoteTopics/{topicId}/notes.
   contentBlocks serialize as plain objects (no per-block timestamps in 4D1). */
import { deleteDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';

import type { GrammarBlockType, GrammarNote, GrammarNoteBlock, GrammarNoteType } from '@/lib/models';
import {
  grammarNoteDoc,
  grammarNotesCollection,
  millisToTs,
  tsToMillis,
} from '@/lib/firestore';

const NOTE_TYPES: GrammarNoteType[] = [
  'standard', 'mistake', 'rule', 'comparison', 'cheatSheet', 'exercise',
];
const BLOCK_TYPES: GrammarBlockType[] = [
  'heading', 'paragraph', 'bulletList', 'rule', 'example', 'warning', 'quote', 'divider',
];

const blockToFirestore = (b: GrammarNoteBlock) => ({
  id: b.id,
  type: b.type,
  text: b.text,
  secondaryText: b.secondaryText ?? null,
  items: b.items,
  order: b.order,
});

const blockFromFirestore = (raw: unknown, index: number): GrammarNoteBlock => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const type = BLOCK_TYPES.includes(data.type as GrammarBlockType)
    ? (data.type as GrammarBlockType)
    : 'paragraph';
  const secondary = data.secondaryText;
  return {
    id: String(data.id ?? crypto.randomUUID()),
    type,
    text: String(data.text ?? ''),
    secondaryText: typeof secondary === 'string' && secondary.length > 0 ? secondary : undefined,
    items: Array.isArray(data.items) ? data.items.map((i) => String(i)) : [],
    order: typeof data.order === 'number' ? data.order : index,
  };
};

const toFirestore = (note: GrammarNote) => ({
  id: note.id,
  ownerUID: note.ownerUID,
  topicId: note.topicId,
  title: note.title,
  noteType: note.noteType,
  previewText: note.previewText,
  contentBlocks: note.contentBlocks.map(blockToFirestore),
  createdAt: millisToTs(note.createdAt),
  updatedAt: millisToTs(note.updatedAt),
});

export const noteFromFirestore = (data: Record<string, unknown>): GrammarNote => {
  const noteType = NOTE_TYPES.includes(data.noteType as GrammarNoteType)
    ? (data.noteType as GrammarNoteType)
    : 'standard';
  const blocks = Array.isArray(data.contentBlocks)
    ? data.contentBlocks.map(blockFromFirestore).sort((a, b) => a.order - b.order)
    : [];
  return {
    id: String(data.id ?? ''),
    ownerUID: String(data.ownerUID ?? ''),
    topicId: String(data.topicId ?? ''),
    title: String(data.title ?? ''),
    noteType,
    previewText: String(data.previewText ?? ''),
    contentBlocks: blocks,
    hasQuiz: data.hasQuiz === true,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  };
};

export const createNote = async (note: GrammarNote): Promise<void> => {
  await setDoc(grammarNoteDoc(note.ownerUID, note.topicId, note.id), toFirestore(note));
};

export const updateNote = async (note: GrammarNote): Promise<void> => {
  await setDoc(grammarNoteDoc(note.ownerUID, note.topicId, note.id), toFirestore(note), {
    merge: true,
  });
};

export const fetchNotes = async (uid: string, topicId: string): Promise<GrammarNote[]> => {
  const snapshot = await getDocs(
    query(grammarNotesCollection(uid, topicId), orderBy('updatedAt', 'desc')),
  );
  return snapshot.docs.map((d) => noteFromFirestore(d.data()));
};

export const deleteNote = async (
  uid: string,
  topicId: string,
  id: string,
): Promise<void> => {
  await deleteDoc(grammarNoteDoc(uid, topicId, id));
};
