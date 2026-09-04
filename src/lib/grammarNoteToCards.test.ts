import { describe, expect, it } from 'vitest';

import { makeGrammarNote } from './grammarFactories';
import { extractCardPairs } from './grammarNoteToCards';
import type { GrammarNote, GrammarNoteBlock } from './models';

const block = (patch: Partial<GrammarNoteBlock> & Pick<GrammarNoteBlock, 'type'>): GrammarNoteBlock => ({
  id: patch.id ?? `b-${patch.type}`,
  type: patch.type,
  text: patch.text ?? '',
  secondaryText: patch.secondaryText,
  items: patch.items ?? [],
  order: patch.order ?? 0,
});

const noteWith = (blocks: GrammarNoteBlock[]): GrammarNote => ({
  ...makeGrammarNote({ ownerUID: 'u', topicId: 't', title: 'Phrasal verbs' }),
  contentBlocks: blocks,
});

describe('extractCardPairs', () => {
  it('turns a two-sided block into one card', () => {
    for (const type of ['comparison', 'example', 'rule'] as const) {
      const pairs = extractCardPairs(
        noteWith([block({ type, text: 'hacer', secondaryText: 'to do' })]),
      );
      expect(pairs).toHaveLength(1);
      expect(pairs[0].word).toBe('hacer');
      expect(pairs[0].translation).toBe('to do');
    }
  });

  it('ignores a two-sided block with only one side filled in', () => {
    expect(extractCardPairs(noteWith([block({ type: 'rule', text: 'Use ser' })]))).toEqual([]);
    expect(
      extractCardPairs(noteWith([block({ type: 'rule', text: '', secondaryText: 'to be' })])),
    ).toEqual([]);
  });

  it('splits list items on the separator they were written with', () => {
    const pairs = extractCardPairs(
      noteWith([
        block({
          type: 'bulletList',
          items: ['hacer — to do', 'poner – to put', 'salir - to leave', 'venir: to come'],
        }),
      ]),
    );
    expect(pairs.map((p) => [p.word, p.translation])).toEqual([
      ['hacer', 'to do'],
      ['poner', 'to put'],
      ['salir', 'to leave'],
      ['venir', 'to come'],
    ]);
  });

  it('skips list items that are not pairs', () => {
    const pairs = extractCardPairs(
      noteWith([
        block({ type: 'bulletList', items: ['Just a reminder', 'hacer — to do', '', '   '] }),
      ]),
    );
    expect(pairs).toHaveLength(1);
  });

  /* A hyphen inside a word must not become a split point, or "check-in" turns
     into a card with an empty side. */
  it('does not split a hyphenated word', () => {
    const pairs = extractCardPairs(
      noteWith([block({ type: 'bulletList', items: ['check-in — реєстрація'] })]),
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe('check-in');
    expect(pairs[0].translation).toBe('реєстрація');
  });

  /* Prose is about the language rather than a pair to be tested on; guessing
     a front and back out of it makes cards nobody can answer. */
  it('leaves prose blocks alone', () => {
    const pairs = extractCardPairs(
      noteWith([
        block({ type: 'heading', text: 'Ser vs estar' }),
        block({ type: 'paragraph', text: 'Both mean "to be" but differ in use.' }),
        block({ type: 'warning', text: 'Never use estar for professions.' }),
        block({ type: 'quote', text: 'Soy profesor.' }),
        block({ type: 'divider' }),
      ]),
    );
    expect(pairs).toEqual([]);
  });

  it('drops a pair the note states twice', () => {
    const pairs = extractCardPairs(
      noteWith([
        block({ id: 'b1', type: 'rule', text: 'hacer', secondaryText: 'to do', order: 0 }),
        block({ id: 'b2', type: 'example', text: 'Hacer', secondaryText: 'To do', order: 1 }),
      ]),
    );
    expect(pairs).toHaveLength(1);
  });

  it('follows block order and gives every pair a distinct id', () => {
    const pairs = extractCardPairs(
      noteWith([
        block({ id: 'b2', type: 'rule', text: 'second', secondaryText: '2', order: 1 }),
        block({ id: 'b1', type: 'rule', text: 'first', secondaryText: '1', order: 0 }),
      ]),
    );
    expect(pairs.map((p) => p.word)).toEqual(['first', 'second']);
    expect(new Set(pairs.map((p) => p.id)).size).toBe(2);
  });

  it('returns nothing for an empty note', () => {
    expect(extractCardPairs(noteWith([]))).toEqual([]);
  });
});
