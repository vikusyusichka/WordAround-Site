/* Deterministic "Smart Local" quiz generation — web port of the iOS
   GrammarQuizGenerator (Domain/GrammarQuizGenerator.swift). All question texts,
   prefix caps and the stopword set match iOS verbatim.

   The web note model carries the same 15 block types the editor offers, so
   every block type iOS quizzes from is quizzable here too. `bulletList` is the
   one addition: iOS has no such block, and its items read like a paragraph. */
import type {
  GrammarNoteBlock,
  GrammarQuizQuestion,
  GrammarQuizQuestionType,
} from '@/lib/models';

export type GrammarQuizGeneratorErrorCode = 'notEnoughContent' | 'noMatchingQuestionTypes';

export class GrammarQuizGeneratorError extends Error {
  code: GrammarQuizGeneratorErrorCode;
  constructor(code: GrammarQuizGeneratorErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const trim = (s: string) => s.trim();

/* Blocks that can seed a question. Headings, dividers and images carry no
   quizzable text — counting them toward the "at least two usable blocks" gate
   let a note through that then produced no questions at all, and the learner
   got "no matching question types" when the honest answer was "not enough
   content". */
const isUsable = (b: GrammarNoteBlock) =>
  trim(b.text).length > 0 &&
  b.type !== 'divider' &&
  b.type !== 'heading' &&
  b.type !== 'subheading' &&
  b.type !== 'image';

/* iOS priority map. */
const PRIORITY: Partial<Record<GrammarNoteBlock['type'], number>> = {
  rule: 0,
  warning: 1,
  example: 2,
  comparison: 3,
  exercise: 4,
  quote: 5,
  paragraph: 6,
};
const priorityOf = (type: GrammarNoteBlock['type']) => PRIORITY[type] ?? 99;

/* iOS 35-word stopword set for fill-gap candidate words. */
const SKIP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'in',
  'on', 'at', 'of', 'and', 'or', 'but', 'it', 'he', 'she',
  'we', 'they', 'do', 'did', 'have', 'had', 'i', 'you', 'be',
  'not', 'this', 'that', 'with', 'for', 'as', 'by', 'from',
]);

const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);
const isAlphanumericWord = (word: string) => [...word].every(isWordChar);

const makeQuestion = (
  partial: Omit<GrammarQuizQuestion, 'id' | 'options'> & { options?: string[] },
): GrammarQuizQuestion => ({
  id: crypto.randomUUID(),
  options: [],
  ...partial,
});

const fillGapQuestion = (
  text: string,
  explanation: string | undefined,
  order: number,
): GrammarQuizQuestion | null => {
  const words = text.split(' ').filter((w) => w.length > 0);
  if (words.length < 4) return null;

  const candidates = words
    .map((_, i) => i)
    .filter(
      (i) =>
        i > 0 &&
        i < words.length - 1 &&
        words[i].length > 2 &&
        !SKIP_WORDS.has(words[i].toLowerCase()) &&
        isAlphanumericWord(words[i]),
    );

  const gapIndex = candidates[0] ?? Math.floor(words.length / 2);
  const removed = words[gapIndex];
  const filled = [...words];
  filled[gapIndex] = '_____';

  return makeQuestion({
    type: 'fillGap',
    questionText: `Fill in the gap: ${filled.join(' ')}`,
    correctAnswer: removed,
    explanation,
    order,
  });
};

const ruleQuestion = (
  block: GrammarNoteBlock,
  allTexts: string[],
  types: Set<GrammarQuizQuestionType>,
  order: number,
): GrammarQuizQuestion | null => {
  const text = trim(block.text);

  if (types.has('multipleChoice')) {
    const correct = text.slice(0, 90);
    const distractors = allTexts
      .filter((t) => trim(t) !== text && t.length > 0)
      .slice(0, 3)
      .map((t) => t.slice(0, 90));
    if (distractors.length >= 2) {
      const options = [correct, ...distractors].sort();
      return makeQuestion({
        type: 'multipleChoice',
        questionText: 'Which of the following states a correct grammar rule?',
        options: options.slice(0, 4),
        correctAnswer: correct,
        explanation: block.secondaryText,
        order,
      });
    }
  }

  if (types.has('shortAnswer')) {
    const secondary = block.secondaryText ? trim(block.secondaryText) : '';
    const answer = secondary.length > 0 ? secondary : text;
    /* iOS branches on secondaryText being nil. The web editor's makeBlock seeds
       rule blocks with '', so "never filled in" is the empty string here —
       testing for `undefined` made the second prompt unreachable. */
    const q = secondary.length > 0
      ? `Explain this grammar rule: "${text.slice(0, 70)}"`
      : 'What does this grammar rule state?';
    return makeQuestion({
      type: 'shortAnswer',
      questionText: q,
      correctAnswer: answer.slice(0, 140),
      explanation: block.secondaryText,
      order,
    });
  }

  return null;
};

