import { describe, expect, it } from 'vitest';

import { makeGrammarNote } from './grammarFactories';
import { NOTE_FILTERS, noteMatchesFilter, reviewItemForNote } from './grammarFilters';
import { makeReviewItem, reviewItemIdForNote } from './grammarReview';
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

  it('exposes the five iOS filters in order, then the web-only review one', () => {
    expect(NOTE_FILTERS).toEqual([
      'all', 'pinned', 'favorites', 'mistakes', 'quizzes', 'review',
    ]);
  });
});

describe('the review filter', () => {
  const NOW = 1_000_000;
  const reviewed = note({ id: 'n1', topicId: 't' });

  const itemsWith = (dueAt: number) =>
    new Map([
      [
        reviewItemIdForNote('t', 'n1'),
        makeReviewItem({
          id: reviewItemIdForNote('t', 'n1'),
          ownerUID: 'u',
          sourceType: 'note',
          topicId: 't',
          noteId: 'n1',
          title: 'n',
          previewText: '',
          dueAt,
          now: NOW,
        }),
      ],
    ]);

  it('matches a note whose review has come due', () => {
    expect(
      noteMatchesFilter(reviewed, 'review', { reviewItems: itemsWith(NOW - 1), now: NOW }),
    ).toBe(true);
  });

  it('does not match a note scheduled for later', () => {
    expect(
      noteMatchesFilter(reviewed, 'review', { reviewItems: itemsWith(NOW + 86_400_000), now: NOW }),
    ).toBe(false);
  });

  /* Without review data the filter shows nothing rather than everything: an
     empty "Due" list is wrong-looking, a full one is wrong. */
  it('matches nothing when the caller has no review data', () => {
    expect(noteMatchesFilter(reviewed, 'review', { now: NOW })).toBe(false);
    expect(noteMatchesFilter(reviewed, 'review')).toBe(false);
  });

  it('reviewItemForNote keys on topic and note id together', () => {
    const items = itemsWith(NOW);
    expect(reviewItemForNote(reviewed, items)?.noteId).toBe('n1');
    expect(reviewItemForNote(note({ id: 'other', topicId: 't' }), items)).toBeUndefined();
    expect(reviewItemForNote(note({ id: 'n1', topicId: 'other' }), items)).toBeUndefined();
    expect(reviewItemForNote(reviewed, undefined)).toBeUndefined();
  });
});
