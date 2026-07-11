/* Set icon helpers — ports CreateSetIconSuggester.swift + CreateSetViewModel
   previewIcons. Icons are SF-symbol names resolved by <Icon>. */

export const DEFAULT_SET_ICON = 'rectangle.stack.fill';

/** Preset icons offered in the wizard's icon picker. */
export const PREVIEW_ICONS: string[] = [
  'rectangle.stack.fill',
  'book.closed.fill',
  'graduationcap.fill',
  'brain.head.profile',
  'globe.europe.africa.fill',
  'star.fill',
  'heart.fill',
  'bolt.fill',
  'pencil.and.outline',
  'text.book.closed.fill',
];

/** Keyword → icon, mirroring CreateSetIconSuggester. */
export const suggestIcon = (title: string): string => {
  const text = title.toLowerCase();
  if (text.includes('spanish') || text.includes('español') || text.includes('language'))
    return 'globe.europe.africa.fill';
  if (text.includes('english') || text.includes('англій')) return 'character.bubble.fill';
  if (text.includes('book') || text.includes('reading') || text.includes('study'))
    return 'book.fill';
  if (text.includes('music') || text.includes('audio') || text.includes('listening'))
    return 'headphones';
  if (text.includes('food')) return 'fork.knife';
  if (text.includes('travel')) return 'airplane';
  if (text.includes('health')) return 'heart.fill';
  if (text.includes('work')) return 'briefcase.fill';
  return 'star.fill';
};

/** Keep the chosen icon unless it's still the default → suggest from the title. */
export const resolveIcon = (selectedIcon: string, title: string): string => {
  if (selectedIcon.length > 0 && selectedIcon !== DEFAULT_SET_ICON) return selectedIcon;
  return suggestIcon(title);
};