const warningQuestion = (
  block: GrammarNoteBlock,
  types: Set<GrammarQuizQuestionType>,
  order: number,
): GrammarQuizQuestion | null => {
  const text = trim(block.text);

  if (types.has('trueFalse')) {
    return makeQuestion({
      type: 'trueFalse',
      questionText: `True or False: "${text.slice(0, 100)}" is a common grammar mistake.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: text,
      order,
    });
  }

  if (types.has('shortAnswer')) {
    return makeQuestion({
      type: 'shortAnswer',
      questionText: 'Describe this common grammar mistake.',
      correctAnswer: text.slice(0, 140),
      order,
    });
  }

  return null;
};

const exampleQuestion = (
  block: GrammarNoteBlock,
  types: Set<GrammarQuizQuestionType>,
  order: number,
): GrammarQuizQuestion | null => {
  const text = trim(block.text);

  if (types.has('fillGap')) {
    const q = fillGapQuestion(text, block.secondaryText, order);
    if (q) return q;
  }

  const secondary = block.secondaryText ? trim(block.secondaryText) : '';
  if (types.has('shortAnswer') && secondary.length > 0) {
    return makeQuestion({
      type: 'shortAnswer',
      questionText: `What does this example illustrate: "${text.slice(0, 70)}"?`,
      correctAnswer: secondary.slice(0, 140),
      order,
    });
  }

  return null;
};

/* A comparison block holds two forms — `text` is the one that applies,
   `secondaryText` the one it is set against. */
const comparisonQuestion = (
  block: GrammarNoteBlock,
  types: Set<GrammarQuizQuestionType>,
  order: number,
): GrammarQuizQuestion | null => {
  const text = trim(block.text);
  const secondary = block.secondaryText ? trim(block.secondaryText) : '';

  if (types.has('multipleChoice') && secondary.length > 0) {
    const options = [text, secondary, 'Neither applies', 'Both are correct'].sort();
    return makeQuestion({
      type: 'multipleChoice',
      questionText: `Which form is used for: "${text.slice(0, 60)}"?`,
      options: options.slice(0, 4),
      correctAnswer: text,
      explanation: `Compare: ${text} vs ${secondary}`,
      order,
    });
  }

  if (types.has('shortAnswer')) {
    const q =
      secondary.length === 0
        ? `When do you use: "${text.slice(0, 70)}"?`
        : `What is the difference between "${text.slice(0, 40)}" and "${secondary.slice(0, 40)}"?`;
    return makeQuestion({
      type: 'shortAnswer',
      questionText: q,
      correctAnswer: secondary.length === 0 ? text : `${text} vs ${secondary}`,
      order,
    });
  }

  return null;
};

const paragraphQuestion = (
  block: GrammarNoteBlock,
  types: Set<GrammarQuizQuestionType>,
  order: number,
): GrammarQuizQuestion | null => {
  const text = trim(block.text);
  if (text.length <= 25) return null;

  if (types.has('fillGap')) {
    const q = fillGapQuestion(text, undefined, order);
    if (q) return q;
  }

  if (types.has('shortAnswer')) {
    return makeQuestion({
      type: 'shortAnswer',
      questionText: `Explain in your own words: "${text.slice(0, 80)}"`,
      correctAnswer: text.slice(0, 160),
      order,
    });
  }

  return null;
};

const questionFromBlock = (
  block: GrammarNoteBlock,
  allTexts: string[],
  types: Set<GrammarQuizQuestionType>,
  order: number,
): GrammarQuizQuestion | null => {
  if (trim(block.text).length === 0) return null;
  switch (block.type) {
    case 'rule':
      return ruleQuestion(block, allTexts, types, order);
    case 'warning':
      return warningQuestion(block, types, order);
    case 'example':
      return exampleQuestion(block, types, order);
    case 'comparison':
      return comparisonQuestion(block, types, order);
    /* iOS puts exercise in the paragraph branch; bulletList is the web's own
       block and reads the same way. */
    case 'exercise':
    case 'quote':
    case 'paragraph':
    case 'bulletList':
      return paragraphQuestion(block, types, order);
    default:
      return null;
  }
};

/** Generate up to `count` questions from note blocks — no AI, deterministic. */
export const generateLocalQuestions = (
  blocks: GrammarNoteBlock[],
  count: number,
  types: Set<GrammarQuizQuestionType>,
): GrammarQuizQuestion[] => {
  const usable = blocks.filter(isUsable);
  if (usable.length < 2) {
    throw new GrammarQuizGeneratorError(
      'notEnoughContent',
      'Add more note content before creating a quiz. A quiz needs at least two usable blocks (rule, example, comparison, warning, exercise, paragraph or quote).',
    );
  }

  const allTexts = usable
    .flatMap((b) => [
      b.text,
      ...(b.secondaryText && b.secondaryText.length > 0 ? [b.secondaryText] : []),
      ...b.items.filter((i) => i.length > 0),
    ])
    .filter((t) => t.length > 0);

  const prioritized = [...usable].sort((a, b) => priorityOf(a.type) - priorityOf(b.type));

  const questions: GrammarQuizQuestion[] = [];
  for (const block of prioritized) {
    if (questions.length >= count) break;
    const q = questionFromBlock(block, allTexts, types, questions.length);
    if (q) questions.push(q);
  }

  if (questions.length === 0) {
    throw new GrammarQuizGeneratorError(
      'noMatchingQuestionTypes',
      'Not enough matching content was found for the selected question types. Try enabling more question types or add more note content.',
    );
  }
  return questions;
};
