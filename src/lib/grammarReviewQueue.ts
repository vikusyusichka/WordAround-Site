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

/* iOS selectBestBlock priority (web subset — no comparison/exercise). */
const BLOCK_PRIORITY: GrammarBlockType[] = [
  'rule', 'warning', 'example', 'paragraph', 'quote', 'bulletList',
];

const selectBestBlock = (blocks: GrammarNoteBlock[]): GrammarNoteBlock | undefined => {
  const nonEmpty = blocks.filter((b) => b.text.trim().length > 0);
  for (const type of BLOCK_PRIORITY) {
    const match = nonEmpty.find((b) => b.type === type);
    if (match) return match;
  }
  return nonEmpty.find((b) => b.type !== 'heading' && b.type !== 'divider');
};

/* iOS singleBlockQuestion heuristics (web subset). */
const singleBlockQuestion = (block: GrammarNoteBlock): GrammarQuizQuestion | null => {
  const text = block.text.trim();
  const secondary = block.secondaryText?.trim() ?? '';
  const base = { id: crypto.randomUUID(), options: [] as string[], order: 0 };

  if (block.type === 'warning') {
    return {
      ...base,
      type: 'trueFalse',
      questionText: `True or False: "${text.slice(0, 100)}" is a common grammar mistake.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: text,
    };
  }
  if (block.type === 'rule') {
    return {
      ...base,
      type: 'shortAnswer',
      questionText:
        secondary.length > 0
          ? `Explain this grammar rule: "${text.slice(0, 70)}"`
          : 'What does this grammar rule state?',
      correctAnswer: (secondary.length > 0 ? secondary : text).slice(0, 160),
      explanation: secondary.length > 0 ? secondary : undefined,
    };
  }
  if (block.type === 'example' && secondary.length > 0) {
    return {
      ...base,
      type: 'shortAnswer',
      questionText: `What does this example illustrate: "${text.slice(0, 70)}"?`,
      correctAnswer: secondary.slice(0, 160),
    };
  }
  if (text.length >= 4) {
    return {
      ...base,
      type: 'shortAnswer',
      questionText: `Explain in your own words: "${text.slice(0, 80)}"`,
      correctAnswer: text.slice(0, 160),
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
    question: generateQuestion(item, note, block),
  };
};

export const buildReviewQueue = (params: {
  manualItems: GrammarReviewItem[];
  recentlyOpened: GrammarReviewItem[];
  recentlyEdited: GrammarReviewItem[];
  notesById: Map<string, GrammarNote>;
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

  const cards = selected
    .slice(0, limit)
    .map((item) => buildCard(item, pool as GrammarReviewSourcePool, params.notesById))
    .filter((c): c is GrammarReviewCard => c !== null);

  return {
    cards,
    pool: cards.length > 0 ? pool : null,
    estimatedMinutes: cards.length > 0 ? Math.max(1, cards.length * 2) : 0,
  };
};
