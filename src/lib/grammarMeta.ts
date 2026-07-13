/* Presentation metadata for grammar note/block types — SF-symbol names
   (resolved by <Icon>) + accent colors. Values from the iOS GrammarNoteType /
   GrammarNoteBlockType enums. Kept separate so pickers, rows, and the editor
   share one source of truth. */
import type { GrammarBlockType, GrammarNoteType } from '@/lib/models';

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

/** Block types offered in the 4D1 editor (subset of iOS). */
export const EDITOR_BLOCK_TYPES: GrammarBlockType[] = [
  'heading', 'paragraph', 'bulletList', 'rule', 'example', 'warning', 'quote', 'divider',
];

export const BLOCK_TYPE_ICON: Record<GrammarBlockType, string> = {
  heading: 'textformat.size.larger',
  paragraph: 'text.alignleft',
  bulletList: 'list.bullet',
  rule: 'text.book.closed.fill',
  example: 'sparkles',
  warning: 'exclamationmark.triangle.fill',
  quote: 'quote.opening',
  divider: 'minus',
};
