import { describe, expect, it } from 'vitest';

import {
  activeCard,
  counts,
  filteredCards,
  initialStudyState,
  roundStats,
  studyReducer,
  type StudyState,
} from './studySession';
import type { Flashcard } from './models';

const card = (id: string): Flashcard => ({ id, word: id, translation: `${id}-tr`, example: '' });
const cards = [card('a'), card('b'), card('c')];

const init = (): StudyState => initialStudyState(cards);

const run = (s: StudyState, ...actions: Parameters<typeof studyReducer>[1][]) =>
  actions.reduce((acc, a) => studyReducer(acc, a), s);

describe('studySession initial', () => {
  it('seeds index 0, all filter, tracking on, active round = all', () => {
    const s = init();
    expect(s.currentCardIndex).toBe(0);
    expect(s.selectedFilter).toBe('all');
    expect(s.trackProgress).toBe(true);
    expect(s.activeRoundCardIDs).toEqual(['a', 'b', 'c']);
    expect(activeCard(s)?.id).toBe('a');
  });
});

describe('known / unknown', () => {
  it('KNOWN marks studied and advances', () => {
    const s = run(init(), { type: 'KNOWN' });
    expect(s.studiedCardIDs.has('a')).toBe(true);
    expect(s.currentCardIndex).toBe(1);
  });

  it('UNKNOWN marks learning and advances', () => {
    const s = run(init(), { type: 'UNKNOWN' });
    expect(s.learningCardIDs.has('a')).toBe(true);
    expect(s.studiedCardIDs.has('a')).toBe(false);
    expect(s.currentCardIndex).toBe(1);
  });

  it('finishing the last card shows the round-finish when tracking', () => {
    const s = run(init(), { type: 'KNOWN' }, { type: 'UNKNOWN' }, { type: 'KNOWN' });
    expect(s.isShowingRoundFinish).toBe(true);
    const stats = roundStats(s);
    expect(stats.total).toBe(3);
    expect(stats.known).toBe(2);
    expect(stats.learning).toBe(1);
  });

  it('does not track when trackProgress is off', () => {
    const s = run(init(), { type: 'SET_TRACK_PROGRESS', value: false }, { type: 'KNOWN' });
    expect(s.studiedCardIDs.size).toBe(0);
    expect(s.currentCardIndex).toBe(1);
  });
});

describe('rounds', () => {
  it('REPEAT_UNKNOWN builds a round from the learning cards', () => {
    const s = run(init(), { type: 'UNKNOWN' }, { type: 'KNOWN' }, { type: 'KNOWN' });
    // 'a' is learning; b,c known
    const repeated = studyReducer(s, { type: 'REPEAT_UNKNOWN' });
    expect(repeated.activeRoundCardIDs).toEqual(['a']);
    expect(repeated.learningCardIDs.has('a')).toBe(false);
    expect(repeated.currentCardIndex).toBe(0);
    expect(repeated.isShowingRoundFinish).toBe(false);
  });

  it('RESTART clears progress and restores all cards', () => {
    const s = run(init(), { type: 'KNOWN' }, { type: 'UNKNOWN' });
    const r = studyReducer(s, { type: 'RESTART' });
    expect(r.studiedCardIDs.size).toBe(0);
    expect(r.learningCardIDs.size).toBe(0);
    expect(r.activeRoundCardIDs).toEqual(['a', 'b', 'c']);
    expect(r.currentCardIndex).toBe(0);
  });
});

describe('filters + mastered', () => {
  it('filters the card list by studied/remaining', () => {
    const s = run(init(), { type: 'KNOWN' }); // a studied
    expect(filteredCards({ ...s, selectedFilter: 'studied' }).map((c) => c.id)).toEqual(['a']);
    expect(filteredCards({ ...s, selectedFilter: 'remaining' }).map((c) => c.id)).toEqual(['b', 'c']);
  });

  it('TOGGLE_MASTERED marks mastered + studied, then removes', () => {
    const on = studyReducer(init(), { type: 'TOGGLE_MASTERED', cardId: 'b' });
    expect(on.masteredCardIDs.has('b')).toBe(true);
    expect(on.studiedCardIDs.has('b')).toBe(true);
    const off = studyReducer(on, { type: 'TOGGLE_MASTERED', cardId: 'b' });
    expect(off.masteredCardIDs.has('b')).toBe(false);
  });
});

describe('card CRUD', () => {
  it('ADD_CARD appends to cards + round', () => {
    const s = studyReducer(init(), { type: 'ADD_CARD', card: card('d') });
    expect(s.cards.map((c) => c.id)).toContain('d');
    expect(s.activeRoundCardIDs).toContain('d');
  });

  it('SAVE_EDIT replaces a card', () => {
    const s = studyReducer(init(), { type: 'SAVE_EDIT', card: { ...card('b'), word: 'BEE' } });
    expect(s.cards.find((c) => c.id === 'b')?.word).toBe('BEE');
  });

  it('DELETE_CARD removes and clamps the index', () => {
    const s = run(init(), { type: 'KNOWN' }, { type: 'KNOWN' }); // index 2
    const d = studyReducer(s, { type: 'DELETE_CARD', cardId: 'c' });
    expect(d.cards.map((x) => x.id)).toEqual(['a', 'b']);
    expect(counts(d).all).toBe(2);
    expect(d.currentCardIndex).toBeLessThanOrEqual(1);
  });
});
