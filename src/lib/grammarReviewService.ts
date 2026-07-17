/* Review-item persistence — web port of GrammarReviewService.swift.
   users/{uid}/grammarReviewItems/{id}. The upsert preserves learning history
   (counters/dates) when the doc already exists, so "add to review" twice
   never resets progress. */
import { deleteDoc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';

import { applyReviewResult } from '@/lib/grammarReview';
import {
  grammarReviewItemDoc,
  grammarReviewItemsCollection,
  millisToTs,
  tsToMillis,
} from '@/lib/firestore';
import type {
  GrammarReviewItem,
  GrammarReviewPriority,
  GrammarReviewResult,
  GrammarReviewSourceType,
} from '@/lib/models';

const SOURCE_TYPES: GrammarReviewSourceType[] = ['note', 'mistake', 'quiz'];
const PRIORITIES: GrammarReviewPriority[] = ['low', 'normal', 'high'];

const toFirestore = (item: GrammarReviewItem) => ({
  id: item.id,
  ownerUID: item.ownerUID,
  sourceType: item.sourceType,
  topicId: item.topicId,
  noteId: item.noteId ?? null,
  quizId: item.quizId ?? null,
  title: item.title,
  previewText: item.previewText,
  priority: item.priority,
  dueAt: millisToTs(item.dueAt),
  lastReviewedAt: item.lastReviewedAt !== undefined ? millisToTs(item.lastReviewedAt) : null,
  nextReviewAt: item.nextReviewAt !== undefined ? millisToTs(item.nextReviewAt) : null,
  reviewCount: item.reviewCount,
  correctStreak: item.correctStreak,
  incorrectStreak: item.incorrectStreak,
  mistakeCount: item.mistakeCount,
  createdAt: millisToTs(item.createdAt),
  updatedAt: millisToTs(item.updatedAt),
});

export const reviewItemFromFirestore = (data: Record<string, unknown>): GrammarReviewItem => ({
  id: String(data.id ?? ''),
  ownerUID: String(data.ownerUID ?? ''),
  sourceType: SOURCE_TYPES.includes(data.sourceType as GrammarReviewSourceType)
    ? (data.sourceType as GrammarReviewSourceType)
    : 'note',
  topicId: String(data.topicId ?? ''),
  noteId: typeof data.noteId === 'string' && data.noteId.length > 0 ? data.noteId : undefined,
  quizId: typeof data.quizId === 'string' && data.quizId.length > 0 ? data.quizId : undefined,
  title: String(data.title ?? ''),
  previewText: String(data.previewText ?? ''),
  priority: PRIORITIES.includes(data.priority as GrammarReviewPriority)
    ? (data.priority as GrammarReviewPriority)
    : 'normal',
  dueAt: tsToMillis(data.dueAt),
  lastReviewedAt: data.lastReviewedAt != null ? tsToMillis(data.lastReviewedAt) : undefined,
  nextReviewAt: data.nextReviewAt != null ? tsToMillis(data.nextReviewAt) : undefined,
  reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
  correctStreak: typeof data.correctStreak === 'number' ? data.correctStreak : 0,
  incorrectStreak: typeof data.incorrectStreak === 'number' ? data.incorrectStreak : 0,
  mistakeCount: typeof data.mistakeCount === 'number' ? data.mistakeCount : 0,
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
});

/** Items due now (dueAt <= now), soonest first. */
export const fetchDueReviewItems = async (
  uid: string,
  max: number = 30,
): Promise<GrammarReviewItem[]> => {
  const snapshot = await getDocs(
    query(
      grammarReviewItemsCollection(uid),
      where('dueAt', '<=', millisToTs(Date.now())),
      orderBy('dueAt', 'asc'),
      limit(max),
    ),
  );
  return snapshot.docs.map((d) => reviewItemFromFirestore(d.data()));
};

/** Upsert that preserves learning history on existing docs (iOS
    createOrUpdateReviewItem). */
export const upsertReviewItem = async (item: GrammarReviewItem): Promise<GrammarReviewItem> => {
  const ref = grammarReviewItemDoc(item.ownerUID, item.id);
  const existing = await getDoc(ref);
  let merged = item;
  if (existing.exists()) {
    const prev = reviewItemFromFirestore(existing.data() as Record<string, unknown>);
    merged = {
      ...item,
      reviewCount: prev.reviewCount,
      correctStreak: prev.correctStreak,
      incorrectStreak: prev.incorrectStreak,
      mistakeCount: prev.mistakeCount,
      lastReviewedAt: prev.lastReviewedAt,
      nextReviewAt: prev.nextReviewAt,
      createdAt: prev.createdAt,
    };
  }
  await setDoc(ref, toFirestore(merged), { merge: true });
  return merged;
};

/** Apply a rating and persist the advanced schedule. */
export const markReviewed = async (
  item: GrammarReviewItem,
  result: GrammarReviewResult,
  now: number = Date.now(),
): Promise<GrammarReviewItem> => {
  const updated = applyReviewResult(item, result, now);
  await setDoc(grammarReviewItemDoc(updated.ownerUID, updated.id), toFirestore(updated), {
    merge: true,
  });
  return updated;
};

export const deleteReviewItem = async (uid: string, id: string): Promise<void> => {
  await deleteDoc(grammarReviewItemDoc(uid, id));
};
