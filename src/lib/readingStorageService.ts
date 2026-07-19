/* Reading-item persistence — web port of ReadingStorageService.swift. ONE
   collection users/{uid}/readingItems backs every mode (filter by modeID).
   Cross-platform field parity: the owner field is `userId` (iOS Codable),
   dates are Firestore Timestamps. Partial progress is clamped to ≤0.99 —
   only markCompleted writes 1.0. */
import { deleteDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

import {
  millisToTs,
  readingItemDoc,
  readingItemsCollection,
  tsToMillis,
} from '@/lib/firestore';
import type {
  ReadingDifficulty,
  ReadingFocus,
  ReadingItemStatus,
  ReadingLibraryItem,
  ReadingQuestionType,
  ReadingSourceType,
} from '@/lib/models';

const SOURCE_TYPES: ReadingSourceType[] = [
  'generated', 'pastedText', 'photoImport', 'pdfImport', 'flashcardSet',
  'story', 'speedPractice', 'interactive', 'aiGenerated', 'exploredArticle',
];
const STATUSES: ReadingItemStatus[] = ['new', 'inProgress', 'completed'];
const DIFFICULTIES: ReadingDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'Native'];
const FOCUSES: ReadingFocus[] = [
  'mainIdea', 'vocabulary', 'detailedComprehension', 'grammarAwareness', 'speedFluency',
];
const QUESTION_TYPES: ReadingQuestionType[] = [
  'comprehension', 'trueFalse', 'fillGap', 'vocabulary', 'findEvidence', 'orderReconstruction',
];

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

const toFirestore = (item: ReadingLibraryItem) => ({
  id: item.id,
  userId: item.ownerUID,
  modeID: item.modeID,
  title: item.title,
  preview: item.preview,
  fullText: item.fullText,
  difficulty: item.difficulty,
  estimatedMinutes: item.estimatedMinutes,
  createdAt: millisToTs(item.createdAt),
  updatedAt: millisToTs(item.updatedAt),
  lastOpenedAt: item.lastOpenedAt !== undefined ? millisToTs(item.lastOpenedAt) : null,
  progress: clamp01(item.progress),
  comprehensionScore: item.comprehensionScore ?? null,
  tags: item.tags,
  sourceType: item.sourceType,
  sourceId: item.sourceId ?? null,
  status: item.status,
  selections: item.selections,
  toggles: item.toggles,
  languageCode: item.languageCode,
  wordCount: item.wordCount,
  characterCount: item.characterCount,
  detectedDifficulty: item.detectedDifficulty,
  readingFocus: item.readingFocus,
  enabledQuestionTypes: item.enabledQuestionTypes,
  readingTimeSeconds: item.readingTimeSeconds ?? null,
  lastReadCharacterIndex: item.lastReadCharacterIndex,
});

export const readingItemFromFirestore = (data: Record<string, unknown>): ReadingLibraryItem => {
  const selections = (data.selections ?? {}) as Record<string, unknown>;
  const toggles = (data.toggles ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    ownerUID: String(data.userId ?? ''),
    modeID: String(data.modeID ?? ''),
    title: String(data.title ?? ''),
    preview: String(data.preview ?? ''),
    fullText: String(data.fullText ?? ''),
    difficulty: DIFFICULTIES.includes(data.difficulty as ReadingDifficulty)
      ? (data.difficulty as ReadingDifficulty)
      : 'B1',
    estimatedMinutes: typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 1,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
    lastOpenedAt: data.lastOpenedAt != null ? tsToMillis(data.lastOpenedAt) : undefined,
    progress: typeof data.progress === 'number' ? clamp01(data.progress) : 0,
    comprehensionScore:
      typeof data.comprehensionScore === 'number' ? data.comprehensionScore : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t)) : [],
    sourceType: SOURCE_TYPES.includes(data.sourceType as ReadingSourceType)
      ? (data.sourceType as ReadingSourceType)
      : 'pastedText',
    sourceId: typeof data.sourceId === 'string' && data.sourceId.length > 0 ? data.sourceId : undefined,
    status: STATUSES.includes(data.status as ReadingItemStatus)
      ? (data.status as ReadingItemStatus)
      : 'new',
    selections: Object.fromEntries(
      Object.entries(selections).map(([k, v]) => [k, String(v)]),
    ),
    toggles: Object.fromEntries(
      Object.entries(toggles).map(([k, v]) => [k, Boolean(v)]),
    ),
    languageCode: String(data.languageCode ?? 'english'),
    wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
    characterCount: typeof data.characterCount === 'number' ? data.characterCount : 0,
    detectedDifficulty: DIFFICULTIES.includes(data.detectedDifficulty as ReadingDifficulty)
      ? (data.detectedDifficulty as ReadingDifficulty)
      : 'B1',
    readingFocus: FOCUSES.includes(data.readingFocus as ReadingFocus)
      ? (data.readingFocus as ReadingFocus)
      : 'mainIdea',
    enabledQuestionTypes: Array.isArray(data.enabledQuestionTypes)
      ? data.enabledQuestionTypes.filter((t): t is ReadingQuestionType =>
          QUESTION_TYPES.includes(t as ReadingQuestionType),
        )
      : [],
    readingTimeSeconds:
      typeof data.readingTimeSeconds === 'number' ? data.readingTimeSeconds : undefined,
    lastReadCharacterIndex:
      typeof data.lastReadCharacterIndex === 'number' ? data.lastReadCharacterIndex : 0,
  };
};

