/* Types + static config for Phase 4 Writing. WriteWordsExercise is derived
   from a Flashcard for the word→translation training mode (the only mode
   shipped in 4A; mode toggle lands in 4B). Menu items + progress-card stub
   are static — mirror WritingViewModel.menuItems / WritingProgressSummaryCardView. */
import type { HomeSetPreviewItem } from '@/lib/homeTypes';
import type { Flashcard } from '@/lib/models';

export interface WriteWordsExercise {
  id: string;
  /** Prompt shown as the big word on the exercise card. */
  displayWord: string;
  /** Small caption above the word. */
  displayTitle: string;
  /** Expected typed answer (compared via normalize). */
  correctAnswer: string;
}

export type WritingMenuAction = 'writeFromSets' | 'essays' | 'grammarNotes';

export interface WritingMenuItemDef {
  id: WritingMenuAction;
  titleKey: string;
  subtitleKey: string;
  iconSystemName: string;
  accentColor: string;
  blobColor: string;
  /** In 4A only writeFromSets is enabled; others render dimmed. */
  enabled: boolean;
}

/* Colors ported from WritingViewModel.menuItems (WritingViewModel.swift:16-38).
   Purple/blue/orange match the iOS accents; blob colors mirror AppColors.blob*. */
export const WRITING_MENU_ITEMS: WritingMenuItemDef[] = [
  {
    id: 'writeFromSets',
    titleKey: 'writing.menu.writeFromSets.title',
    subtitleKey: 'writing.menu.writeFromSets.subtitle',
    iconSystemName: 'square.grid.2x2.fill',
    accentColor: '#8563FF',
    blobColor: '#E6DBFF',
    enabled: true,
  },
  {
    id: 'essays',
    titleKey: 'writing.menu.essays.title',
    subtitleKey: 'writing.menu.essays.subtitle',
    iconSystemName: 'note.text.badge.plus',
    accentColor: '#5C94FF',
    blobColor: '#D6E0FA',
    enabled: true,
  },
  {
    id: 'grammarNotes',
    titleKey: 'writing.menu.grammar.title',
    subtitleKey: 'writing.menu.grammar.subtitle',
    iconSystemName: 'book.pages.fill',
    accentColor: '#F7A310',
    blobColor: '#F2DBA1',
    enabled: false,
  },
];

/* Static "Today progress" stub — ports WritingProgressSummaryCardView numbers.
   Real daily stats persistence is deferred to a later slice. */
export const WRITING_TODAY_GOAL: HomeSetPreviewItem = {
  id: 'writing-today',
  title: '',
  subtitle: '',
  iconSystemName: 'pencil',
  currentValue: 0,
  totalValue: 30,
  unit: 'words',
  progress: 0,
  accentColor: 'var(--color-primary-blue)',
  backgroundColor: 'var(--color-goal-bg)',
  progressBackgroundColor: 'var(--color-goal-progress-bg)',
  titleColor: 'var(--color-primary-blue-dark)',
  valueColor: 'var(--color-primary-blue-dark)',
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: '#ffffff',
  blobColor: '#D1DCFA',
};

export const buildWriteWordsExercise = (
  card: Flashcard,
  translatePrompt: string,
): WriteWordsExercise => ({
  id: card.id,
  displayWord: card.word,
  displayTitle: translatePrompt,
  correctAnswer: card.translation,
});
