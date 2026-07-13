import { describe, expect, it } from 'vitest';

import { isPracticeMode, pageCopyForPath, NAV_GROUPS, PROFILE_NAV } from './navigation';

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

  it('profile has no subtitle key (email injected by caller)', () => {
    expect(pageCopyForPath('/profile')).toEqual({
      titleKey: 'home.title.profile',
      subtitleKey: null,
    });
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

  it('maps /practice/writing/grammar (+ nested) to grammar copy', () => {
    expect(pageCopyForPath('/practice/writing/grammar')).toEqual({
      titleKey: 'writing.grammar.title',
      subtitleKey: 'writing.grammar.subtitle',
    });
    expect(pageCopyForPath('/practice/writing/grammar/t1/n1').titleKey).toBe('writing.grammar.title');
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
    ]);
    expect(PROFILE_NAV.to).toBe('/profile');
  });
});
