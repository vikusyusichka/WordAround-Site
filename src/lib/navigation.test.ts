import { describe, expect, it } from 'vitest';

import {
  allowsDarkTheme,
  isPracticeMode,
  pageCopyForPath,
  showsCreateFab,
  NAV_GROUPS,
  PROFILE_NAV,
} from './navigation';

describe('isPracticeMode', () => {
  it.each(['speaking', 'listening', 'reading', 'writing'])('accepts %s', (m) => {
    expect(isPracticeMode(m)).toBe(true);
  });
  it.each(['', 'home', 'grammar', 'Reading'])('rejects %s', (m) => {
    expect(isPracticeMode(m)).toBe(false);
  });
});

describe('pageCopyForPath', () => {
  it('maps /home to the flashcards copy', () => {
    expect(pageCopyForPath('/home')).toEqual({
      titleKey: 'home.title.flashcards',
      subtitleKey: 'home.subtitle.pickSet',
    });
  });

  it.each([
    ['/practice/speaking', 'nav.speaking', 'home.subtitle.speaking'],
    ['/practice/reading', 'nav.reading', 'home.subtitle.reading'],
  ])('maps %s', (path, titleKey, subtitleKey) => {
    expect(pageCopyForPath(path)).toEqual({ titleKey, subtitleKey });
  });

  it('maps folders / sets', () => {
    expect(pageCopyForPath('/folders').titleKey).toBe('home.title.folders');
    expect(pageCopyForPath('/sets').titleKey).toBe('home.title.sets');
  });

  it('keeps the profile header on the profile sub-screens', () => {
    const expected = { titleKey: 'home.title.profile', subtitleKey: 'profile.subtitle' };
    expect(pageCopyForPath('/profile')).toEqual(expected);
    expect(pageCopyForPath('/profile/language')).toEqual(expected);
    expect(pageCopyForPath('/profile/appearance')).toEqual(expected);
    expect(pageCopyForPath('/profile/notifications')).toEqual(expected);
  });

  it('unknown path falls back to home copy', () => {
    expect(pageCopyForPath('/whatever').titleKey).toBe('home.title.flashcards');
  });

  it('maps the WriteWords game route to writing-specific copy', () => {
    expect(pageCopyForPath('/practice/writing/write-words/abc-123')).toEqual({
      titleKey: 'writing.writeWords.title',
      subtitleKey: 'writing.writeWords.subtitle',
    });
  });

  it('landing /practice/writing still routes to the writing mode copy', () => {
    expect(pageCopyForPath('/practice/writing')).toEqual({
      titleKey: 'nav.writing',
      subtitleKey: 'home.subtitle.writing',
    });
  });

  it('maps /practice/writing/essays to essay-specific copy', () => {
    expect(pageCopyForPath('/practice/writing/essays')).toEqual({
      titleKey: 'writing.essays.title',
      subtitleKey: 'writing.essays.subtitle',
    });
  });

  it('maps /notes (+ nested) to the Notes copy', () => {
    expect(pageCopyForPath('/notes')).toEqual({
      titleKey: 'nav.notes',
      subtitleKey: 'writing.grammar.subtitle',
    });
    expect(pageCopyForPath('/notes/t1/n1').titleKey).toBe('nav.notes');
  });
});

describe('showsCreateFab', () => {
  it.each(['/home', '/folders', '/sets', '/notes', '/folders/abc-123', '/sets/'])(
    'shows the FAB on the library hub %s',
    (path) => {
      expect(showsCreateFab(path)).toBe(true);
    },
  );

  it.each([
    '/practice/speaking',
    '/practice/speaking/conversation/session',
    '/practice/writing/write-words/abc-123',
    '/sets/abc-123',
    '/sets/new',
    '/folders/new',
    '/notes/t1/n1',
    '/notes/review',
    '/profile',
  ])('hides the FAB on the focused screen %s', (path) => {
    expect(showsCreateFab(path)).toBe(false);
  });
});

describe('nav config', () => {
  it('exposes the expected destinations', () => {
    const ids = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toEqual([
      'home',
      'speaking',
      'listening',
      'reading',
      'writing',
      'folders',
      'sets',
      'notes',
    ]);
    expect(PROFILE_NAV.to).toBe('/profile');
  });
});

describe('allowsDarkTheme', () => {
  it('keeps the signed-out screens light, whatever the preference says', () => {
    for (const path of ['/', '/onboarding', '/auth', '/auth/sign-in', '/auth/link', '/verify-email']) {
      expect(allowsDarkTheme(path), path).toBe(false);
    }
  });

  it('lets every signed-in screen take the dark theme', () => {
    for (const path of ['/home', '/sets', '/sets/abc', '/notes', '/profile', '/practice/reading']) {
      expect(allowsDarkTheme(path), path).toBe(true);
    }
  });

  /* A deny-list, so a screen added later is dark-capable by default rather
     than by someone remembering to list it. */
  it('treats an unknown signed-in path as dark-capable', () => {
    expect(allowsDarkTheme('/something/new')).toBe(true);
  });

  it('is not fooled by a trailing slash or a lookalike prefix', () => {
    expect(allowsDarkTheme('/auth/')).toBe(false);
    expect(allowsDarkTheme('/authors')).toBe(true);
  });
});
