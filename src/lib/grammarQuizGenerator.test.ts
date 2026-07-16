import { describe, expect, it } from 'vitest';

import { generateLocalQuestions, GrammarQuizGeneratorError } from './grammarQuizGenerator';
import type { GrammarNoteBlock, GrammarQuizQuestionType } from './models';

const block = (
  type: GrammarNoteBlock['type'],
  text: string,
  extra?: Partial<GrammarNoteBlock>,
): GrammarNoteBlock => ({
  id: crypto.randomUUID(),
  type,
  text,
  items: [],
  order: 0,
  ...extra,
});

const ALL: Set<GrammarQuizQuestionType> = new Set([
  'multipleChoice', 'trueFalse', 'fillGap', 'shortAnswer',
]);

describe('generateLocalQuestions', () => {
  it('throws notEnoughContent with fewer than 2 usable blocks', () => {
    expect(() =>
      generateLocalQuestions([block('rule', 'Use ser for identity')], 5, ALL),
    ).toThrowError(GrammarQuizGeneratorError);
    try {
      generateLocalQuestions([block('rule', 'x'), block('heading', 'H'), block('divider', '-')], 5, ALL);
      expect.unreachable();
    } catch (e) {
      expect((e as GrammarQuizGeneratorError).code).toBe('notEnoughContent');
    }
  });

  it('heading and divider blocks are not usable', () => {
    const qs = generateLocalQuestions(
      [
        block('heading', 'Big heading'),
        block('rule', 'Use ser for permanent traits'),
        block('warning', 'Never use estar for professions'),
      ],
      5,
      ALL,
    );
    // heading contributes nothing; rule + warning both produce questions
    expect(qs).toHaveLength(2);
  });

  it('prioritizes rule > warning > example blocks', () => {
    const qs = generateLocalQuestions(
      [
        block('paragraph', 'A paragraph long enough to be usable for questions'),
        block('example', 'Yo soy alto y ella es baja hoy', { secondaryText: 'ser for traits' }),
        block('rule', 'Ser describes permanent qualities of things'),
      ],
      1,
      new Set<GrammarQuizQuestionType>(['shortAnswer']),
    );
    expect(qs).toHaveLength(1);
    expect(qs[0].questionText).toContain('grammar rule');
  });

  it('warning → trueFalse with correct answer True', () => {
    const qs = generateLocalQuestions(
      [
        block('warning', 'Saying "I am agree" instead of "I agree"'),
        block('rule', 'Agree is a verb, not an adjective'),
      ],
      5,
      new Set<GrammarQuizQuestionType>(['trueFalse']),
    );
    const tf = qs.find((q) => q.type === 'trueFalse');
    expect(tf).toBeDefined();
    expect(tf!.correctAnswer).toBe('True');
    expect(tf!.options).toEqual(['True', 'False']);
  });

  it('fillGap replaces an interior non-stopword with _____', () => {
    const qs = generateLocalQuestions(
      [
        block('example', 'She has been studying Spanish daily'),
        block('rule', 'Present perfect continuous shows duration'),
      ],
      5,
      new Set<GrammarQuizQuestionType>(['fillGap']),
    );
    const gap = qs.find((q) => q.type === 'fillGap');
    expect(gap).toBeDefined();
    expect(gap!.questionText).toContain('_____');
    // first interior candidate: "has" is len 3 > 2 and not in stopwords? "has" not in the set → picked
    expect(gap!.correctAnswer).toBe('has');
    expect(gap!.questionText).not.toContain(' has ');
  });

  it('fillGap needs at least 4 words — throws when no block qualifies', () => {
    try {
      generateLocalQuestions(
        [
          block('example', 'Soy alto'),
          block('example', 'Estoy cansado'),
          block('rule', 'Ser vs estar distinction matters here'),
        ],
        5,
        new Set<GrammarQuizQuestionType>(['fillGap']),
      );
      expect.unreachable();
    } catch (e) {
      expect((e as GrammarQuizGeneratorError).code).toBe('noMatchingQuestionTypes');
    }
  });

  it('rule → multipleChoice needs ≥2 distractors and includes the correct answer', () => {
    const qs = generateLocalQuestions(
      [
        block('rule', 'Use ser for identity and origin'),
        block('paragraph', 'Estar is used for temporary states and moods'),
        block('quote', 'Location always takes estar in Spanish sentences'),
      ],
      5,
      new Set<GrammarQuizQuestionType>(['multipleChoice']),
    );
    const mc = qs.find((q) => q.type === 'multipleChoice');
    expect(mc).toBeDefined();
    expect(mc!.options.length).toBeGreaterThanOrEqual(3);
    expect(mc!.options.length).toBeLessThanOrEqual(4);
    expect(mc!.options).toContain(mc!.correctAnswer);
  });

  it('short paragraph (≤25 chars) yields no question', () => {
    try {
      generateLocalQuestions(
        [block('paragraph', 'Too short'), block('quote', 'Also very short')],
        5,
        new Set<GrammarQuizQuestionType>(['shortAnswer']),
      );
      expect.unreachable();
    } catch (e) {
      expect((e as GrammarQuizGeneratorError).code).toBe('noMatchingQuestionTypes');
    }
  });

  it('caps the number of questions at count', () => {
    const qs = generateLocalQuestions(
      [
        block('rule', 'Rule one about grammar structure'),
        block('warning', 'Warning one about common errors'),
        block('example', 'Example sentence with enough words inside', { secondaryText: 'detail' }),
        block('paragraph', 'A long paragraph explaining the grammar in detail'),
      ],
      2,
      ALL,
    );
    expect(qs).toHaveLength(2);
    expect(qs.map((q) => q.order)).toEqual([0, 1]);
  });
});