/* iOS sort: lastOpenedAt ?? updatedAt desc, then updatedAt, then createdAt. */
const sortItems = (items: ReadingLibraryItem[]): ReadingLibraryItem[] =>
  [...items].sort((a, b) => {
    const aKey = a.lastOpenedAt ?? a.updatedAt;
    const bKey = b.lastOpenedAt ?? b.updatedAt;
    if (bKey !== aKey) return bKey - aKey;
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    return b.createdAt - a.createdAt;
  });

export const fetchReadingItems = async (
  uid: string,
  modeID?: string,
): Promise<ReadingLibraryItem[]> => {
  const ref = readingItemsCollection(uid);
  const snapshot = await getDocs(modeID ? query(ref, where('modeID', '==', modeID)) : ref);
  return sortItems(snapshot.docs.map((d) => readingItemFromFirestore(d.data())));
};

export const saveReadingItem = async (item: ReadingLibraryItem): Promise<void> => {
  await setDoc(readingItemDoc(item.ownerUID, item.id), toFirestore(item));
};

/** Partial progress (never completes — capped at 0.99, iOS parity). */
export const updateReadingProgress = async (
  uid: string,
  id: string,
  params: { progress: number; lastReadCharacterIndex?: number },
): Promise<void> => {
  const progress = Math.min(clamp01(params.progress), 0.99);
  await updateDoc(readingItemDoc(uid, id), {
    progress,
    status: 'inProgress',
    lastOpenedAt: millisToTs(Date.now()),
    updatedAt: millisToTs(Date.now()),
    ...(params.lastReadCharacterIndex !== undefined
      ? { lastReadCharacterIndex: params.lastReadCharacterIndex }
      : {}),
  });
};

export const markReadingCompleted = async (
  uid: string,
  id: string,
  params: { readingTimeSeconds: number; comprehensionScore: number },
): Promise<void> => {
  await updateDoc(readingItemDoc(uid, id), {
    progress: 1,
    status: 'completed',
    readingTimeSeconds: params.readingTimeSeconds,
    comprehensionScore: clamp01(params.comprehensionScore),
    lastOpenedAt: millisToTs(Date.now()),
    updatedAt: millisToTs(Date.now()),
  });
};

export const updateReadingLastOpened = async (uid: string, id: string): Promise<void> => {
  await updateDoc(readingItemDoc(uid, id), { lastOpenedAt: millisToTs(Date.now()) });
};

export const renameReadingItem = async (
  uid: string,
  id: string,
  title: string,
): Promise<void> => {
  await updateDoc(readingItemDoc(uid, id), {
    title: title.trim(),
    updatedAt: millisToTs(Date.now()),
  });
};

export const deleteReadingItem = async (uid: string, id: string): Promise<void> => {
  await deleteDoc(readingItemDoc(uid, id));
};
