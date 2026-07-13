import { describe, expect, it } from 'vitest';

import type { GrammarIssue } from './essayTypes';
import { normalizedWords, scoreEssay, topicProfileFor } from './essayScoring';

const noIssues: GrammarIssue[] = [];

const baseInput = (overrides: Partial<Parameters<typeof scoreEssay>[0]> = {}) => ({
  text: '',
  topic: 'General',
  wordLimitMin: 90,
  wordLimitMax: 150,
  grammarIssues: noIssues,
  usedHints: 0,
  usedTranslations: 0,
  usedSynonyms: 0,
  difficulty: 'B1' as const,
  ...overrides,
});

describe('normalizedWords', () => {
  it('lowercases + splits on any non-letter', () => {
    expect(normalizedWords('Hello, world! 123 foo')).toEqual(['hello', 'world', 'foo']);
  });

  it('empty input → empty array', () => {
    expect(normalizedWords('   ')).toEqual([]);
  });

  it('handles Cyrillic letters as letters', () => {
    expect(normalizedWords('Моє хобі — читати')).toEqual(['моє', 'хобі', 'читати']);
  });
});

describe('topicProfileFor', () => {
  it('matches known topic by substring', () => {
    const p = topicProfileFor('My favorite season');
    expect(p.requiredKeywords.has('season')).toBe(true);
  });

  it('falls back to title long-word set for unknown topics', () => {
    const p = topicProfileFor('Robotics research');
    expect(p.requiredKeywords.has('robotics')).toBe(true);
    expect(p.requiredKeywords.has('research')).toBe(true);
    expect(p.supportingKeywords.size).toBe(0);
  });
});

