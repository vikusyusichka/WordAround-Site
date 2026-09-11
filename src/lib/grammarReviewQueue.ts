/* Review-queue builder — web port of GrammarReviewQueueBuilder.swift, made
   fully pure: the caller passes pre-fetched notes (notesById) instead of the
   builder doing Firestore reads. Strict pool precedence (manual →
   recentlyOpened → recentlyEdited), cap 20, order preserved, items whose
   note is missing are dropped. Every card gets a question. */
import { generateLocalQuestions } from '@/lib/grammarQuizGenerator';
import type {
  GrammarBlockType,
  GrammarNote,
  GrammarNoteBlock,
  GrammarNoteQuiz,
  GrammarQuizQuestion,
  GrammarReviewItem,
} from '@/lib/models';

export type GrammarReviewSourcePool = 'manual' | 'recentlyOpened' | 'recentlyEdited';

export interface GrammarReviewCard {
  /** == reviewItem.id */
  id: string;
  reviewItem: GrammarReviewItem;
  sourcePool: GrammarReviewSourcePool;
  note: GrammarNote;
  sourceText: string;
  sourceSecondaryText?: string;
  sourceBlockType?: GrammarBlockType;
  question: GrammarQuizQuestion;
}

export interface GrammarReviewQueue {
  cards: GrammarReviewCard[];
  pool: GrammarReviewSourcePool | null;
  estimatedMinutes: number;
}

export const REVIEW_QUEUE_LIMIT = 20;

/* iOS selectBestBlock priority. `bulletList` is the web's own block, appended
   last so it is picked only when nothing iOS knows about is available. */
const BLOCK_PRIORITY: GrammarBlockType[] = [
  'quiz', 'rule', 'warning', 'comparison', 'example', 'paragraph', 'quote', 'exercise',
  'bulletList',
];

const selectBestBlock = (blocks: GrammarNoteBlock[]): GrammarNoteBlock | undefined => {
  const nonEmpty = blocks.filter((b) => b.text.trim().length > 0);
  for (const type of BLOCK_PRIORITY) {
    const match = nonEmpty.find((b) => b.type === type);
    if (match) return match;
  }
  return nonEmpty.find(
    (b) =>
      b.type !== 'heading' &&
      b.type !== 'subheading' &&
      b.type !== 'divider' &&
      b.type !== 'image',
  );
};

/* The prompt a block type gets when nothing more specific fits (iOS
   shortAnswerPrompt(for:)). */
const SHORT_ANSWER_PROMPT: Partial<Record<GrammarBlockType, string>> = {
  rule: 'Explain this grammar rule in your own words.',
  warning: 'What should you avoid here?',
  example: 'What does this example demonstrate?',
  comparison: 'Explain the difference between these two forms.',
  quote: 'What is the key idea of this quote?',
  exercise: 'Describe how you would complete this exercise.',
};

const shortAnswerPrompt = (type: GrammarBlockType): string =>
  SHORT_ANSWER_PROMPT[type] ?? 'What is the key idea of this note?';

/* iOS singleBlockQuestion heuristics. A block type with no branch of its own
   falls through to the generic tail, which is where the per-type prompt above
   earns its keep. */
