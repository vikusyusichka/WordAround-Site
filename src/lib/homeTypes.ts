/* Home models ported from WordAround/Features/Home/Models/*.
   Color fields hold CSS values (design-token vars or hex) instead of SwiftUI
   Color, so components can apply them directly. */

export type HomeTab = 'home' | 'folders' | 'create' | 'flashcards' | 'profile';

export const HOME_TABS: HomeTab[] = [
  'home',
  'folders',
  'create',
  'flashcards',
  'profile',
];

export type HomeCategory = 'speaking' | 'listening' | 'reading' | 'writing';

export const HOME_CATEGORIES: HomeCategory[] = [
  'speaking',
  'listening',
  'reading',
  'writing',
];

/* SF Symbol names (resolved to Phosphor by <Icon>) — mirror HomeCategory.icon. */
export const CATEGORY_ICON: Record<HomeCategory, string> = {
  speaking: 'bubble.left.and.bubble.right',
  listening: 'headphones',
  reading: 'book',
  writing: 'pencil.and.scribble',
};

/* i18n key suffix for each category's UPPERCASE sidebar label. */
export const CATEGORY_LABEL_KEY: Record<HomeCategory, string> = {
  speaking: 'home.category.speaking',
  listening: 'home.category.listening',
  reading: 'home.category.reading',
  writing: 'home.category.writing',
};

export interface StatCardItem {
  id: string;
  /** i18n keys — resolved at render. */
  titleKey: string;
  value: string;
  subtitleKey: string;
  iconSystemName: string;
  accentColor: string;
  titleColor: string;
  valueColor: string;
  subtitleColor: string;
  backgroundColor: string;
  blobColor: string;
}

export interface HomeSetPreviewItem {
  id: string;
  /** Plain title/subtitle (real sets in Phase 3); stubs use literal strings. */
  title: string;
  subtitle: string;
  iconSystemName: string;

  currentValue: number;
  totalValue: number;
  unit: string;
  progress: number;

  accentColor: string;
  /** The accent when it is text rather than a fill — the tile subtitle sits on
      the card's own tinted ground, where the accent alone is too dim to read in
      the dark theme. Falls back to `accentColor` for the placeholder items. */
  accentTextColor?: string;
  backgroundColor: string;
  progressBackgroundColor: string;
  titleColor: string;
  valueColor: string;
  subtitleColor: string;
  iconBackground: string;
  blobColor: string;
}

/* The streak card. `value` here is only the shape's placeholder — the home
   screen always overrides it with currentStreak (see dailyPracticeStats).

   The "learned today" / "accuracy" / "today's goal" placeholders that used to
   sit beside it are gone: nothing rendered them any more, but they still read
   like live data (24 words, 87%, a bar at 80%) to anyone opening this file. */
export const STREAK_CARD: StatCardItem = {
  id: 'streak',
  titleKey: 'home.stat.streak',
  value: '0',
  subtitleKey: 'home.stat.days',
  iconSystemName: 'flame.fill',
  accentColor: 'var(--color-home-stat3-accent)',
  titleColor: 'var(--color-home-stat3-title)',
  valueColor: 'var(--color-home-stat3-title)',
  subtitleColor: 'var(--color-text-secondary)',
  backgroundColor: 'var(--color-home-stat3-bg)',
  blobColor: 'var(--color-home-stat3-blob)',
};

/* Real "Your sets" / "Continue learning" data now comes from Firestore via
   useSetsQuery + mapSetToPreview (src/lib/setPreview.ts). */
