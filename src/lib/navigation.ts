/* Single source of truth for the web app-shell navigation: the sidebar/drawer
   items (grouped), and the per-route page header copy. Everything is keyed by
   route path so the URL is the source of truth (no in-page tab state). All
   labels are i18n keys resolved at render. */

export interface NavItem {
  /** Stable id (also used for keys / active matching). */
  id: string;
  /** Destination path. */
  to: string;
  /** i18n key for the label. */
  labelKey: string;
  /** SF-symbol name resolved by <Icon> (outline + fill variants where useful). */
  icon: string;
  iconActive?: string;
}

export interface NavGroup {
  /** i18n key for the group heading, or null for an ungrouped top item. */
  labelKey: string | null;
  items: NavItem[];
}

/* Grouped nav shown in the sidebar and the mobile drawer. Order = display order.
   Profile is rendered separately (pinned to the bottom of the sidebar). */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: null,
    items: [
      { id: 'home', to: '/home', labelKey: 'nav.home', icon: 'house', iconActive: 'house.fill' },
    ],
  },
  {
    labelKey: 'nav.group.practice',
    items: [
      { id: 'speaking', to: '/practice/speaking', labelKey: 'nav.speaking', icon: 'bubble.left.and.bubble.right' },
      { id: 'listening', to: '/practice/listening', labelKey: 'nav.listening', icon: 'headphones' },
      { id: 'reading', to: '/practice/reading', labelKey: 'nav.reading', icon: 'book' },
      { id: 'writing', to: '/practice/writing', labelKey: 'nav.writing', icon: 'pencil.and.scribble' },
    ],
  },
  {
    labelKey: 'nav.group.library',
    items: [
      { id: 'folders', to: '/folders', labelKey: 'nav.folders', icon: 'folder', iconActive: 'folder.fill' },
      { id: 'sets', to: '/sets', labelKey: 'nav.sets', icon: 'square.stack.3d.up' },
    ],
  },
];

/* Profile — pinned bottom of the sidebar / top-right on mobile. */
export const PROFILE_NAV: NavItem = {
  id: 'profile',
  to: '/profile',
  labelKey: 'nav.profile',
  icon: 'person',
  iconActive: 'person.fill',
};

export type PracticeMode = 'speaking' | 'listening' | 'reading' | 'writing';

export const PRACTICE_MODES: PracticeMode[] = ['speaking', 'listening', 'reading', 'writing'];

export const isPracticeMode = (v: string): v is PracticeMode =>
  (PRACTICE_MODES as string[]).includes(v);

/* Page header copy, keyed by route. Ports HomeViewModel.headerTitle /
   headerSubtitle. Returns i18n keys; the profile subtitle is the live email,
   handled by the caller (returns `subtitleKey: null`). */
export interface PageCopy {
  titleKey: string;
  subtitleKey: string | null;
}

const PRACTICE_COPY: Record<PracticeMode, PageCopy> = {
  speaking: { titleKey: 'nav.speaking', subtitleKey: 'home.subtitle.speaking' },
  listening: { titleKey: 'nav.listening', subtitleKey: 'home.subtitle.listening' },
  reading: { titleKey: 'nav.reading', subtitleKey: 'home.subtitle.reading' },
  writing: { titleKey: 'nav.writing', subtitleKey: 'home.subtitle.writing' },
};

export const HOME_COPY: PageCopy = { titleKey: 'home.title.flashcards', subtitleKey: 'home.subtitle.pickSet' };

export const pageCopyForPath = (pathname: string): PageCopy => {
  if (pathname.startsWith('/practice/writing/grammar')) {
    return { titleKey: 'writing.grammar.title', subtitleKey: 'writing.grammar.subtitle' };
  }
  if (pathname.startsWith('/practice/writing/essays')) {
    return { titleKey: 'writing.essays.title', subtitleKey: 'writing.essays.subtitle' };
  }
  if (pathname.startsWith('/practice/writing/write-words')) {
    return { titleKey: 'writing.writeWords.title', subtitleKey: 'writing.writeWords.subtitle' };
  }
  if (pathname.startsWith('/practice/')) {
    const mode = pathname.slice('/practice/'.length);
    if (isPracticeMode(mode)) return PRACTICE_COPY[mode];
  }
  if (pathname.startsWith('/folders')) return { titleKey: 'home.title.folders', subtitleKey: 'home.subtitle.folders' };
  if (pathname.startsWith('/sets')) return { titleKey: 'home.title.sets', subtitleKey: 'home.subtitle.sets' };
  if (pathname.startsWith('/profile')) return { titleKey: 'home.title.profile', subtitleKey: null };
  return HOME_COPY;
};
