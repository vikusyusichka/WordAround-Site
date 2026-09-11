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

  it('comparison with a second form → multipleChoice between the two', () => {
    const qs = generateLocalQuestions(
      [
        block('comparison', 'ser for identity', { secondaryText: 'estar for state' }),
        block('paragraph', 'Both verbs translate as "to be" in English'),
      ],
      5,
      new Set<GrammarQuizQuestionType>(['multipleChoice']),
    );
    const mc = qs.find((q) => q.type === 'multipleChoice');
    expect(mc).toBeDefined();
    expect(mc!.questionText).toContain('Which form is used for');
    expect(mc!.options).toEqual(
      ['Both are correct', 'Neither applies', 'estar for state', 'ser for identity'],
    );
    expect(mc!.correctAnswer).toBe('ser for identity');
    expect(mc!.explanation).toBe('Compare: ser for identity vs estar for state');
  });

  it('comparison falls back to shortAnswer, phrased by whether a second form exists', () => {
    const withSecond = generateLocalQuestions(
      [
        block('comparison', 'por', { secondaryText: 'para' }),
        block('comparison', 'ser', { secondaryText: 'estar' }),
      ],
      1,
      new Set<GrammarQuizQuestionType>(['shortAnswer']),
    );
    expect(withSecond[0].questionText).toBe('What is the difference between "por" and "para"?');
    expect(withSecond[0].correctAnswer).toBe('por vs para');

    const alone = generateLocalQuestions(
      [block('comparison', 'the subjunctive'), block('comparison', 'the indicative')],
      1,
      new Set<GrammarQuizQuestionType>(['shortAnswer']),
    );
    expect(alone[0].questionText).toBe('When do you use: "the subjunctive"?');
    expect(alone[0].correctAnswer).toBe('the subjunctive');
  });

  it('exercise blocks are quizzable, like paragraphs', () => {
    const qs = generateLocalQuestions(
      [
        block('exercise', 'Rewrite each sentence using the past continuous tense'),
        block('exercise', 'Fill the gaps with the correct preposition of place'),
      ],
      2,
      new Set<GrammarQuizQuestionType>(['shortAnswer']),
    );
    expect(qs).toHaveLength(2);
    expect(qs[0].questionText).toContain('Explain in your own words');
  });

  /* The gate and the generator have to agree on what counts as content, or the
     learner is told the wrong thing about a note that cannot be quizzed. */
  it('subheading and image are not usable — reports notEnoughContent, not a type mismatch', () => {
    try {
      generateLocalQuestions(
        [
          block('rule', 'Use ser for identity and origin'),
          block('subheading', 'When to use each one'),
          block('image', 'A diagram of the two verbs'),
        ],
        5,
        ALL,
      );
      expect.unreachable();
    } catch (e) {
      expect((e as GrammarQuizGeneratorError).code).toBe('notEnoughContent');
    }
  });

  it('a rule with no detail asks what it states, not to explain it', () => {
    const [q] = generateLocalQuestions(
      [
        block('rule', 'Adjectives agree with the noun in gender and number'),
        block('quote', 'Agreement is the backbone of Spanish grammar'),
      ],
      1,
      new Set<GrammarQuizQuestionType>(['shortAnswer']),
    );
    expect(q.questionText).toBe('What does this grammar rule state?');

    const [detailed] = generateLocalQuestions(
      [
        block('rule', 'Adjectives agree with the noun', { secondaryText: 'in gender and number' }),
        block('quote', 'Agreement is the backbone of Spanish grammar'),
      ],
      1,
      new Set<GrammarQuizQuestionType>(['shortAnswer']),
    );
    expect(detailed.questionText).toContain('Explain this grammar rule');
    expect(detailed.correctAnswer).toBe('in gender and number');
  });
});
