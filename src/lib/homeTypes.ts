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
  backgroundColor: string;
  progressBackgroundColor: string;
  titleColor: string;
  valueColor: string;
  subtitleColor: string;
  iconBackground: string;
  blobColor: string;
}

/* MARK: - Static placeholders (mirror HomeViewModel.staticStatCards / staticTodayGoal).
   These stay static in iOS too — no real stats backend yet. */

export const STAT_CARDS: StatCardItem[] = [
  {
    id: 'learned-today',
    titleKey: 'home.stat.learnedToday',
    value: '24',
    subtitleKey: 'home.stat.words',
    iconSystemName: 'chart.bar.fill',
    accentColor: 'var(--color-home-stat1-accent)',
    titleColor: 'var(--color-home-stat1-title)',
    valueColor: 'var(--color-primary-blue-dark)',
    subtitleColor: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-home-stat1-bg)',
    blobColor: 'var(--color-home-stat1-blob)',
  },
  {
    id: 'accuracy',
    titleKey: 'home.stat.accuracy',
    value: '87%',
    subtitleKey: 'home.stat.greatJob',
    iconSystemName: 'target',
    accentColor: 'var(--color-home-stat2-accent)',
    titleColor: 'var(--color-home-stat2-title)',
    valueColor: 'var(--color-primary-blue-dark)',
    subtitleColor: 'var(--color-home-stat2-sub)',
    backgroundColor: 'var(--color-home-stat2-bg)',
    blobColor: 'var(--color-home-stat2-blob)',
  },
  {
    id: 'streak',
    titleKey: 'home.stat.streak',
    value: '5',
    subtitleKey: 'home.stat.days',
    iconSystemName: 'flame.fill',
    accentColor: 'var(--color-home-stat3-accent)',
    titleColor: 'var(--color-home-stat3-title)',
    valueColor: 'var(--color-home-stat3-title)',
    subtitleColor: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-home-stat3-bg)',
    blobColor: 'var(--color-home-stat3-blob)',
  },
];

/* Today's goal — layout `goal`. Static (matches HomeViewModel.staticTodayGoal). */
export const TODAY_GOAL: HomeSetPreviewItem = {
  id: 'today-goal',
  title: '', // rendered via i18n in the card wrapper
  subtitle: '', // "6 words left" via i18n
  iconSystemName: 'book.closed',
  currentValue: 24,
  totalValue: 30,
  unit: 'words',
  progress: 0.8,
  accentColor: 'var(--color-primary-blue)',
  backgroundColor: 'var(--color-goal-bg)',
  progressBackgroundColor: 'var(--color-goal-progress-bg)',
  titleColor: 'var(--color-primary-blue-dark)',
  valueColor: 'var(--color-primary-blue-dark)',
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: '#ffffff',
  blobColor: 'var(--color-home-goal-blob)',
};

/* Stub sets so SetItem/SetsList are exercised and Home matches the iOS demo
   look. PHASE 3: replace with Firestore data via flashcardSetService +
   HomeSetPreviewMapper (accentColor from set.colorHex, subtitle = card count). */
const stubSet = (
  id: string,
  title: string,
  words: number,
  icon: string,
  accent: string,
): HomeSetPreviewItem => ({
  id,
  title,
  subtitle: `${words} words`,
  iconSystemName: icon,
  currentValue: words,
  totalValue: Math.max(words, 1),
  unit: 'words',
  progress: 1,
  accentColor: accent,
  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
  progressBackgroundColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
  titleColor: accent,
  valueColor: accent,
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: accent,
  blobColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
});

export const STUB_USER_SETS: HomeSetPreviewItem[] = [
  stubSet('stub-travel', 'Travel Essentials', 42, 'airplane', '#2b5cfa'),
  stubSet('stub-food', 'Food & Cooking', 28, 'fork.knife', '#ff7375'),
  stubSet('stub-business', 'Business English', 35, 'briefcase.fill', '#29ba66'),
];

/* Continue-learning card (action layout). PHASE 3: derive from real progress. */
export const STUB_CONTINUE_LEARNING: HomeSetPreviewItem = {
  ...STUB_USER_SETS[0],
  id: 'continue-travel',
  subtitle: 'Keep practicing',
  currentValue: 18,
  totalValue: 42,
  progress: 18 / 42,
  iconBackground: STUB_USER_SETS[0].accentColor,
};
