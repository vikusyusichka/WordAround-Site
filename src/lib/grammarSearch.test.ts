import { describe, expect, it } from 'vitest';

import { makeGrammarNote } from './grammarFactories';
import {
  makePlainText,
  makeSearchableText,
  noteMatchesQuery,
  normalizeSearchText,
  searchSnippet,
} from './grammarSearch';
import type { GrammarNoteBlock } from './models';

const block = (patch: Partial<GrammarNoteBlock>): GrammarNoteBlock => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  text: '',
  items: [],
  order: 0,
  ...patch,
});

describe('normalizeSearchText', () => {
  it('lowercases, strips diacritics and collapses whitespace', () => {
    expect(normalizeSearchText('  Está   ALTÍSIMO ')).toBe('esta altisimo');
  });

  it('is empty for whitespace only', () => {
    expect(normalizeSearchText('   \n ')).toBe('');
  });
});

describe('makePlainText', () => {
  it('joins text, secondary text, items and captions, skipping empties', () => {
    const out = makePlainText([
      block({ text: 'Use ser', secondaryText: 'identity' }),
      block({ text: '', items: ['el libro', '', 'la mesa'] }),
      block({ type: 'image', text: '', imageCaption: 'Chart' }),
    ]);
    expect(out).toBe('Use ser\nidentity\nel libro\nla mesa\nChart');
  });
});

describe('makeSearchableText', () => {
  it('indexes title, preview, note type, tags and every block', () => {
    const blob = makeSearchableText({
      title: 'Ser vs Estar',
      previewText: 'Identity vs state',
      tags: ['A1', 'verbs'],
      noteType: 'rule',
      blocks: [block({ text: 'Soy alto', secondaryText: 'I am tall' })],
    });
    for (const part of ['ser vs estar', 'identity vs state', 'rule', 'a1', 'verbs', 'soy alto', 'i am tall']) {
      expect(blob).toContain(part);
    }
  });
});

describe('noteMatchesQuery', () => {
  const note = makeGrammarNote({
    ownerUID: 'u',
    topicId: 't',
    title: 'Ser vs Estar',
    previewText: 'Identity vs state',
    tags: ['verbs'],
    contentBlocks: [block({ text: 'Estoy cansado' })],
  });

  it('matches on any indexed field, ignoring case and accents', () => {
    expect(noteMatchesQuery(note, 'estar')).toBe(true);
    expect(noteMatchesQuery(note, 'CANSADO')).toBe(true);
    expect(noteMatchesQuery(note, 'verbs')).toBe(true);
    expect(noteMatchesQuery(note, 'subjunctive')).toBe(false);
  });

  it('an empty query matches everything', () => {
    expect(noteMatchesQuery(note, '   ')).toBe(true);
  });

  it('rebuilds the index when the note was saved before it existed', () => {
    expect(noteMatchesQuery({ ...note, searchableText: '' }, 'cansado')).toBe(true);
  });
});

describe('searchSnippet', () => {
  it('returns the passage around the hit, ellipsed where it was cut', () => {
    const note = makeGrammarNote({
      ownerUID: 'u',
      topicId: 't',
      title: 'Long note',
      contentBlocks: [block({ text: `${'x'.repeat(80)} needle ${'y'.repeat(200)}` })],
    });
    const snippet = searchSnippet(note, 'needle');
    expect(snippet).toContain('needle');
    expect(snippet?.startsWith('…')).toBe(true);
    expect(snippet?.endsWith('…')).toBe(true);
  });

  it('is undefined without a query or a hit', () => {
    const note = makeGrammarNote({ ownerUID: 'u', topicId: 't', title: 'x' });
    expect(searchSnippet(note, '')).toBeUndefined();
    expect(searchSnippet(note, 'nope')).toBeUndefined();
  });
});
