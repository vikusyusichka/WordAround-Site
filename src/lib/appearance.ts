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

/* The browser paints its own chrome — an installed PWA's status bar, the tab
   strip on some mobile browsers — from <meta name="theme-color">. The tag is
   static in index.html, so before this the app could be fully dark with a
   bright band across the top. A media-scoped tag would not be enough either:
   the theme can be chosen inside the app against the system preference. */
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f6f6fb',
  dark: '#0f1424',
};

const applyThemeColor = (resolved: ResolvedTheme): void => {
  const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (tags.length === 0) return;
  /* index.html ships a media-scoped tag and a default one. Dropping the media
     attribute is what makes the value apply — otherwise the browser keeps
     matching it against the OS preference the app has just overridden. */
  tags.forEach((tag) => {
    tag.removeAttribute('media');
    tag.content = THEME_COLORS[resolved];
  });
};

/** Writes the theme onto the root element.

    `force` is how the signed-out screens stay light: they are a drawn brand
    page, and the reader has not chosen a theme yet (see allowsDarkTheme in
    lib/navigation.ts). */
export const applyTheme = (theme: AppearanceTheme, force?: ResolvedTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = force ?? resolveTheme(theme);
  root.dataset.theme = resolved;
  root.style.colorScheme = force ?? colorSchemeFor(theme);
  applyThemeColor(resolved);
};

/** Re-applies when the OS flips while the app is open — otherwise "System"
    would only be honoured at load. Returns an unsubscribe function. */
export const watchSystemTheme = (onChange: () => void): (() => void) => {
  const query = darkQuery();
  if (!query) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
