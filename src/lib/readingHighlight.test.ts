import { describe, expect, it } from 'vitest';

import { isHighlightableWord, isVocabularyTerm, tokenizeParagraph } from './readingHighlight';

describe('isHighlightableWord', () => {
  it('needs 7+ letters and not a common word', () => {
    expect(isHighlightableWord('lighthouse')).toBe(true);
    expect(isHighlightableWord('cat')).toBe(false); // too short
    expect(isHighlightableWord('because')).toBe(false); // common
    expect(isHighlightableWord('through')).toBe(false); // common
    expect(isHighlightableWord('123456789')).toBe(false); // not letters
  });
});

describe('isVocabularyTerm', () => {
  it('case-insensitive match', () => {
    expect(isVocabularyTerm('Casa', ['casa', 'perro'])).toBe(true);
    expect(isVocabularyTerm('gato', ['casa'])).toBe(false);
  });
});

describe('tokenizeParagraph', () => {
  it('splits words and separators, min word length 2', () => {
    const tokens = tokenizeParagraph("Marta's lamp, aglow — a beacon.");
    const words = tokens.filter((t) => t.isWord).map((t) => t.text);
    expect(words).toEqual(["Marta's", 'lamp', 'aglow', 'beacon']);
    // single-letter "a" is not a word token
    const single = tokens.find((t) => t.text === 'a');
    expect(single?.isWord).toBe(false);
    // round-trips exactly
    expect(tokens.map((t) => t.text).join('')).toBe("Marta's lamp, aglow — a beacon.");
  });
});
