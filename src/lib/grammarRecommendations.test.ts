import { beforeEach, describe, expect, it } from 'vitest';

import {
  forgetNote,
  recentlyEditedNotes,
  recentlyOpenedNotes,
  recommendationToReviewItem,
  recordEditedNote,
  recordOpenedNote,
} from './grammarRecommendations';

const rec = (noteId: string) => ({
  topicId: 't1',
  noteId,
  title: `Note ${noteId}`,
  previewText: 'p',
});

describe('grammarRecommendations (localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it('records opened notes newest-first with dedupe', () => {
    recordOpenedNote(rec('a'));
    recordOpenedNote(rec('b'));
    recordOpenedNote(rec('a')); // re-open moves to front, no dupe
    const list = recentlyOpenedNotes();
    expect(list.map((e) => e.noteId)).toEqual(['a', 'b']);
  });

  it('caps at 10 entries', () => {
    for (let i = 0; i < 14; i++) recordOpenedNote(rec(`n${i}`));
    const list = recentlyOpenedNotes();
    expect(list).toHaveLength(10);
    expect(list[0].noteId).toBe('n13');
  });

  it('opened and edited lists are independent; forgetNote clears both', () => {
    recordOpenedNote(rec('a'));
    recordEditedNote(rec('a'));
    recordEditedNote(rec('b'));
    expect(recentlyOpenedNotes()).toHaveLength(1);
    expect(recentlyEditedNotes()).toHaveLength(2);
    forgetNote('t1', 'a');
    expect(recentlyOpenedNotes()).toHaveLength(0);
    expect(recentlyEditedNotes().map((e) => e.noteId)).toEqual(['b']);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('grammarNotes.review.recentlyOpenedNotes', '{not json');
    expect(recentlyOpenedNotes()).toEqual([]);
  });

  it('converts to a synthetic review item due now', () => {
    const item = recommendationToReviewItem(rec('a'), 'uid-1', 5_000);
    expect(item.id).toBe('note_t1_a');
    expect(item.sourceType).toBe('note');
    expect(item.dueAt).toBe(5_000);
    expect(item.priority).toBe('normal');
    expect(item.ownerUID).toBe('uid-1');
  });
});
