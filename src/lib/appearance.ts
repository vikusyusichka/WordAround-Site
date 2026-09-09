/* Appearance theme — web port of AppearanceTheme (UserPreferencesStore.swift).

   The site has no dark palette yet (that is its own phase), so choosing
   "System" or "Light" does not repaint the app. What it does do is set
   `color-scheme` on the root element, which is what the BROWSER reads for the
   chrome it draws itself: scrollbars, the caret, `<input type="time">` pickers,
   the flash of background before paint. Getting that wired now means the dark
   phase only has to add the palette, not the plumbing. */

export type AppearanceTheme = 'system' | 'light' | 'dark';

export const APPEARANCE_THEMES: AppearanceTheme[] = ['system', 'light', 'dark'];

export const isAppearanceTheme = (value: string): value is AppearanceTheme =>
  (APPEARANCE_THEMES as string[]).includes(value);

/** `light dark` lets the browser follow the OS; `light` pins it.

    "Dark" is clamped to light on purpose: it is not selectable in the UI yet,
    and honouring it would give a dark caret and dark scrollbars on a page that
    is still painted light. The dark phase lifts this clamp. */
export const colorSchemeFor = (theme: AppearanceTheme): string =>
  theme === 'system' ? 'light dark' : 'light';

export const applyTheme = (theme: AppearanceTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = colorSchemeFor(theme);
};
