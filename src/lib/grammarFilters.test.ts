import { describe, expect, it } from 'vitest';

import { makeGrammarNote } from './grammarFactories';
import { NOTE_FILTERS, noteMatchesFilter } from './grammarFilters';
import type { GrammarNote } from './models';

const note = (patch: Partial<GrammarNote>): GrammarNote => ({
  ...makeGrammarNote({ ownerUID: 'u', topicId: 't', title: 'n' }),
  ...patch,
});

describe('noteMatchesFilter', () => {
  it('all passes everything', () => {
    expect(noteMatchesFilter(note({}), 'all')).toBe(true);
  });

  it('pinned / favorites read the flags', () => {
    expect(noteMatchesFilter(note({ isPinned: true }), 'pinned')).toBe(true);
    expect(noteMatchesFilter(note({}), 'pinned')).toBe(false);
    expect(noteMatchesFilter(note({ isFavorite: true }), 'favorites')).toBe(true);
    expect(noteMatchesFilter(note({}), 'favorites')).toBe(false);
  });

  it('mistakes matches the flag or the note type (iOS matchesMistakesFilter)', () => {
    expect(noteMatchesFilter(note({ isMistakeNote: true }), 'mistakes')).toBe(true);
    expect(noteMatchesFilter(note({ noteType: 'mistake', isMistakeNote: false }), 'mistakes')).toBe(true);
    expect(noteMatchesFilter(note({}), 'mistakes')).toBe(false);
  });

  it('quizzes matches a saved quiz or a quiz block (iOS matchesQuizzesFilter)', () => {
    expect(noteMatchesFilter(note({ hasQuiz: true }), 'quizzes')).toBe(true);
    expect(
      noteMatchesFilter(
        note({
          hasQuiz: false,
          contentBlocks: [{ id: 'b', type: 'quiz', text: 'Q', items: [], order: 0 }],
        }),
        'quizzes',
      ),
    ).toBe(true);
    expect(noteMatchesFilter(note({ hasQuiz: false }), 'quizzes')).toBe(false);
  });

  it('exposes the five iOS filters in order', () => {
    expect(NOTE_FILTERS).toEqual(['all', 'pinned', 'favorites', 'mistakes', 'quizzes']);
  });
});
