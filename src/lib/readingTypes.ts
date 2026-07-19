/* Types + static config for Phase 5 Reading. Mirrors ReadingHomeViewModel's
   hard-coded mode list (colors/icons iOS-verbatim) plus the option catalogs
   used by the Add Text setup. Menu-card pattern matches writingTypes.ts. */
import type { HomeSetPreviewItem } from '@/lib/homeTypes';
import type {
  ReadingDifficulty,
  ReadingFocus,
  ReadingQuestionType,
} from '@/lib/models';

export type ReadingModeId = 'my-texts' | 'reading-from-sets' | 'story-mode' | 'speed-reading';

export interface ReadingMenuItemDef {
  id: ReadingModeId;
  titleKey: string;
  subtitleKey: string;
  iconSystemName: string;
  accentColor: string;
  blobColor: string;
  enabled: boolean;
}

/* iOS ReadingHomeViewModel.modes — teal / orange / pink / red accents. */
export const READING_MENU_ITEMS: ReadingMenuItemDef[] = [
  {
    id: 'my-texts',
    titleKey: 'reading.menu.myTexts.title',
    subtitleKey: 'reading.menu.myTexts.subtitle',
    iconSystemName: 'doc.text.fill',
    accentColor: '#21A8BD',
    blobColor: '#CCF0F5',
    enabled: true,
  },
  {
    id: 'reading-from-sets',
    titleKey: 'reading.menu.fromSets.title',
    subtitleKey: 'reading.menu.fromSets.subtitle',
    iconSystemName: 'rectangle.stack.fill',
    accentColor: '#F7A310',
    blobColor: '#F2DBA1',
    enabled: true,
  },
  {
    id: 'story-mode',
    titleKey: 'reading.menu.storyMode.title',
    subtitleKey: 'reading.menu.storyMode.subtitle',
    iconSystemName: 'books.vertical.fill',
    accentColor: '#ED6699',
    blobColor: '#FADBE7',
    enabled: true,
  },
  {
    id: 'speed-reading',
    titleKey: 'reading.menu.speedReading.title',
    subtitleKey: 'reading.menu.speedReading.subtitle',
    iconSystemName: 'bolt.fill',
    accentColor: '#F26B66',
    blobColor: '#FAD9D7',
    enabled: true,
  },
];

/* --- Setup option catalogs --- */

export const READING_FOCUSES: ReadingFocus[] = [
  'mainIdea', 'vocabulary', 'detailedComprehension', 'grammarAwareness', 'speedFluency',
];

export const READING_QUESTION_TYPES: ReadingQuestionType[] = [
  'comprehension', 'trueFalse', 'fillGap', 'vocabulary', 'findEvidence', 'orderReconstruction',
];

/** iOS ReadingQuestionType.defaultEnabled. */
export const DEFAULT_QUESTION_TYPES: ReadingQuestionType[] = [
  'comprehension', 'vocabulary', 'trueFalse',
];

/** Manual difficulty options (iOS ReadingManualLevel — no Native). */
export const READING_MANUAL_LEVELS: ReadingDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/* --- Assistance options (iOS ReadingAssistanceOptions, all default true).
   The keys double as the Firestore `toggles` dict keys. --- */

export type ReadingAssistanceKey =
  | 'highlightUnknownWords'
  | 'translationOnTap'
  | 'vocabularyHints'
  | 'readingTimer';

export const READING_ASSISTANCE_KEYS: ReadingAssistanceKey[] = [
  'highlightUnknownWords', 'translationOnTap', 'vocabularyHints', 'readingTimer',
];

export interface ReadingAssistanceOptions {
  highlightUnknownWords: boolean;
  translationOnTap: boolean;
  vocabularyHints: boolean;
  readingTimer: boolean;
  translationTargetLanguageCode: string;
}

export const DEFAULT_ASSISTANCE: ReadingAssistanceOptions = {
  highlightUnknownWords: true,
  translationOnTap: true,
  vocabularyHints: true,
  readingTimer: true,
  translationTargetLanguageCode: '',
};

export const assistanceToToggles = (
  a: ReadingAssistanceOptions,
): Record<string, boolean> => ({
  highlightUnknownWords: a.highlightUnknownWords,
  translationOnTap: a.translationOnTap,
  vocabularyHints: a.vocabularyHints,
  readingTimer: a.readingTimer,
});

export const assistanceFromToggles = (
  toggles: Record<string, boolean>,
): ReadingAssistanceOptions => ({
  highlightUnknownWords: toggles.highlightUnknownWords ?? true,
  translationOnTap: toggles.translationOnTap ?? true,
  vocabularyHints: toggles.vocabularyHints ?? true,
  readingTimer: toggles.readingTimer ?? true,
  translationTargetLanguageCode: '',
});

/* Static "Today progress" stub — real daily stats deferred (like Writing). */
export const READING_TODAY_GOAL: HomeSetPreviewItem = {
  id: 'reading-today',
  title: '',
  subtitle: '',
  iconSystemName: 'book',
  currentValue: 0,
  totalValue: 15,
  unit: 'min',
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
