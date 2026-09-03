/* Note list filters — port of GrammarNoteFilter (All, Pinned, Favorites,
   Mistakes, Quizzes) with the iOS `matchesMistakesFilter` /
   `matchesQuizzesFilter` semantics. Pure, so the chip row stays a component. */
import type { GrammarNote } from '@/lib/models';

export type NoteFilter = 'all' | 'pinned' | 'favorites' | 'mistakes' | 'quizzes';

export const NOTE_FILTERS: NoteFilter[] = ['all', 'pinned', 'favorites', 'mistakes', 'quizzes'];

export const FILTER_ICON: Record<NoteFilter, string> = {
  all: 'square.grid.2x2.fill',
  pinned: 'pin.fill',
  favorites: 'star.fill',
  mistakes: 'exclamationmark.triangle.fill',
  quizzes: 'questionmark.circle.fill',
};

export const noteMatchesFilter = (note: GrammarNote, filter: NoteFilter): boolean => {
  switch (filter) {
    case 'pinned':
      return note.isPinned;
    case 'favorites':
      return note.isFavorite;
    case 'mistakes':
      return note.isMistakeNote || note.noteType === 'mistake';
    case 'quizzes':
      return note.hasQuiz === true || note.contentBlocks.some((b) => b.type === 'quiz');
    case 'all':
    default:
      return true;
  }
};
