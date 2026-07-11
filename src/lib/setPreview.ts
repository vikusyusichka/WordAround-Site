/* Maps a FlashcardSet to the display shape used by SetItem / ProgressCard —
   web port of HomeSetPreviewMapper / SetsListViewModel.makePreviewItem. Colors
   come from the set's theme; a readable dark title works across all 6 colors. */
import type { HomeSetPreviewItem } from '@/lib/homeTypes';
import type { FlashcardSet } from '@/lib/models';
import { themeForHex } from '@/lib/setColors';

const iconName = (set: FlashcardSet): string =>
  set.icon.type === 'systemName' ? set.icon.value : 'rectangle.stack.fill';

/** `subtitleFallback` is the translated "N cards" string, used when the set has
    no description (keeps this mapper pure / i18n-agnostic). */
export const mapSetToPreview = (
  set: FlashcardSet,
  subtitleFallback: string,
): HomeSetPreviewItem => {
  const theme = themeForHex(set.colorHex);
  return {
    id: set.id,
    title: set.title,
    subtitle: set.description.trim() || subtitleFallback,
    iconSystemName: iconName(set),
    currentValue: 0,
    totalValue: Math.max(set.cards.length, 1),
    unit: 'cards',
    progress: 0,
    accentColor: theme.accent,
    backgroundColor: theme.bg,
    progressBackgroundColor: theme.soft,
    titleColor: 'var(--color-cs-dark-text)',
    valueColor: theme.accent,
    subtitleColor: 'var(--color-text-secondary)',
    iconBackground: theme.accent,
    blobColor: theme.soft,
  };
};
