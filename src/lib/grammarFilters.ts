/* Note list filters — port of GrammarNoteFilter (All, Pinned, Favorites,
   Mistakes, Quizzes) with the iOS `matchesMistakesFilter` /
   `matchesQuizzesFilter` semantics, plus a web-only `review` filter.

   `review` is the one filter a note cannot answer on its own: whether it is
   due lives in its review item, not in the note. Rather than make every
   caller pass review state, the context argument is optional and the filter
   simply matches nothing without it — a screen that has no review data shows
   an empty "Due" list rather than a wrong one. Pure, so the chip row stays a
   component. */
import type { GrammarNote, GrammarReviewItem } from '@/lib/models';
import { reviewItemIdForNote } from '@/lib/grammarReview';

export type NoteFilter = 'all' | 'pinned' | 'favorites' | 'mistakes' | 'quizzes' | 'review';

export const NOTE_FILTERS: NoteFilter[] = [
  'all', 'pinned', 'favorites', 'mistakes', 'quizzes', 'review',
];

export const FILTER_ICON: Record<NoteFilter, string> = {
  all: 'square.grid.2x2.fill',
  pinned: 'pin.fill',
  favorites: 'star.fill',
  mistakes: 'exclamationmark.triangle.fill',
  quizzes: 'questionmark.circle.fill',
  review: 'brain.head.profile',
};

export interface NoteFilterContext {
  /** Every review item the learner has, keyed by review-item id. */
  reviewItems?: Map<string, GrammarReviewItem>;
  /** Injectable for tests; defaults to now. */
  now?: number;
}

/** The note's own review card, when it has one. */
export const reviewItemForNote = (
  note: GrammarNote,
  reviewItems?: Map<string, GrammarReviewItem>,
): GrammarReviewItem | undefined =>
  reviewItems?.get(reviewItemIdForNote(note.topicId, note.id));

export const noteMatchesFilter = (
  note: GrammarNote,
  filter: NoteFilter,
  ctx: NoteFilterContext = {},
): boolean => {
  switch (filter) {
    case 'pinned':
      return note.isPinned;
    case 'favorites':
      return note.isFavorite;
    case 'mistakes':
      return note.isMistakeNote || note.noteType === 'mistake';
    case 'quizzes':
      return note.hasQuiz === true || note.contentBlocks.some((b) => b.type === 'quiz');
    case 'review': {
      const item = reviewItemForNote(note, ctx.reviewItems);
      return item !== undefined && item.dueAt <= (ctx.now ?? Date.now());
    }
    case 'all':
    default:
      return true;
  }
};