describe('scoreEssay', () => {
  it('empty text scores everything at 0 except independence=100', () => {
    const s = scoreEssay(baseInput({ text: '' }));
    expect(s.grammar).toBe(0);
    expect(s.vocabulary).toBe(0);
    expect(s.length).toBe(0);
    expect(s.relevance).toBe(0);
    expect(s.independence).toBe(100);
    expect(s.total).toBeLessThan(20);
  });

  it('perfect essay on a known topic scores high', () => {
    const text = [
      'My favorite season is spring. During spring the weather becomes warm and sunny.',
      'I like spring because I can spend time outside with my friends.',
      'For example, we usually go to the park after lunch and play games.',
      'On the other hand, summer is too hot for me and winter is too cold.',
      'Autumn is beautiful, however, the rainy weather sometimes stops our activities.',
      'Therefore, spring is truly my favorite season because temperature is perfect.',
      'I also like the flowers, colors, and gentle wind that spring brings every year.',
      'Finally, spring makes me feel happy and inspired to try new activities outside.',
      'In my opinion, no other season can match the joy that spring brings to everyone.',
      'I hope this small essay explains clearly why spring is truly my favorite season.',
    ].join(' ');
    const s = scoreEssay(baseInput({ text, topic: 'My favorite season' }));
    expect(s.total).toBeGreaterThanOrEqual(70);
    expect(s.grammar).toBe(100);
    expect(s.relevance).toBeGreaterThanOrEqual(60);
    expect(['B1', 'B2', 'C1']).toContain(s.cefrLevel);
    expect(['Good', 'Very good', 'Excellent']).toContain(s.qualityLabel);
  });

  it('off-topic essay triggers the relevance floor', () => {
    const text = Array.from({ length: 100 }, () => 'unrelated').join(' ');
    const s = scoreEssay(baseInput({ text, topic: 'My favorite season' }));
    expect(s.relevance).toBeLessThan(25);
    expect(s.total).toBeLessThanOrEqual(42);
  });

  it('length below minimum caps the length sub-score', () => {
    const text = Array.from({ length: 40 }, () => 'word').join(' ');
    const s = scoreEssay(baseInput({ text }));
    expect(s.length).toBeLessThanOrEqual(72);
  });

  it('length way above maximum reduces length score', () => {
    const text = Array.from({ length: 400 }, () => 'word').join(' ');
    const s = scoreEssay(baseInput({ text }));
    expect(s.length).toBeLessThan(50);
  });

  it('grammar issues drop the grammar sub-score proportional to density', () => {
    const text = Array.from({ length: 100 }, () => 'word').join(' ');
    const many: GrammarIssue[] = Array.from({ length: 10 }, (_, i) => ({
      id: `g${i}`,
      message: 'issue',
      incorrectText: 'x',
      suggestedCorrection: 'y',
      offset: 0,
      length: 1,
      category: 'grammar',
    }));
    const clean = scoreEssay(baseInput({ text }));
    const withIssues = scoreEssay(baseInput({ text, grammarIssues: many }));
    expect(withIssues.grammar).toBeLessThan(clean.grammar);
    expect(withIssues.total).toBeLessThan(clean.total);
  });

  it('stricter difficulty gives a lower grammar sub-score for the same issues', () => {
    const text = Array.from({ length: 100 }, () => 'word').join(' ');
    const issue: GrammarIssue = {
      id: 'g', message: 'issue', incorrectText: 'x',
      suggestedCorrection: null, offset: 0, length: 1, category: 'grammar',
    };
    const b1 = scoreEssay(baseInput({ text, grammarIssues: [issue, issue, issue] }));
    const c1 = scoreEssay(baseInput({ text, grammarIssues: [issue, issue, issue], difficulty: 'C1' }));
    expect(c1.grammar).toBeLessThan(b1.grammar);
  });

  it('using hints reduces the independence sub-score', () => {
    const text = Array.from({ length: 100 }, () => 'word').join(' ');
    const none = scoreEssay(baseInput({ text }));
    const many = scoreEssay(baseInput({ text, usedHints: 5 }));
    expect(many.independence).toBeLessThan(none.independence);
  });

  it('vocabulary richness — unique words score higher than repeated', () => {
    const repeated = Array.from({ length: 60 }, () => 'apple').join(' ');
    // Real unique letter-only words (digits get stripped by normalizedWords).
    const uniqueBank = [
      'apple', 'banana', 'cherry', 'grape', 'lemon', 'mango', 'orange', 'peach',
      'plum', 'pear', 'melon', 'kiwi', 'lime', 'guava', 'papaya', 'coconut',
      'apricot', 'walnut', 'chestnut', 'raspberry', 'blueberry', 'blackberry',
      'strawberry', 'cranberry', 'fig', 'date', 'olive', 'tomato', 'potato', 'carrot',
      'cabbage', 'lettuce', 'spinach', 'onion', 'garlic', 'ginger', 'parsley', 'basil',
      'thyme', 'sage', 'mint', 'pepper', 'salt', 'sugar', 'honey', 'bread', 'butter',
      'cheese', 'yogurt', 'milk', 'juice', 'water', 'coffee', 'wine', 'beer', 'tea',
      'cocoa', 'candy', 'cookie', 'cake',
    ];
    const unique = uniqueBank.join(' ');
    const r = scoreEssay(baseInput({ text: repeated }));
    const u = scoreEssay(baseInput({ text: unique }));
    expect(u.vocabulary).toBeGreaterThan(r.vocabulary);
  });

  it('short essays (< 6 words) get complexity floor of 15', () => {
    const s = scoreEssay(baseInput({ text: 'One two three four' }));
    expect(s.complexity).toBe(15);
  });

  it('CEFR: high total + high complexity + high grammar → C1', () => {
    // Craft a substantial well-connected on-topic essay so all sub-scores clear the C1 gate.
    const text = [
      'My favorite season is undoubtedly spring, because the world seems to awaken after winter.',
      'During spring, the weather grows pleasantly warm, and rainy afternoons alternate with sunny days.',
      'For example, I usually go outside to the local park with my friends after lunch.',
      'On the other hand, summer feels too hot, and winter is often uncomfortably cold, therefore spring wins.',
      'However, autumn also has its charm, although the constant wind sometimes ruins outdoor activities.',
      'In my opinion, spring perfectly balances comfortable temperature, colorful flowers, and outdoor activity opportunities.',
      'Finally, spring inspires me because every year new adventures begin, and I feel motivated to try new hobbies outside.',
      'Also, I usually plan long walks and bicycle trips whenever the sunny weather returns.',
      'Because of these reasons, spring will always remain my favorite season, no matter how the world changes.',
      'Therefore, if someone asks me which season is best, I always answer confidently with the same word: spring.',
    ].join(' ');
    const s = scoreEssay(baseInput({ text, topic: 'My favorite season' }));
    expect(s.cefrLevel).toBe('C1');
    expect(s.qualityLabel).toBe('Excellent');
  });

  it('quality label maps by total thresholds', () => {
    const bad = scoreEssay(baseInput({ text: 'bad short' }));
    expect(bad.qualityLabel).toBe('Needs work');
  });

  it('total is always clamped to [0, 100]', () => {
    const s = scoreEssay(baseInput({ text: '', usedHints: 999 }));
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(s.independence).toBe(0);
  });
});
