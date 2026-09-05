/* Grammar-note CRUD — web port of GrammarNoteService.swift.
   Notes live in a subcollection users/{uid}/grammarNoteTopics/{topicId}/notes.
   contentBlocks serialize as plain objects (no per-block timestamps on web).
   Ordering matches iOS `sortNotes`: pinned → favorite → manual sortIndex →
   most recently updated. */
import {
  deleteDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { makePlainText, makeSearchableText } from '@/lib/grammarSearch';
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
  'heading', 'subheading', 'paragraph', 'bulletList', 'numberedList', 'checklist',
  'rule', 'example', 'warning', 'comparison', 'exercise', 'quote', 'quiz', 'image',
  'divider',
];

const blockToFirestore = (b: GrammarNoteBlock) => ({
  id: b.id,
  type: b.type,
  text: b.text,
  secondaryText: b.secondaryText ?? null,
  items: b.items,
  imageURL: b.imageURL ?? null,
  imageCaption: b.imageCaption ?? null,
  order: b.order,
});

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const blockFromFirestore = (raw: unknown, index: number): GrammarNoteBlock => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const type = BLOCK_TYPES.includes(data.type as GrammarBlockType)
    ? (data.type as GrammarBlockType)
    : 'paragraph';
  return {
    id: String(data.id ?? crypto.randomUUID()),
    type,
    text: String(data.text ?? ''),
    secondaryText: optionalString(data.secondaryText),
    items: Array.isArray(data.items) ? data.items.map((i) => String(i)) : [],
    imageURL: optionalString(data.imageURL),
    imageCaption: optionalString(data.imageCaption),
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
  tags: note.tags,
  isPinned: note.isPinned,
  isFavorite: note.isFavorite,
  isMistakeNote: note.isMistakeNote,
  languageCode: note.languageCode,
  languageName: note.languageName,
  plainTextContent: note.plainTextContent,
  searchableText: note.searchableText,
  hasQuiz: note.hasQuiz ?? false,
  savedIssueKey: note.savedIssueKey ?? null,
  sortIndex: note.sortIndex ?? null,
  templateId: note.templateId ?? null,
  createdAt: millisToTs(note.createdAt),
  updatedAt: millisToTs(note.updatedAt),
  lastEditedAt: millisToTs(note.lastEditedAt),
});

/* The document id is the authoritative one: a stored `id` field can be
   missing or empty, and every path built from an empty id is invalid — which
   is how a mistake save died with `invalid-argument` on a topic document
   whose `id` field had gone missing. The field is still read as a fallback so
   nothing regresses for documents that carry it. */
export const noteFromFirestore = (
  data: Record<string, unknown>,
  docId?: string,
): GrammarNote => {
  const noteType = NOTE_TYPES.includes(data.noteType as GrammarNoteType)
    ? (data.noteType as GrammarNoteType)
    : 'standard';
  const blocks = Array.isArray(data.contentBlocks)
    ? data.contentBlocks.map(blockFromFirestore).sort((a, b) => a.order - b.order)
    : [];
  const title = String(data.title ?? '');
  const previewText = String(data.previewText ?? '');
  const tags = Array.isArray(data.tags) ? data.tags.map((tg) => String(tg)) : [];
  const plainTextContent =
    typeof data.plainTextContent === 'string' && data.plainTextContent.length > 0
      ? data.plainTextContent
      : makePlainText(blocks);
  const updatedAt = tsToMillis(data.updatedAt);
  return {
    id: docId ?? String(data.id ?? ''),
    ownerUID: String(data.ownerUID ?? ''),
    topicId: String(data.topicId ?? ''),
    title,
    noteType,
    previewText,
    contentBlocks: blocks,
    tags,
    isPinned: Boolean(data.isPinned),
    isFavorite: Boolean(data.isFavorite),
    isMistakeNote: Boolean(data.isMistakeNote) || noteType === 'mistake',
    languageCode: String(data.languageCode ?? ''),
    languageName: String(data.languageName ?? ''),
    plainTextContent,
    /* Notes written before the index exists get it rebuilt on read, so search
       works immediately (iOS backfills the same way). */
    searchableText:
      typeof data.searchableText === 'string' && data.searchableText.length > 0
        ? data.searchableText
        : makeSearchableText({ title, previewText, tags, noteType, blocks, plainTextContent }),
    hasQuiz: data.hasQuiz === true,
    savedIssueKey: optionalString(data.savedIssueKey),
    sortIndex: typeof data.sortIndex === 'number' ? data.sortIndex : undefined,
    templateId: optionalString(data.templateId),
    createdAt: tsToMillis(data.createdAt),
    updatedAt,
    lastEditedAt: data.lastEditedAt != null ? tsToMillis(data.lastEditedAt) : updatedAt,
  };
};

/** iOS `sortNotes`: pinned first, then favorites, then the manual order,
    then most recently updated. */
export const sortNotes = (
  notes: GrammarNote[],
  options: { pinnedFirst?: boolean } = {},
): GrammarNote[] => {
  const pinnedFirst = options.pinnedFirst ?? true;
  return [...notes].sort((a, b) => {
    if (pinnedFirst && a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.sortIndex != null && b.sortIndex != null && a.sortIndex !== b.sortIndex) {
      return a.sortIndex - b.sortIndex;
    }
    if (a.sortIndex != null && b.sortIndex == null) return -1;
    if (a.sortIndex == null && b.sortIndex != null) return 1;
    return b.updatedAt - a.updatedAt;
  });
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
  const snapshot = await getDocs(grammarNotesCollection(uid, topicId));
  return sortNotes(snapshot.docs.map((d) => noteFromFirestore(d.data(), d.id)));
};

export const deleteNote = async (
  uid: string,
  topicId: string,
  id: string,
): Promise<void> => {
  await deleteDoc(grammarNoteDoc(uid, topicId, id));
};

/** Pin/unpin without rewriting the whole document (iOS setNotePinned). */
export const setNotePinned = async (
  uid: string,
  topicId: string,
  id: string,
  isPinned: boolean,
): Promise<void> => {
  await updateDoc(grammarNoteDoc(uid, topicId, id), {
    isPinned,
    updatedAt: millisToTs(Date.now()),
  });
};

/** Favorite/unfavorite (iOS setNoteFavorite). */
export const setNoteFavorite = async (
  uid: string,
  topicId: string,
  id: string,
  isFavorite: boolean,
): Promise<void> => {
  await updateDoc(grammarNoteDoc(uid, topicId, id), {
    isFavorite,
    updatedAt: millisToTs(Date.now()),
  });
};

/** Persist a manual drag order in one batch (iOS updateNoteSortIndices). */
export const updateNoteSortIndices = async (
  uid: string,
  topicId: string,
  indices: { id: string; sortIndex: number }[],
): Promise<void> => {
  if (indices.length === 0) return;
  const batch = writeBatch(db);
  for (const entry of indices) {
    batch.update(grammarNoteDoc(uid, topicId, entry.id), { sortIndex: entry.sortIndex });
  }
  await batch.commit();
};

/** 4D5 dedup: first note in the topic saved with this issue key, if any. */
export const fetchNoteBySavedIssueKey = async (
  uid: string,
  topicId: string,
  key: string,
): Promise<GrammarNote | null> => {
  const snapshot = await getDocs(
    query(grammarNotesCollection(uid, topicId), where('savedIssueKey', '==', key), limit(1)),
  );
  return snapshot.empty
    ? null
    : noteFromFirestore(snapshot.docs[0].data(), snapshot.docs[0].id);
};
