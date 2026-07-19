import { beforeEach, describe, expect, it, vi } from 'vitest';

const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock('@/lib/aiClient', () => ai);

import {
  buildFromSetPrompt,
  effectiveTargetWordCount,
  extractVocabulary,
  FromSetError,
  generateFromSetItem,
  vocabularyTermsFor,
} from './readingFromSets';
import type { FlashcardSet, ReadingLibraryItem } from './models';

const set = (words: [string, string][]): FlashcardSet => ({
  id: 's1',
  ownerUID: 'u1',
  ownerEmail: 'e',
  title: 'Spanish Basics',
  description: '',
  privacy: 'private',
  colorHex: '#fff',
  icon: { type: 'systemName', value: 'star.fill' },
  cards: words.map(([word, translation], i) => ({
    id: `c${i}`, word, translation, example: '',
  })),
  createdAt: 0,
  updatedAt: 0,
});

describe('extractVocabulary', () => {
  it('dedupes case-insensitively and keeps translations', () => {
    const vocab = extractVocabulary(
      set([['casa', 'house'], ['CASA', 'house'], ['perro', 'dog'], ['gato', ''], ['sol', 'sun'], ['luna', 'moon']]),
    );
    expect(vocab.words.map((w) => w.term)).toEqual(['casa', 'perro', 'gato', 'sol', 'luna']);
    expect(vocab.words[0].translation).toBe('house');
    expect(vocab.words[2].translation).toBeUndefined();
  });

  it('throws below 5 words', () => {
    expect(() => extractVocabulary(set([['a', ''], ['b', ''], ['c', ''], ['d', '']]))).toThrow(FromSetError);
  });
});

describe('buildFromSetPrompt (iOS verbatim)', () => {
  const vocab = extractVocabulary(
    set([['casa', 'house'], ['perro', 'dog'], ['gato', 'cat'], ['sol', 'sun'], ['luna', 'moon']]),
  );

  it('includes coverage rule, vocab lines, mode + focus + examples', () => {
    const prompt = buildFromSetPrompt({
      vocabulary: vocab,
      targetLanguageId: 'english',
      difficulty: 'B1',
      length: 'medium',
      generationMode: 'natural',
      readingFocus: 'mainIdea',
    });
    expect(prompt).toContain('Generate a B1 level reading text in English.');
    expect(prompt).toContain('"Spanish Basics" (5 words)');
    expect(prompt).toContain('- casa (house)');
    expect(prompt).toContain('CRITICAL: Every vocabulary word listed above must appear at least once');
    expect(prompt).toContain('Generation mode — Natural');
    expect(prompt).toContain('Reading focus: Main Idea.');
    expect(prompt).toContain('Example of GOOD output');
  });

  it('effectiveTargetWordCount = max(length target, words*4)', () => {
    const base = { vocabulary: vocab, targetLanguageId: 'english', difficulty: 'B1' as const, generationMode: 'natural' as const, readingFocus: 'mainIdea' as const };
    expect(effectiveTargetWordCount({ ...base, length: 'short' })).toBe(120); // 5*4=20 < 120
    const bigVocab = { ...vocab, words: Array.from({ length: 100 }, (_, i) => ({ term: `w${i}` })) };
    expect(effectiveTargetWordCount({ ...base, vocabulary: bigVocab, length: 'short' })).toBe(400);
  });
});

describe('generateFromSetItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('builds the library item with vocab metadata + tags', async () => {
    ai.generateText.mockResolvedValue(
      'The casa was quiet. The perro slept beside the gato while the sol set and the luna rose over the hills of the town.',
    );
    const vocab = extractVocabulary(
      set([['casa', 'house'], ['perro', 'dog'], ['gato', 'cat'], ['sol', 'sun'], ['luna', 'moon']]),
    );
    const item = await generateFromSetItem(
      {
        vocabulary: vocab,
        targetLanguageId: 'english',
        difficulty: 'A2',
        length: 'short',
        generationMode: 'mixed',
        readingFocus: 'vocabulary',
      },
      'u1',
    );
    expect(ai.generateText.mock.calls[0][0].task).toBe('reading_from_set');
    expect(item.modeID).toBe('reading-from-sets');
    expect(item.sourceType).toBe('flashcardSet');
    expect(item.sourceId).toBe('s1');
    expect(item.title).toBe('Spanish Basics — Reading');
    expect(item.tags).toEqual(['Spanish Basics', '5 words']);
    expect(JSON.parse(item.selections['source.vocabularyTerms'])).toEqual([
      'casa', 'perro', 'gato', 'sol', 'luna',
    ]);
    expect(vocabularyTermsFor(item)).toEqual(['casa', 'perro', 'gato', 'sol', 'luna']);
  });

  it('vocabularyTermsFor tolerates missing/corrupt metadata', () => {
    const item = { selections: {} } as ReadingLibraryItem;
    expect(vocabularyTermsFor(item)).toEqual([]);
    expect(
      vocabularyTermsFor({
        selections: { 'source.vocabularyTerms': '{bad' },
      } as unknown as ReadingLibraryItem),
    ).toEqual([]);
  });
});