const singleBlockQuestion = (block: GrammarNoteBlock): GrammarQuizQuestion | null => {
  const text = block.text.trim();
  const secondary = block.secondaryText?.trim() ?? '';
  const explanation = secondary.length > 0 ? secondary : undefined;
  const base = { id: crypto.randomUUID(), options: [] as string[], order: 0 };
  if (text.length === 0) return null;

  if (block.type === 'quiz') {
    const answer = secondary.length > 0 ? secondary : text;
    if (answer.length === 0) return null;
    return {
      ...base,
      type: 'shortAnswer',
      questionText: text,
      correctAnswer: answer.slice(0, 160),
    };
  }
  if (block.type === 'comparison' && secondary.length > 0) {
    const options = [text, secondary, 'Neither applies', 'Both are correct'].sort();
    return {
      ...base,
      type: 'multipleChoice',
      questionText: 'Which form is correct here?',
      options: options.slice(0, 4),
      correctAnswer: text,
      explanation: `Compare: ${text} vs ${secondary}`,
    };
  }
  if (block.type === 'warning') {
    return {
      ...base,
      type: 'trueFalse',
      questionText: `True or False: "${text.slice(0, 100)}" is a common grammar mistake.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: explanation ?? text,
    };
  }
  if (block.type === 'rule') {
    return {
      ...base,
      type: 'shortAnswer',
      questionText:
        secondary.length > 0
          ? 'Explain this rule in your own words.'
          : 'What does this grammar rule state?',
      correctAnswer: (secondary.length > 0 ? secondary : text).slice(0, 160),
      explanation,
    };
  }
  if (block.type === 'example' && secondary.length > 0) {
    return {
      ...base,
      type: 'shortAnswer',
      questionText: 'What does this example illustrate?',
      correctAnswer: secondary.slice(0, 160),
      explanation,
    };
  }
  if (text.length >= 4) {
    return {
      ...base,
      type: 'shortAnswer',
      questionText: shortAnswerPrompt(block.type),
      correctAnswer: text.slice(0, 160),
      explanation,
    };
  }
  return null;
};

const ultimateFallbackQuestion = (
  item: GrammarReviewItem,
  note: GrammarNote,
): GrammarQuizQuestion => ({
  id: crypto.randomUUID(),
  type: 'shortAnswer',
  questionText: 'What is the key idea of this note?',
  options: [],
  correctAnswer: (note.previewText || item.previewText || note.title).slice(0, 160),
  order: 0,
});

/* A quiz item is in the queue because the learner failed that quiz, so the
   card has to ask what they got wrong. Generating a fresh question from the
   note instead — which is what this did before quizzesById existed — quietly
   reviewed something else and called it the same thing. Falls through to
   generation when the quiz is gone or empty. */
const questionFromQuiz = (
  item: GrammarReviewItem,
  quizzesById: Map<string, GrammarNoteQuiz>,
): GrammarQuizQuestion | null => {
  if (item.sourceType !== 'quiz' || !item.quizId) return null;
  const quiz = quizzesById.get(item.quizId);
  if (!quiz || quiz.questions.length === 0) return null;
  /* Deterministic: reviewCount walks the quiz question by question, so a
     repeatedly failed quiz is not the same question every time. */
  const ordered = [...quiz.questions].sort((a, b) => a.order - b.order);
  return ordered[item.reviewCount % ordered.length];
};

const generateQuestion = (
  item: GrammarReviewItem,
  note: GrammarNote,
  block: GrammarNoteBlock | undefined,
): GrammarQuizQuestion => {
  try {
    const generated = generateLocalQuestions(
      note.contentBlocks,
      1,
      new Set(['multipleChoice', 'trueFalse', 'fillGap', 'shortAnswer']),
    );
    if (generated.length > 0) return generated[0];
  } catch {
    /* fall through to the per-block heuristic */
  }
  if (block) {
    const single = singleBlockQuestion(block);
    if (single) return single;
  }
  return ultimateFallbackQuestion(item, note);
};

const pickSourceText = (
  item: GrammarReviewItem,
  note: GrammarNote,
  block: GrammarNoteBlock | undefined,
): string =>
  [block?.text, note.previewText, item.previewText, note.title, item.title].find(
    (s) => (s ?? '').trim().length > 0,
  ) ?? '';

const buildCard = (
  item: GrammarReviewItem,
  pool: GrammarReviewSourcePool,
  notesById: Map<string, GrammarNote>,
  quizzesById: Map<string, GrammarNoteQuiz>,
): GrammarReviewCard | null => {
  if (!item.noteId || item.noteId.length === 0 || item.topicId.length === 0) return null;
  const note = notesById.get(item.noteId);
  if (!note) return null;
  const block = selectBestBlock(note.contentBlocks);
  return {
    id: item.id,
    reviewItem: item,
    sourcePool: pool,
    note,
    sourceText: pickSourceText(item, note, block),
    sourceSecondaryText: block?.secondaryText?.trim() || undefined,
    sourceBlockType: block?.type,
    question: questionFromQuiz(item, quizzesById) ?? generateQuestion(item, note, block),
  };
};

export const buildReviewQueue = (params: {
  manualItems: GrammarReviewItem[];
  recentlyOpened: GrammarReviewItem[];
  recentlyEdited: GrammarReviewItem[];
  notesById: Map<string, GrammarNote>;
  /** Saved quizzes, keyed by quiz id — only quiz-sourced items consult this. */
  quizzesById?: Map<string, GrammarNoteQuiz>;
  limit?: number;
}): GrammarReviewQueue => {
  const limit = params.limit ?? REVIEW_QUEUE_LIMIT;

  /* Strict pool precedence — pools are mutually exclusive (iOS selectPool). */
  let selected: GrammarReviewItem[];
  let pool: GrammarReviewSourcePool | null;
  if (params.manualItems.length > 0) {
    selected = params.manualItems;
    pool = 'manual';
  } else if (params.recentlyOpened.length > 0) {
    selected = params.recentlyOpened;
    pool = 'recentlyOpened';
  } else if (params.recentlyEdited.length > 0) {
    selected = params.recentlyEdited;
    pool = 'recentlyEdited';
  } else {
    return { cards: [], pool: null, estimatedMinutes: 0 };
  }

  const quizzesById = params.quizzesById ?? new Map<string, GrammarNoteQuiz>();
  const cards = selected
    .slice(0, limit)
    .map((item) =>
      buildCard(item, pool as GrammarReviewSourcePool, params.notesById, quizzesById),
    )
    .filter((c): c is GrammarReviewCard => c !== null);

  return {
    cards,
    pool: cards.length > 0 ? pool : null,
    estimatedMinutes: cards.length > 0 ? Math.max(1, cards.length * 2) : 0,
  };
};
