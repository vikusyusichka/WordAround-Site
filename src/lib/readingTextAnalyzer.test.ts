import { describe, expect, it } from 'vitest';

import {
  detectLevel,
  estimateLevel,
  estimatedReadingMinutes,
  normalizeReadingText,
  readingParagraphs,
  readingPreview,
  readingSentences,
  readingWordCount,
} from './readingTextAnalyzer';

describe('word count + minutes + preview', () => {
  it('counts whitespace-separated words', () => {
    expect(readingWordCount('one two  three\nfour')).toBe(4);
    expect(readingWordCount('   ')).toBe(0);
  });

  it('estimated minutes = ceil(words/180), min 1', () => {
    expect(estimatedReadingMinutes(10)).toBe(1);
    expect(estimatedReadingMinutes(180)).toBe(1);
    expect(estimatedReadingMinutes(181)).toBe(2);
    expect(estimatedReadingMinutes(900)).toBe(5);
  });

  it('preview caps at 120 chars with ellipsis', () => {
    const long = 'x'.repeat(200);
    expect(readingPreview(long)).toHaveLength(121);
    expect(readingPreview(long).endsWith('…')).toBe(true);
    expect(readingPreview('short text')).toBe('short text');
  });
});

describe('readingSentences', () => {
  it('splits on terminators, keeps sentences ≥ 8 chars', () => {
    const s = readingSentences('This is a sentence. Tiny. Another good one here!');
    expect(s).toEqual(['This is a sentence.', 'Another good one here!']);
  });

  it('falls back to the whole text', () => {
    expect(readingSentences('no terminator here')).toEqual(['no terminator here']);
  });
});

describe('estimateLevel bands (iOS thresholds)', () => {
  it('<40 words: avg length decides A1/A2', () => {
    expect(estimateLevel('a cat sat on a mat', 6)).toBe('A1');
    expect(estimateLevel('wonderful characters navigate marvelous adventures', 5)).toBe('A2');
  });

  it('40-89 words: sentence length decides A2/B1', () => {
    const shortSentences = Array.from({ length: 10 }, () => 'The cat sat on the mat.').join(' ');
    expect(estimateLevel(shortSentences, 60)).toBe('A2');
    const oneLong = Array.from({ length: 60 }, () => 'word').join(' ') + '.';
    expect(estimateLevel(oneLong, 60)).toBe('B1');
  });
});

describe('detectLevel (additive score)', () => {
  it('tiny simple text → A1, dense complex text → higher', () => {
    expect(detectLevel('a cat')).toBe('A1');
    const complex = Array.from(
      { length: 40 },
      () =>
        'Nevertheless, extraordinary circumstances necessitate comprehensive understanding; furthermore, sophisticated analysis (occasionally) demands persistence, dedication, and remarkable intellectual flexibility.',
    ).join(' ');
    expect(['B2', 'C1']).toContain(detectLevel(complex));
  });

  it('empty → A1', () => {
    expect(detectLevel('')).toBe('A1');
  });
});

describe('normalization', () => {
  it('strips AI boilerplate first line + markdown', () => {
    const raw = 'Here is the text you asked for:\n\n**Bold start.** Normal _italic_ words follow here.';
    const out = normalizeReadingText(raw);
    expect(out).not.toContain('Here is');
    expect(out).not.toContain('**');
    expect(out).toContain('Bold start.');
    expect(out).toContain('italic');
  });

  it('removes headings, bullets and placeholders', () => {
    const raw = '# Title\n- bullet one\nWord (Translate) appears [word] here.';
    const out = normalizeReadingText(raw);
    expect(out).not.toContain('#');
    expect(out).not.toContain('- bullet');
    expect(out).not.toMatch(/word\s*\(\s*translate\s*\)/i);
  });

  it('collapses whitespace and splits paragraphs on blank lines', () => {
    const raw = 'Para  one   text.\n\n\n\nPara two text.';
    const paragraphs = readingParagraphs(raw);
    expect(paragraphs).toEqual(['Para one text.', 'Para two text.']);
  });

  it('wraps paragraphs longer than 600 chars at sentence boundaries', () => {
    const sentence = 'This sentence is intentionally made fairly long to add characters. ';
    const raw = sentence.repeat(15).trim(); // ~1000 chars, single paragraph
    const paragraphs = readingParagraphs(raw);
    expect(paragraphs.length).toBeGreaterThan(1);
    for (const p of paragraphs) expect(p.length).toBeLessThanOrEqual(600);
  });
});
