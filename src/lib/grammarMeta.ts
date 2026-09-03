/* Presentation metadata for grammar note/block types — SF-symbol names
   (resolved by <Icon>) + accent colors. Values from the iOS GrammarNoteType /
   GrammarNoteBlockType enums. Kept separate so pickers, rows, and the editor
   share one source of truth. */
import type { GrammarBlockType, GrammarNoteType, GrammarQuizQuestionType } from '@/lib/models';

export const NOTE_TYPES: GrammarNoteType[] = [
  'standard', 'mistake', 'rule', 'comparison', 'cheatSheet', 'exercise',
];

export const NOTE_TYPE_META: Record<GrammarNoteType, { icon: string; color: string }> = {
  standard: { icon: 'doc.text.fill', color: '#4F7CFF' },
  mistake: { icon: 'exclamationmark.triangle.fill', color: '#F4729A' },
  rule: { icon: 'text.book.closed.fill', color: '#7C5CFF' },
  comparison: { icon: 'arrow.left.arrow.right', color: '#38BDF8' },
  cheatSheet: { icon: 'bolt.fill', color: '#F59E0B' },
  exercise: { icon: 'checklist.checked', color: '#22C55E' },
};

/** English titles — used by the search index (iOS indexes noteType.title). */
export const NOTE_TYPE_TITLE: Record<GrammarNoteType, string> = {
  standard: 'Standard',
  mistake: 'Mistake',
  rule: 'Rule',
  comparison: 'Comparison',
  cheatSheet: 'Cheat Sheet',
  exercise: 'Exercise',
};

/** Every block type the editor offers, in the iOS AddGrammarNoteBlockSheet
    order. `quiz` is filtered out when quick quizzes are switched off. */
export const EDITOR_BLOCK_TYPES: GrammarBlockType[] = [
  'heading', 'subheading', 'paragraph', 'bulletList', 'numberedList', 'checklist',
  'rule', 'example', 'comparison', 'warning', 'exercise', 'quote', 'quiz', 'image',
  'divider',
];

/** Block types whose body is a list of items. */
export const LIST_BLOCK_TYPES: GrammarBlockType[] = ['bulletList', 'numberedList', 'checklist'];

export const isListBlock = (type: GrammarBlockType): boolean =>
  LIST_BLOCK_TYPES.includes(type);

/** Block types with a second text field (side B / translation / detail). */
export const SECONDARY_BLOCK_TYPES: GrammarBlockType[] = ['rule', 'example', 'comparison'];

export const BLOCK_TYPE_ICON: Record<GrammarBlockType, string> = {
  heading: 'textformat.size.larger',
  subheading: 'textformat.size',
  paragraph: 'text.alignleft',
  bulletList: 'list.bullet',
  numberedList: 'list.number',
  checklist: 'checklist',
  rule: 'text.book.closed.fill',
  example: 'sparkles',
  warning: 'exclamationmark.triangle.fill',
  comparison: 'arrow.left.arrow.right',
  exercise: 'pencil.and.list.clipboard',
  quote: 'quote.opening',
  quiz: 'questionmark.circle.fill',
  image: 'photo.fill',
  divider: 'minus',
};

/* Quiz question types (4D2) — icons from the iOS GrammarQuizQuestionType enum. */
export const QUIZ_TYPE_ICON: Record<GrammarQuizQuestionType, string> = {
  multipleChoice: 'list.bullet',
  trueFalse: 'checkmark.circle',
  fillGap: 'pencil.line',
  shortAnswer: 'square.and.pencil',
};
