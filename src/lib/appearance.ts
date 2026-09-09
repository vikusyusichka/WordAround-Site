/* Appearance theme — web port of AppearanceTheme (UserPreferencesStore.swift).

   iOS has three options but no dark palette of its own: AppColors.swift is a
   fixed set of light values, so "Dark" there only restyles system controls.
   The web has a real dark palette (see the dark block in styles/index.css),
   designed rather than ported.

   `data-theme` on the root element always holds the theme ACTUALLY IN FORCE,
   never the preference: "System" is resolved here against
   prefers-color-scheme. That keeps the CSS to a single dark block instead of a
   second copy inside a media query, and it means anything reading the
   attribute sees the truth. The preference itself lives in the preferences
   store. */

export type AppearanceTheme = 'system' | 'light' | 'dark';

/** What is actually painted, once "system" has been resolved. */
export type ResolvedTheme = 'light' | 'dark';

export const APPEARANCE_THEMES: AppearanceTheme[] = ['system', 'light', 'dark'];

export const isAppearanceTheme = (value: string): value is AppearanceTheme =>
  (APPEARANCE_THEMES as string[]).includes(value);

const darkQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export const prefersDark = (): boolean => darkQuery()?.matches ?? false;

/** Which of the two palettes a preference means right now. */
export const resolveTheme = (theme: AppearanceTheme, systemIsDark = prefersDark()): ResolvedTheme =>
  theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

/** `light dark` on "System" lets the browser style its own chrome from the OS;
    an explicit choice pins it, so scrollbars and carets follow the app. */
export const colorSchemeFor = (theme: AppearanceTheme): string =>
  theme === 'system' ? 'light dark' : theme;

/** Writes the theme onto the root element.

    `force` is how the signed-out screens stay light: they are a drawn brand
    page, and the reader has not chosen a theme yet (see allowsDarkTheme in
    lib/navigation.ts). */
export const applyTheme = (theme: AppearanceTheme, force?: ResolvedTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = force ?? resolveTheme(theme);
  root.style.colorScheme = force ?? colorSchemeFor(theme);
};

/** Re-applies when the OS flips while the app is open — otherwise "System"
    would only be honoured at load. Returns an unsubscribe function. */
export const watchSystemTheme = (onChange: () => void): (() => void) => {
  const query = darkQuery();
  if (!query) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
