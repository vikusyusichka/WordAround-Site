/* Recently-opened / recently-edited note recommendations — web port of the
   iOS GrammarReviewRecommendation UserDefaults store. Kept in localStorage
   (device-local, like iOS); entries convert to synthetic review items that
   feed the queue when no manual items are due. */
import { makeReviewItem, reviewItemIdForNote } from '@/lib/grammarReview';
import type { GrammarReviewItem } from '@/lib/models';

const OPENED_KEY = 'grammarNotes.review.recentlyOpenedNotes';
const EDITED_KEY = 'grammarNotes.review.recentlyEditedNotes';
const CAP = 10;

export interface GrammarRecommendation {
  topicId: string;
  noteId: string;
  title: string;
  previewText: string;
}

const read = (key: string): GrammarRecommendation[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is GrammarRecommendation =>
          !!e && typeof e === 'object' &&
          typeof (e as GrammarRecommendation).topicId === 'string' &&
          typeof (e as GrammarRecommendation).noteId === 'string',
      )
      .slice(0, CAP);
  } catch {
    return [];
  }
};

const upsert = (key: string, entry: GrammarRecommendation) => {
  const rest = read(key).filter(
    (e) => !(e.topicId === entry.topicId && e.noteId === entry.noteId),
  );
  try {
    localStorage.setItem(key, JSON.stringify([entry, ...rest].slice(0, CAP)));
  } catch {
    /* storage full/unavailable — recommendations are best-effort */
  }
};

export const recordOpenedNote = (entry: GrammarRecommendation) => upsert(OPENED_KEY, entry);
export const recordEditedNote = (entry: GrammarRecommendation) => upsert(EDITED_KEY, entry);

export const recentlyOpenedNotes = (): GrammarRecommendation[] => read(OPENED_KEY);
export const recentlyEditedNotes = (): GrammarRecommendation[] => read(EDITED_KEY);

/** Drop a note from both lists (e.g. after it was deleted). */
export const forgetNote = (topicId: string, noteId: string) => {
  for (const key of [OPENED_KEY, EDITED_KEY]) {
    const filtered = read(key).filter(
      (e) => !(e.topicId === topicId && e.noteId === noteId),
    );
    try {
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {
      /* best-effort */
    }
  }
};

/** Synthetic review item for a recommendation (iOS `.reviewItem`): due now,
    normal priority, deterministic note id. */
export const recommendationToReviewItem = (
  rec: GrammarRecommendation,
  ownerUID: string,
  now: number = Date.now(),
): GrammarReviewItem =>
  makeReviewItem({
    id: reviewItemIdForNote(rec.topicId, rec.noteId),
    ownerUID,
    sourceType: 'note',
    topicId: rec.topicId,
    noteId: rec.noteId,
    title: rec.title,
    previewText: rec.previewText,
    now,
  });
